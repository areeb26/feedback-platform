import {
  incidentSchema,
  updateIncidentRequestSchema,
  type Incident,
  type UpdateIncidentRequest,
} from "@feedback-platform/shared";
import { apiFetch } from "./client";

export { statusLabel, channelLabelEn, issueCategoryLabelEn } from "../lib/labels";

const incidentListSchema = incidentSchema.array();

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchIncident(
  slug: string,
  incidentId: string,
  getToken: () => Promise<string | null>,
): Promise<Incident> {
  const payload = await apiFetch<unknown>(
    `${tenantBase(slug)}/incidents/${incidentId}`,
    getToken,
  );
  return incidentSchema.parse(payload);
}

export async function fetchIncidents(
  slug: string,
  getToken: () => Promise<string | null>,
): Promise<Incident[]> {
  const payload = await apiFetch<unknown>(
    `${tenantBase(slug)}/incidents`,
    getToken,
  );
  return incidentListSchema.parse(payload);
}

export async function updateIncident(
  slug: string,
  incidentId: string,
  getToken: () => Promise<string | null>,
  input: UpdateIncidentRequest,
): Promise<Incident> {
  const body = updateIncidentRequestSchema.parse(input);
  const payload = await apiFetch<unknown>(
    `${tenantBase(slug)}/incidents/${incidentId}`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return incidentSchema.parse(payload);
}

export function formatIncidentDate(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
