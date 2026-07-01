import {
  overviewSchema,
  type Overview,
  type OverviewQuery,
} from "@feedback-platform/shared";
import { apiFetch } from "./client";

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchOverview(
  slug: string,
  getToken: () => Promise<string | null>,
  query: OverviewQuery = {},
): Promise<Overview> {
  const params = new URLSearchParams();
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);
  if (query.locationId) params.set("locationId", query.locationId);
  if (query.surveyId) params.set("surveyId", query.surveyId);

  const qs = params.toString();
  const payload = await apiFetch<unknown>(
    `${tenantBase(slug)}/overview${qs ? `?${qs}` : ""}`,
    getToken,
  );
  return overviewSchema.parse(payload);
}

export function formatTrend(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}`;
}

export function monthRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}
