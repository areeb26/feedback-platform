import type { Request, Response } from "express";
import { overviewQuerySchema, overviewSchema } from "@feedback-platform/shared";
import { Incident } from "../models/incident.js";
import { Submission } from "../models/submission.js";
import {
  calculateRatingBreakdown,
  calculateResolvedPercent,
  calculateSmileScore,
  calculateTrend,
} from "../services/overview.js";

function parseRange(query: Record<string, unknown>) {
  const filters = overviewQuerySchema.parse(query);
  const end = filters.endDate ? new Date(filters.endDate) : new Date();
  const start = filters.startDate
    ? new Date(filters.startDate)
    : new Date(end.getFullYear(), end.getMonth(), 1);

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return { start, end, previousStart, previousEnd, filters };
}

function submissionFilter(
  tenantId: string,
  range: { start: Date; end: Date },
  filters: { locationId?: string; surveyId?: string },
) {
  return {
    tenantId,
    createdAt: { $gte: range.start, $lte: range.end },
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...(filters.surveyId ? { surveyId: filters.surveyId } : {}),
  };
}

async function loadIncidents(
  tenantId: string,
  range: { start: Date; end: Date },
  filters: { locationId?: string; surveyId?: string },
) {
  const incidentFilter: Record<string, unknown> = {
    tenantId,
    createdAt: { $gte: range.start, $lte: range.end },
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
  };

  if (filters.surveyId) {
    const submissions = await Submission.find({
      tenantId,
      surveyId: filters.surveyId,
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
    }).select("_id");
    incidentFilter.submissionId = {
      $in: submissions.map((submission) => submission._id),
    };
  }

  return Incident.find(incidentFilter);
}

export function createOverviewRoutes() {
  return {
    async get(req: Request, res: Response) {
      const { start, end, previousStart, previousEnd, filters } = parseRange(
        req.query,
      );
      const tenantId = req.tenant!.id;

      const [submissions, previousSubmissions, incidents, previousIncidents] =
        await Promise.all([
          Submission.find(submissionFilter(tenantId, { start, end }, filters)),
          Submission.find(
            submissionFilter(
              tenantId,
              { start: previousStart, end: previousEnd },
              filters,
            ),
          ),
          loadIncidents(tenantId, { start, end }, filters),
          loadIncidents(
            tenantId,
            { start: previousStart, end: previousEnd },
            filters,
          ),
        ]);

      const ratings = submissions
        .map((submission) => submission.rating)
        .filter((rating): rating is number => rating !== undefined && rating !== null);
      const previousRatings = previousSubmissions
        .map((submission) => submission.rating)
        .filter((rating): rating is number => rating !== undefined && rating !== null);

      const smileScore = calculateSmileScore(ratings);
      const previousSmileScore = calculateSmileScore(previousRatings);
      const resolvedPercent = calculateResolvedPercent(incidents);
      const previousResolvedPercent = calculateResolvedPercent(previousIncidents);

      res.json(
        overviewSchema.parse({
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
        }),
      );
    },
  };
}
