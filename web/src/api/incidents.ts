import {
  createIncidentRequestSchema,
  incidentSchema,
  updateIncidentRequestSchema,
  type CreateIncidentRequest,
  type Incident,
  type UpdateIncidentRequest,
} from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";

const incidentListSchema = incidentSchema.array();


export function exportIncidentsUrl(slug: string) {
  return `${tenantBase(slug)}/incidents/export`;
}

export async function fetchIncident(
  slug: string,
  incidentId: string,
): Promise<Incident> {
  const response = await apiFetch(`${tenantBase(slug)}/incidents/${incidentId}`);
  if (!response.ok) {
    throw new Error("Failed to load incident");
  }
  return incidentSchema.parse(await response.json());
}

export async function fetchIncidents(slug: string): Promise<Incident[]> {
  const response = await apiFetch(`${tenantBase(slug)}/incidents`);
  if (!response.ok) {
    throw new Error("Failed to load incidents");
  }
  return incidentListSchema.parse(await response.json());
}

export async function updateIncident(
  slug: string,
  incidentId: string,
  input: UpdateIncidentRequest,
): Promise<Incident> {
  const body = updateIncidentRequestSchema.parse(input);
  const response = await apiFetch(`${tenantBase(slug)}/incidents/${incidentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to update incident");
  }
  return incidentSchema.parse(await response.json());
}

export async function createIncident(
  slug: string,
  input: CreateIncidentRequest,
): Promise<Incident> {
  const body = createIncidentRequestSchema.parse(input);
  const response = await apiFetch(`${tenantBase(slug)}/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to create incident");
  }
  return incidentSchema.parse(await response.json());
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

export function timelineLabel(status: Incident["timeline"][number]["status"]) {
  if (status === "created") return "Created";
  if (status === "reviewed") return "Reviewed";
  return "Resolved";
}
