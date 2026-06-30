import { z } from "zod";

export const incidentAnalyticsQuerySchema = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  locationId: z.string().optional(),
});

export type IncidentAnalyticsQuery = z.infer<
  typeof incidentAnalyticsQuerySchema
>;

export const newIncidentsByDateSchema = z.object({
  date: z.string(),
  oneStar: z.number().int().nonnegative(),
  twoStar: z.number().int().nonnegative(),
  threeStar: z.number().int().nonnegative(),
});

export const responseTimeTrendPointSchema = z.object({
  date: z.string(),
  avgReviewTimeMinutes: z.number(),
  avgResolveTimeMinutes: z.number(),
});

export const staffPerformanceRowSchema = z.object({
  staffMember: z.string(),
  submissions: z.number().int().nonnegative(),
  incidentsCreated: z.number().int().nonnegative(),
  reviewed: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  avgReviewMinutes: z.number(),
  avgResolveMinutes: z.number(),
  percentResolved: z.number(),
});

export const incidentAnalyticsSchema = z.object({
  totalIncidents: z.number().int().nonnegative(),
  totalIncidentsTrend: z.number(),
  resolvedIncidents: z.number().int().nonnegative(),
  resolvedIncidentsTrend: z.number(),
  avgReviewTimeMinutes: z.number(),
  avgReviewTimeTrend: z.number(),
  avgResolveTimeMinutes: z.number(),
  avgResolveTimeTrend: z.number(),
  newIncidentsByDate: z.array(newIncidentsByDateSchema),
  responseTimeTrend: z.array(responseTimeTrendPointSchema),
  staffPerformance: z.array(staffPerformanceRowSchema),
});

export type IncidentAnalytics = z.infer<typeof incidentAnalyticsSchema>;
