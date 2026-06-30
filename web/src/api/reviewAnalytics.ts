import {
  reviewAnalyticsQuerySchema,
  reviewAnalyticsSchema,
  type ReviewAnalytics,
  type ReviewAnalyticsQuery,
} from "@feedback-platform/shared";

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchReviewAnalytics(
  slug: string,
  query: ReviewAnalyticsQuery = {},
): Promise<ReviewAnalytics> {
  const params = new URLSearchParams();
  const parsed = reviewAnalyticsQuerySchema.parse(query);

  if (parsed.startDate) params.set("startDate", parsed.startDate);
  if (parsed.endDate) params.set("endDate", parsed.endDate);
  if (parsed.directory) params.set("directory", parsed.directory);
  if (parsed.listing) params.set("listing", parsed.listing);
  if (parsed.label) params.set("label", parsed.label);

  const qs = params.toString();
  const response = await fetch(
    `${tenantBase(slug)}/analytics/reviews${qs ? `?${qs}` : ""}`,
  );
  if (!response.ok) {
    throw new Error("Failed to load review analytics");
  }
  return reviewAnalyticsSchema.parse(await response.json());
}

export function formatTrend(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}%`;
}

export type { ReviewAnalytics };
