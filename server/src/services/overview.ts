import {
  overviewQuerySchema,
  overviewSchema,
  type Overview,
  type OverviewQuery,
} from "@feedback-platform/shared";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { Incident } from "../models/incident.js";
import { Location } from "../models/location.js";
import { Submission } from "../models/submission.js";
import { parseAnalyticsDateRange } from "./analytics/dateRange.js";
import { calculateTrend } from "./analytics/trend.js";
import { getThirdPartyReviewSummaries } from "./thirdPartyReviews.js";
import { escapeRegex } from "./text.js";

export function calculateSmileScore(ratings: number[]) {
  if (ratings.length === 0) {
    return 0;
  }
  const average =
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return Math.round((average / 5) * 100);
}

export function calculateRatingBreakdown(ratings: number[]) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of ratings) {
    const stars = Math.min(5, Math.max(1, Math.round(rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    counts[stars] += 1;
  }

  const total = ratings.length;
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars as 1 | 2 | 3 | 4 | 5],
    percent:
      total === 0
        ? 0
        : Math.round((counts[stars as 1 | 2 | 3 | 4 | 5] / total) * 1000) / 10,
  }));
}

export function calculateResolvedPercent(
  incidents: Array<{ status: string }>,
) {
  if (incidents.length === 0) {
    return 0;
  }
  const resolved = incidents.filter(
    (incident) => incident.status === "resolved",
  ).length;
  return Math.round((resolved / incidents.length) * 1000) / 10;
}

function submissionFilter(
  tenantId: string,
  range: { start: Date; end: Date },
  filters: { locationIds?: string[]; surveyId?: string },
) {
  const filter: Record<string, unknown> = {
    tenantId,
    createdAt: { $gte: range.start, $lte: range.end },
    ...(filters.surveyId ? { surveyId: filters.surveyId } : {}),
  };

  if (filters.locationIds !== undefined) {
    if (filters.locationIds.length === 0) {
      filter._id = { $exists: false };
    } else if (filters.locationIds.length === 1) {
      filter.locationId = filters.locationIds[0];
    } else {
      filter.locationId = { $in: filters.locationIds };
    }
  }

  return filter;
}

async function resolveLocationIds(
  tenantId: string,
  filters: { locationId?: string; label?: string },
) {
  if (filters.locationId) {
    return [filters.locationId];
  }

  if (!filters.label) {
    return undefined;
  }

  const locations = await Location.find({
    tenantId,
    labels: { $regex: escapeRegex(filters.label), $options: "i" },
  });
  return locations.map((location) => location._id.toString());
}

async function loadIncidents(
  tenantId: string,
  range: { start: Date; end: Date },
  filters: { locationIds?: string[]; surveyId?: string },
) {
  const incidentFilter: Record<string, unknown> = {
    tenantId,
    createdAt: { $gte: range.start, $lte: range.end },
  };

  if (filters.locationIds !== undefined) {
    if (filters.locationIds.length === 0) {
      incidentFilter._id = { $exists: false };
    } else if (filters.locationIds.length === 1) {
      incidentFilter.locationId = filters.locationIds[0];
    } else {
      incidentFilter.locationId = { $in: filters.locationIds };
    }
  }

  if (filters.surveyId) {
    const submissionFilter: Record<string, unknown> = {
      tenantId,
      surveyId: filters.surveyId,
    };
    if (filters.locationIds !== undefined) {
      if (filters.locationIds.length === 0) {
        submissionFilter._id = { $exists: false };
      } else if (filters.locationIds.length === 1) {
        submissionFilter.locationId = filters.locationIds[0];
      } else {
        submissionFilter.locationId = { $in: filters.locationIds };
      }
    }

    const submissions = await Submission.find(submissionFilter).select("_id");
    incidentFilter.submissionId = {
      $in: submissions.map((submission) => submission._id),
    };
  }

  return Incident.find(incidentFilter);
}

export async function getOverviewDashboard(
  tenantId: string,
  query: OverviewQuery,
  googleClient?: GoogleBusinessClient,
): Promise<Overview> {
  const { start, end, previousStart, previousEnd, filters } =
    parseAnalyticsDateRange(query, overviewQuerySchema);

  const locationIds = await resolveLocationIds(tenantId, filters);
  const scopedFilters = {
    locationIds,
    surveyId: filters.surveyId,
  };

  const [submissions, previousSubmissions, incidents, previousIncidents] =
    await Promise.all([
      Submission.find(submissionFilter(tenantId, { start, end }, scopedFilters)),
      Submission.find(
        submissionFilter(
          tenantId,
          { start: previousStart, end: previousEnd },
          scopedFilters,
        ),
      ),
      loadIncidents(tenantId, { start, end }, scopedFilters),
      loadIncidents(
        tenantId,
        { start: previousStart, end: previousEnd },
        scopedFilters,
      ),
    ]);

  const ratings = submissions
    .map((submission) => submission.rating)
    .filter(
      (rating): rating is number => rating !== undefined && rating !== null,
    );
  const previousRatings = previousSubmissions
    .map((submission) => submission.rating)
    .filter(
      (rating): rating is number => rating !== undefined && rating !== null,
    );

  const smileScore = calculateSmileScore(ratings);
  const previousSmileScore = calculateSmileScore(previousRatings);
  const resolvedPercent = calculateResolvedPercent(incidents);
  const previousResolvedPercent = calculateResolvedPercent(previousIncidents);
  const thirdPartyReviews = await getThirdPartyReviewSummaries({
    tenantId,
    googleClient,
  });

  return overviewSchema.parse({
    smileScore,
    smileScoreTrend: calculateTrend(smileScore, previousSmileScore),
    submissions: submissions.length,
    submissionsTrend: calculateTrend(
      submissions.length,
      previousSubmissions.length,
    ),
    totalIncidents: incidents.length,
    totalIncidentsTrend: calculateTrend(
      incidents.length,
      previousIncidents.length,
    ),
    resolvedPercent,
    resolvedPercentTrend: calculateTrend(
      resolvedPercent,
      previousResolvedPercent,
    ),
    targetSmileScore: 100,
    ratingBreakdown: calculateRatingBreakdown(ratings),
    thirdPartyReviews,
  });
}
