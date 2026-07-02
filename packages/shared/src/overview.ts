import { z } from "zod";
import { thirdPartyReviewSummarySchema } from "./google.js";

export const ratingBreakdownItemSchema = z.object({
  stars: z.number().int().min(1).max(5),
  count: z.number().int().nonnegative(),
  percent: z.number(),
});

export const overviewSchema = z.object({
  smileScore: z.number(),
  smileScoreTrend: z.number(),
  submissions: z.number().int().nonnegative(),
  submissionsTrend: z.number(),
  totalIncidents: z.number().int().nonnegative(),
  totalIncidentsTrend: z.number(),
  resolvedPercent: z.number(),
  resolvedPercentTrend: z.number(),
  targetSmileScore: z.number(),
  ratingBreakdown: z.array(ratingBreakdownItemSchema),
  thirdPartyReviews: z.array(thirdPartyReviewSummarySchema),
});

export type Overview = z.infer<typeof overviewSchema>;

export const overviewQuerySchema = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  locationId: z.string().optional(),
  surveyId: z.string().optional(),
  label: z.string().optional(),
});

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
