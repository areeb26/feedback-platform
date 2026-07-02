import type { Types } from "mongoose";
import {
  incidentSchema,
  type Incident,
  type UpdateIncidentRequest,
} from "@feedback-platform/shared";
import { Customer } from "../models/customer.js";
import { Incident as IncidentModel } from "../models/incident.js";
import { Location } from "../models/location.js";
import { Submission } from "../models/submission.js";
import { Survey } from "../models/survey.js";
import type { ExpoPushClient } from "./expoPush.js";
import { notifyNewIncident } from "./pushNotifications.js";
import { shouldCreateIncident } from "./feedbackIntakeValidation.js";

export class IncidentRequiredError extends Error {
  constructor() {
    super("Rating above incident threshold; no incident created");
    this.name = "IncidentRequiredError";
  }
}

export { shouldCreateIncident } from "./feedbackIntakeValidation.js";

function tenantCodePrefix(tenantName: string) {
  const letters = tenantName.replace(/[^a-zA-Z]/g, "");
  return letters.slice(0, 3).toUpperCase().padEnd(3, "X");
}

async function generateIncidentCode(
  tenantId: string,
  tenantName: string,
  createdAt = new Date(),
) {
  const prefix = tenantCodePrefix(tenantName);
  const yy = String(createdAt.getFullYear()).slice(-2);
  const mm = String(createdAt.getMonth() + 1).padStart(2, "0");
  const dd = String(createdAt.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;

  const startOfDay = new Date(createdAt);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(createdAt);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await IncidentModel.countDocuments({
    tenantId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}-${datePart}-${sequence}`;
}

type IncidentDocument = {
  _id: { toString(): string };
  code: string;
  status: "created" | "reviewed" | "resolved";
  timeline: Array<{ status: "created" | "reviewed" | "resolved"; at: Date }>;
  createdAt: Date;
  submissionId: { toString(): string };
  channel?: "in_store" | "takeaway" | "delivery" | null;
  issueCategory?: string | null;
  assignees?: string[] | null;
};

function uniqueIds(
  values: Array<{ toString(): string } | string | null | undefined>,
) {
  return [
    ...new Set(
      values
        .filter((value): value is { toString(): string } | string => value != null)
        .map((value) => value.toString()),
    ),
  ];
}

async function enrichIncidents(
  incidents: IncidentDocument[],
): Promise<Incident[]> {
  if (incidents.length === 0) {
    return [];
  }

  const submissions = await Submission.find({
    _id: {
      $in: uniqueIds(incidents.map((incident) => incident.submissionId)),
    },
  });
  const submissionById = new Map(
    submissions.map((submission) => [submission._id.toString(), submission]),
  );

  const surveys = await Survey.find({
    _id: { $in: uniqueIds(submissions.map((submission) => submission.surveyId)) },
  });
  const surveyById = new Map(
    surveys.map((survey) => [survey._id.toString(), survey]),
  );

  const locationIds = uniqueIds(
    submissions.map((submission) => submission.locationId),
  );
  const locations =
    locationIds.length > 0
      ? await Location.find({ _id: { $in: locationIds } })
      : [];
  const locationById = new Map(
    locations.map((location) => [location._id.toString(), location]),
  );

  const customerIds = uniqueIds(
    submissions.map((submission) => submission.customerId),
  );
  const customers =
    customerIds.length > 0
      ? await Customer.find({ _id: { $in: customerIds } })
      : [];
  const customerById = new Map(
    customers.map((customer) => [customer._id.toString(), customer]),
  );

  return incidents.map((incident) => {
    const submission = submissionById.get(incident.submissionId.toString());
    const survey = submission
      ? surveyById.get(submission.surveyId.toString())
      : undefined;
    const location = submission?.locationId
      ? locationById.get(submission.locationId.toString())
      : undefined;
    const customer = submission?.customerId
      ? customerById.get(submission.customerId.toString())
      : undefined;

    return incidentSchema.parse({
      id: incident._id.toString(),
      code: incident.code,
      status: incident.status,
      timeline: incident.timeline.map((event) => ({
        status: event.status,
        at: event.at.toISOString(),
      })),
      createdAt: incident.createdAt.toISOString(),
      rating: submission?.rating ?? null,
      surveyName: survey?.name ?? "Unknown survey",
      locationName: location?.name ?? null,
      customerEmail: customer?.email ?? null,
      channel: incident.channel ?? submission?.channel ?? null,
      issueCategory: incident.issueCategory ?? submission?.issueCategory ?? null,
      assignees: incident.assignees ?? [],
    });
  });
}

export async function createForSubmission(input: {
  tenantId: Types.ObjectId | string;
  tenantName: string;
  submissionId: Types.ObjectId | string;
  locationId?: Types.ObjectId | string | null;
  channel?: string;
  issueCategory?: string;
  createdAt?: Date;
  expoPushClient?: ExpoPushClient;
}) {
  const createdAt = input.createdAt ?? new Date();
  const tenantId = input.tenantId.toString();
  const code = await generateIncidentCode(tenantId, input.tenantName, createdAt);

  const incident = await IncidentModel.create({
    tenantId: input.tenantId,
    submissionId: input.submissionId,
    locationId: input.locationId ?? undefined,
    channel: input.channel,
    issueCategory: input.issueCategory,
    code,
    status: "created",
    timeline: [{ status: "created", at: createdAt }],
  });

  if (input.expoPushClient) {
    await notifyNewIncident(
      input.expoPushClient,
      tenantId,
      incident._id.toString(),
      incident.code,
      input.locationId?.toString(),
    );
  }

  return incident;
}

export async function updateForTenant(
  tenantId: string,
  incidentId: string,
  input: UpdateIncidentRequest,
): Promise<Incident | null> {
  const incident = await IncidentModel.findOne({
    _id: incidentId,
    tenantId,
  });
  if (!incident) {
    return null;
  }

  incident.status = input.status;
  incident.timeline.push({ status: input.status, at: new Date() });
  if (input.assignees) {
    incident.assignees = input.assignees;
  }
  await incident.save();

  const [row] = await enrichIncidents([incident]);
  return row ?? null;
}

export async function listForTenant(tenantId: string): Promise<Incident[]> {
  const incidents = await IncidentModel.find({ tenantId }).sort({
    createdAt: -1,
  });
  return enrichIncidents(incidents);
}

export async function getForTenant(
  tenantId: string,
  incidentId: string,
): Promise<Incident | null> {
  const incident = await IncidentModel.findOne({
    _id: incidentId,
    tenantId,
  });
  if (!incident) {
    return null;
  }

  const [row] = await enrichIncidents([incident]);
  return row ?? null;
}
