import type { Types } from "mongoose";
import { Incident } from "../models/incident.js";

const INCIDENT_RATING_THRESHOLD = 3;

export function shouldCreateIncident(rating: number | undefined) {
  return rating !== undefined && rating <= INCIDENT_RATING_THRESHOLD;
}

export function tenantCodePrefix(tenantName: string) {
  const letters = tenantName.replace(/[^a-zA-Z]/g, "");
  return letters.slice(0, 3).toUpperCase().padEnd(3, "X");
}

export async function generateIncidentCode(
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

  const count = await Incident.countDocuments({
    tenantId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}-${datePart}-${sequence}`;
}

export async function createIncidentForSubmission(input: {
  tenantId: Types.ObjectId | string;
  tenantName: string;
  submissionId: Types.ObjectId | string;
  locationId?: Types.ObjectId | string | null;
  createdAt?: Date;
}) {
  const createdAt = input.createdAt ?? new Date();
  const code = await generateIncidentCode(
    input.tenantId.toString(),
    input.tenantName,
    createdAt,
  );

  return Incident.create({
    tenantId: input.tenantId,
    submissionId: input.submissionId,
    locationId: input.locationId ?? undefined,
    code,
    status: "created",
    timeline: [{ status: "created", at: createdAt }],
  });
}
