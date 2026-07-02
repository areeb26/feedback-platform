import {
  incidentAnalyticsQuerySchema,
  incidentAnalyticsSchema,
  type IncidentAnalytics,
  type IncidentAnalyticsQuery,
} from "@feedback-platform/shared";
import { Incident } from "../models/incident.js";
import { Submission } from "../models/submission.js";
import { parseAnalyticsDateRange } from "./analytics/dateRange.js";
import { calculateTrend } from "./analytics/trend.js";

type TimelineEvent = {
  status: "created" | "reviewed" | "resolved";
  at: Date;
};

type IncidentRow = {
  _id: { toString(): string };
  status: "created" | "reviewed" | "resolved";
  timeline: TimelineEvent[];
  createdAt: Date;
  submissionId: { toString(): string };
  assignees?: string[] | null;
};

export function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function getTimelineEvent(
  timeline: TimelineEvent[],
  status: TimelineEvent["status"],
) {
  return timeline.find((event) => event.status === status);
}

export function calculateAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
    ) / 10
  );
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function severityBucket(rating: number | null | undefined) {
  if (rating === 1) return "oneStar" as const;
  if (rating === 2) return "twoStar" as const;
  if (rating === 3) return "threeStar" as const;
  return null;
}

export function reviewMinutes(timeline: TimelineEvent[]) {
  const created = getTimelineEvent(timeline, "created");
  const reviewed = getTimelineEvent(timeline, "reviewed");
  if (!created || !reviewed) {
    return null;
  }
  return minutesBetween(created.at, reviewed.at);
}

export function resolveMinutes(timeline: TimelineEvent[]) {
  const created = getTimelineEvent(timeline, "created");
  const resolved = getTimelineEvent(timeline, "resolved");
  if (!created || !resolved) {
    return null;
  }
  return minutesBetween(created.at, resolved.at);
}

async function loadIncidentRows(
  tenantId: string,
  range: { start: Date; end: Date },
  locationId?: string,
) {
  const incidents = await Incident.find({
    tenantId,
    createdAt: { $gte: range.start, $lte: range.end },
    ...(locationId ? { locationId } : {}),
  });

  const submissionIds = incidents.map((incident) => incident.submissionId);
  const submissions = await Submission.find({
    _id: { $in: submissionIds },
    tenantId,
  });
  const ratingBySubmissionId = new Map(
    submissions.map((submission) => [
      submission._id.toString(),
      submission.rating ?? null,
    ]),
  );

  return incidents.map((incident) => ({
    incident: incident as IncidentRow,
    rating: ratingBySubmissionId.get(incident.submissionId.toString()) ?? null,
  }));
}

function buildNewIncidentsByDate(
  rows: Array<{ incident: IncidentRow; rating: number | null }>,
) {
  const byDate = new Map<
    string,
    { oneStar: number; twoStar: number; threeStar: number }
  >();

  for (const row of rows) {
    const date = toDateKey(row.incident.createdAt);
    const bucket =
      byDate.get(date) ?? { oneStar: 0, twoStar: 0, threeStar: 0 };
    const severity = severityBucket(row.rating);
    if (severity) {
      bucket[severity] += 1;
    }
    byDate.set(date, bucket);
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, counts]) => ({ date, ...counts }));
}

function buildResponseTimeTrend(
  rows: Array<{ incident: IncidentRow; rating: number | null }>,
) {
  const byDate = new Map<string, { review: number[]; resolve: number[] }>();

  for (const row of rows) {
    const date = toDateKey(row.incident.createdAt);
    const bucket = byDate.get(date) ?? { review: [], resolve: [] };
    const review = reviewMinutes(row.incident.timeline);
    const resolve = resolveMinutes(row.incident.timeline);
    if (review !== null) bucket.review.push(review);
    if (resolve !== null) bucket.resolve.push(resolve);
    byDate.set(date, bucket);
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      avgReviewTimeMinutes: calculateAverage(values.review),
      avgResolveTimeMinutes: calculateAverage(values.resolve),
    }));
}

function buildStaffPerformance(
  rows: Array<{ incident: IncidentRow; rating: number | null }>,
) {
  const byStaff = new Map<
    string,
    {
      incidentsCreated: number;
      reviewed: number;
      resolved: number;
      submissionIds: Set<string>;
      reviewMinutes: number[];
      resolveMinutes: number[];
    }
  >();

  for (const row of rows) {
    const assignees =
      row.incident.assignees && row.incident.assignees.length > 0
        ? row.incident.assignees
        : ["Unassigned"];

    for (const staffMember of assignees) {
      const bucket = byStaff.get(staffMember) ?? {
        incidentsCreated: 0,
        reviewed: 0,
        resolved: 0,
        submissionIds: new Set<string>(),
        reviewMinutes: [],
        resolveMinutes: [],
      };

      bucket.incidentsCreated += 1;
      bucket.submissionIds.add(row.incident.submissionId.toString());
      if (
        row.incident.status === "reviewed" ||
        row.incident.status === "resolved"
      ) {
        bucket.reviewed += 1;
      }
      if (row.incident.status === "resolved") {
        bucket.resolved += 1;
      }

      const review = reviewMinutes(row.incident.timeline);
      const resolve = resolveMinutes(row.incident.timeline);
      if (review !== null) bucket.reviewMinutes.push(review);
      if (resolve !== null) bucket.resolveMinutes.push(resolve);

      byStaff.set(staffMember, bucket);
    }
  }

  return [...byStaff.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([staffMember, metrics]) => ({
      staffMember,
      submissions: metrics.submissionIds.size,
      incidentsCreated: metrics.incidentsCreated,
      reviewed: metrics.reviewed,
      resolved: metrics.resolved,
      avgReviewMinutes: calculateAverage(metrics.reviewMinutes),
      avgResolveMinutes: calculateAverage(metrics.resolveMinutes),
      percentResolved:
        metrics.incidentsCreated === 0
          ? 0
          : Math.round(
              (metrics.resolved / metrics.incidentsCreated) * 1000,
            ) / 10,
    }));
}

function summarize(rows: Array<{ incident: IncidentRow; rating: number | null }>) {
  const reviewTimes = rows
    .map((row) => reviewMinutes(row.incident.timeline))
    .filter((value): value is number => value !== null);
  const resolveTimes = rows
    .map((row) => resolveMinutes(row.incident.timeline))
    .filter((value): value is number => value !== null);

  return {
    totalIncidents: rows.length,
    resolvedIncidents: rows.filter(
      (row) => row.incident.status === "resolved",
    ).length,
    avgReviewTimeMinutes: calculateAverage(reviewTimes),
    avgResolveTimeMinutes: calculateAverage(resolveTimes),
    newIncidentsByDate: buildNewIncidentsByDate(rows),
    responseTimeTrend: buildResponseTimeTrend(rows),
    staffPerformance: buildStaffPerformance(rows),
  };
}

export async function getIncidentAnalyticsDashboard(
  tenantId: string,
  query: IncidentAnalyticsQuery,
): Promise<IncidentAnalytics> {
  const { start, end, previousStart, previousEnd, filters } =
    parseAnalyticsDateRange(query, incidentAnalyticsQuerySchema);

  const [currentRows, previousRows] = await Promise.all([
    loadIncidentRows(tenantId, { start, end }, filters.locationId),
    loadIncidentRows(
      tenantId,
      { start: previousStart, end: previousEnd },
      filters.locationId,
    ),
  ]);

  const current = summarize(currentRows);
  const previous = summarize(previousRows);

  return incidentAnalyticsSchema.parse({
    totalIncidents: current.totalIncidents,
    totalIncidentsTrend: calculateTrend(
      current.totalIncidents,
      previous.totalIncidents,
    ),
    resolvedIncidents: current.resolvedIncidents,
    resolvedIncidentsTrend: calculateTrend(
      current.resolvedIncidents,
      previous.resolvedIncidents,
    ),
    avgReviewTimeMinutes: current.avgReviewTimeMinutes,
    avgReviewTimeTrend: calculateTrend(
      current.avgReviewTimeMinutes,
      previous.avgReviewTimeMinutes,
    ),
    avgResolveTimeMinutes: current.avgResolveTimeMinutes,
    avgResolveTimeTrend: calculateTrend(
      current.avgResolveTimeMinutes,
      previous.avgResolveTimeMinutes,
    ),
    newIncidentsByDate: current.newIncidentsByDate,
    responseTimeTrend: current.responseTimeTrend,
    staffPerformance: current.staffPerformance,
  });
}
