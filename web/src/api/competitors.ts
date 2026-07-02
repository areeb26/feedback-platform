import {
  competitorAnalyticsQuerySchema,
  competitorAnalyticsSchema,
  competitorRefreshResponseSchema,
  competitorSchema,
  createCompetitorRequestSchema,
  type Competitor,
  type CompetitorAnalytics,
  type CompetitorAnalyticsQuery,
  type CompetitorRefreshResponse,
  type CreateCompetitorRequest,
} from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";

const competitorListSchema = competitorSchema.array();


export async function fetchCompetitors(slug: string): Promise<Competitor[]> {
  const response = await apiFetch(`${tenantBase(slug)}/competitors`);
  if (!response.ok) {
    throw new Error("Failed to load competitors");
  }
  return competitorListSchema.parse(await response.json());
}

export async function createCompetitor(
  slug: string,
  input: CreateCompetitorRequest,
): Promise<Competitor> {
  const body = createCompetitorRequestSchema.parse(input);
  const response = await apiFetch(`${tenantBase(slug)}/competitors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to create competitor");
  }
  return competitorSchema.parse(await response.json());
}

export async function deleteCompetitor(
  slug: string,
  competitorId: string,
): Promise<void> {
  const response = await apiFetch(
    `${tenantBase(slug)}/competitors/${competitorId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error("Failed to delete competitor");
  }
}

export async function refreshCompetitors(
  slug: string,
): Promise<CompetitorRefreshResponse> {
  const response = await apiFetch(`${tenantBase(slug)}/competitors/refresh`, {
    method: "POST",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Failed to refresh competitors");
  }
  return competitorRefreshResponseSchema.parse(await response.json());
}

export async function fetchCompetitorAnalytics(
  slug: string,
  query: CompetitorAnalyticsQuery = {},
): Promise<CompetitorAnalytics> {
  const params = competitorAnalyticsQuerySchema.parse(query);
  const searchParams = new URLSearchParams();
  if (params.competitorIds) searchParams.set("competitorIds", params.competitorIds);
  if (params.search) searchParams.set("search", params.search);

  const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
  const response = await apiFetch(
    `${tenantBase(slug)}/analytics/competitors${suffix}`,
  );
  if (!response.ok) {
    throw new Error("Failed to load competitor analytics");
  }
  return competitorAnalyticsSchema.parse(await response.json());
}

export type { Competitor, CompetitorAnalytics, CreateCompetitorRequest };
