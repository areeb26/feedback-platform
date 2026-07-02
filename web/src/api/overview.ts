import {
  overviewQuerySchema,
  overviewSchema,
  type Overview,
  type OverviewQuery,
} from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";


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
  if (parsed.label) params.set("label", parsed.label);

  const qs = params.toString();
  const response = await apiFetch(
    `${tenantBase(slug)}/overview${qs ? `?${qs}` : ""}`,
  );
  if (!response.ok) {
    throw new Error("Failed to load overview");
  }
  return overviewSchema.parse(await response.json());
}

export { formatTrend } from "../lib/formatters";

export type { Overview };
