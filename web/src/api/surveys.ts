import {
  createSurveyRequestSchema,
  publicSurveySchema,
  submitSurveyRequestSchema,
  submitSurveyResponseSchema,
  surveySchema,
  updateSurveyRequestSchema,
  type CreateSurveyRequest,
  type PublicSurvey,
  type SubmitSurveyRequest,
  type SubmitSurveyResponse,
  type Survey,
  type UpdateSurveyRequest,
} from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";

const surveyListSchema = surveySchema.array();

export async function fetchSurveys(slug: string): Promise<Survey[]> {
  const response = await apiFetch(`${tenantBase(slug)}/surveys`);
  if (!response.ok) {
    throw new Error("Failed to load surveys");
  }
  return surveyListSchema.parse(await response.json());
}

export async function createSurvey(
  slug: string,
  input: CreateSurveyRequest,
): Promise<Survey> {
  const body = createSurveyRequestSchema.parse(input);
  const response = await apiFetch(`${tenantBase(slug)}/surveys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to create survey");
  }
  return surveySchema.parse(await response.json());
}

export async function updateSurvey(
  slug: string,
  surveyId: string,
  input: UpdateSurveyRequest,
): Promise<Survey> {
  const body = updateSurveyRequestSchema.parse(input);
  const response = await apiFetch(`${tenantBase(slug)}/surveys/${surveyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to update survey");
  }
  return surveySchema.parse(await response.json());
}

export async function deleteSurvey(
  slug: string,
  surveyId: string,
): Promise<void> {
  const response = await apiFetch(`${tenantBase(slug)}/surveys/${surveyId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete survey");
  }
}

export async function fetchPublicSurvey(
  previewSlug: string,
  query = "",
): Promise<PublicSurvey> {
  const response = await fetch(`/api/public/surveys/${previewSlug}${query}`);
  if (!response.ok) {
    throw new Error("Failed to load survey");
  }
  return publicSurveySchema.parse(await response.json());
}

export async function submitPublicSurvey(
  previewSlug: string,
  input: SubmitSurveyRequest,
): Promise<SubmitSurveyResponse> {
  const body = submitSurveyRequestSchema.parse(input);
  const response = await fetch(`/api/public/surveys/${previewSlug}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to submit survey");
  }
  return submitSurveyResponseSchema.parse(await response.json());
}

export function buildSurveyLink(
  previewSlug: string,
  input: { channel?: string; locationId?: string },
) {
  const params = new URLSearchParams();
  if (input.channel) {
    params.set("channel", input.channel);
  }
  if (input.locationId) {
    params.set("location", input.locationId);
  }
  const query = params.toString();
  return `/s/${previewSlug}${query ? `?${query}` : ""}`;
}

export function formatSurveyDate(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export type { Survey };
