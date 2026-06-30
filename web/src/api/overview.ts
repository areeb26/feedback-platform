import {
  overviewQuerySchema,
  overviewSchema,
  type Overview,
  type OverviewQuery,
} from "@feedback-platform/shared";

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchOverview(
  slug: string,
  query: OverviewQuery = {},
): Promise<Overview> {
  const params = new URLSearchParams();
  const parsed = overviewQuerySchema.parse(query);

  if (parsed.startDate) params.set("startDate", parsed.startDate);
  if (parsed.endDate) params.set("endDate", parsed.endDate);
  if (parsed.locationId) params.set("locationId", parsed.locationId);
  if (parsed.surveyId) params.set("surveyId", parsed.surveyId);

  const qs = params.toString();
  const response = await fetch(
    `${tenantBase(slug)}/overview${qs ? `?${qs}` : ""}`,
  );
  if (!response.ok) {
    throw new Error("Failed to load overview");
  }
  return overviewSchema.parse(await response.json());
}

export function formatTrend(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}`;
}

export type { Overview };
