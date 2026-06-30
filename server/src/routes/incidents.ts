import type { Request, Response } from "express";
import {
  createIncidentRequestSchema,
  incidentSchema,
  updateIncidentRequestSchema,
} from "@feedback-platform/shared";
import { Customer } from "../models/customer.js";
import { Incident } from "../models/incident.js";
import { Location } from "../models/location.js";
import { Submission } from "../models/submission.js";
import { Survey } from "../models/survey.js";
import { Tenant } from "../models/tenant.js";
import {
  createIncidentForSubmission,
  shouldCreateIncident,
} from "../services/incidents.js";

async function upsertCustomer(input: {
  tenantId: string;
  name?: string;
  email?: string;
  phone?: string;
  locationId?: string;
}) {
  const query = input.phone
    ? { tenantId: input.tenantId, phone: input.phone }
    : input.email
      ? { tenantId: input.tenantId, email: input.email }
      : null;

  let customer = query ? await Customer.findOne(query) : null;
  if (!customer) {
    customer = await Customer.create({
      tenantId: input.tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      mostRecentLocationId: input.locationId,
    });
    return customer;
  }

  if (input.name) customer.name = input.name;
  if (input.email) customer.email = input.email;
  if (input.phone) customer.phone = input.phone;
  if (input.locationId) customer.mostRecentLocationId = input.locationId;
  await customer.save();
  return customer;
}

async function toIncidentResponse(incident: {
  _id: { toString(): string };
  code: string;
  status: "created" | "reviewed" | "resolved";
  timeline: Array<{ status: "created" | "reviewed" | "resolved"; at: Date }>;
  createdAt: Date;
  submissionId: { toString(): string };
  assignees?: string[] | null;
}) {
  const submission = await Submission.findById(incident.submissionId);
  const survey = submission
    ? await Survey.findById(submission.surveyId)
    : null;
  const location = submission?.locationId
    ? await Location.findById(submission.locationId)
    : null;
  const customer = submission?.customerId
    ? await Customer.findById(submission.customerId)
    : null;

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
    assignees: incident.assignees ?? [],
  });
}

export function createIncidentRoutes() {
  return {
    async list(req: Request, res: Response) {
      const incidents = await Incident.find({
        tenantId: req.tenant!.id,
      }).sort({ createdAt: -1 });
      const rows = await Promise.all(
        incidents.map((incident) => toIncidentResponse(incident)),
      );
      res.json(rows);
    },

    async create(req: Request, res: Response) {
      const input = createIncidentRequestSchema.parse(req.body);
      const survey = await Survey.findOne({
        _id: input.surveyId,
        tenantId: req.tenant!.id,
      });
      if (!survey) {
        res.status(404).json({ error: "Survey not found" });
        return;
      }

      const tenant = await Tenant.findById(req.tenant!.id);
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      const customer = await upsertCustomer({
        tenantId: req.tenant!.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        locationId: survey.locationId?.toString(),
      });

      const submission = await Submission.create({
        tenantId: req.tenant!.id,
        surveyId: survey._id,
        locationId: survey.locationId,
        customerId: customer._id,
        rating: input.rating,
        answers: [
          {
            questionId: survey.questions[0]?.id ?? "q1",
            value: input.rating,
          },
        ],
      });

      const incident = shouldCreateIncident(input.rating)
        ? await createIncidentForSubmission({
            tenantId: tenant._id,
            tenantName: tenant.name,
            submissionId: submission._id,
            locationId: survey.locationId,
          })
        : null;

      if (!incident) {
        res.status(400).json({
          error: "Rating above incident threshold; no incident created",
        });
        return;
      }

      res.status(201).json(await toIncidentResponse(incident));
    },

    async update(req: Request, res: Response) {
      const input = updateIncidentRequestSchema.parse(req.body);
      const incident = await Incident.findOne({
        _id: req.params.incidentId,
        tenantId: req.tenant!.id,
      });
      if (!incident) {
        res.status(404).json({ error: "Incident not found" });
        return;
      }

      incident.status = input.status;
      incident.timeline.push({ status: input.status, at: new Date() });
      if (input.assignees) {
        incident.assignees = input.assignees;
      }
      await incident.save();

      res.json(await toIncidentResponse(incident));
    },
  };
}

export async function maybeCreateIncidentForSubmission(input: {
  tenantId: string;
  tenantName: string;
  submissionId: string;
  rating?: number;
  locationId?: string | null;
}) {
  if (!shouldCreateIncident(input.rating)) {
    return null;
  }

  return createIncidentForSubmission({
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    submissionId: input.submissionId,
    locationId: input.locationId,
  });
}
