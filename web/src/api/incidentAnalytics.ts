import {
  incidentAnalyticsQuerySchema,
  incidentAnalyticsSchema,
  type IncidentAnalytics,
  type IncidentAnalyticsQuery,
} from "@feedback-platform/shared";

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchIncidentAnalytics(
  slug: string,
  query: IncidentAnalyticsQuery = {},
): Promise<IncidentAnalytics> {
  const params = new URLSearchParams();
  const parsed = incidentAnalyticsQuerySchema.parse(query);

  if (parsed.startDate) params.set("startDate", parsed.startDate);
  if (parsed.endDate) params.set("endDate", parsed.endDate);
  if (parsed.locationId) params.set("locationId", parsed.locationId);

  const qs = params.toString();
  const response = await fetch(
    `${tenantBase(slug)}/analytics/incidents${qs ? `?${qs}` : ""}`,
  );
  if (!response.ok) {
    throw new Error("Failed to load incident analytics");
  }
  return incidentAnalyticsSchema.parse(await response.json());
}

export function formatTrend(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}`;
}

export function formatDuration(minutes: number) {
  if (minutes === 0) {
    return "0m";
  }

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = Math.round(minutes % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

  return parts.join(" ");
}

export function exportStaffPerformanceCsv(
  rows: IncidentAnalytics["staffPerformance"],
) {
  const header = [
    "Staff Member",
    "Submissions",
    "Incidents Created",
    "Reviewed",
    "Resolved",
    "Avg Review",
    "Avg Resolve",
    "% Resolved",
  ].join(",");

  const body = rows
    .map((row) =>
      [
        row.staffMember,
        row.submissions,
        row.incidentsCreated,
        row.reviewed,
        row.resolved,
        formatDuration(row.avgReviewMinutes),
        formatDuration(row.avgResolveMinutes),
        `${row.percentResolved}%`,
      ].join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
}

export type { IncidentAnalytics };
