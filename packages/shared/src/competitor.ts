import { z } from "zod";

export const competitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  placeId: z.string(),
  rating: z.number().nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
  lastRefreshedAt: z.string().datetime().nullable(),
});

export type Competitor = z.infer<typeof competitorSchema>;

export const createCompetitorRequestSchema = z.object({
  name: z.string().min(1),
  placeId: z.string().min(1),
});

export type CreateCompetitorRequest = z.infer<
  typeof createCompetitorRequestSchema
>;

export const updateCompetitorRequestSchema = z
  .object({
    name: z.string().min(1).optional(),
    placeId: z.string().min(1).optional(),
  })
  .refine((value) => value.name !== undefined || value.placeId !== undefined, {
    message: "At least one field is required",
  });

export type UpdateCompetitorRequest = z.infer<
  typeof updateCompetitorRequestSchema
>;

export const competitorRefreshResponseSchema = z.object({
  refreshed: z.number().int().nonnegative(),
});

export type CompetitorRefreshResponse = z.infer<
  typeof competitorRefreshResponseSchema
>;

export const competitorAnalyticsQuerySchema = z.object({
  competitorIds: z.string().optional(),
  search: z.string().optional(),
});

export type CompetitorAnalyticsQuery = z.infer<
  typeof competitorAnalyticsQuerySchema
>;

export const competitorAnalyticsColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  isOwnBusiness: z.boolean(),
});

export const competitorAnalyticsCellSchema = z.object({
  score: z.number().nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
});

export const competitorAnalyticsRowSchema = z.object({
  category: z.string(),
  rank: z.number().int().positive().nullable(),
  leaderName: z.string().nullable(),
  isLeading: z.boolean(),
  cells: z.array(competitorAnalyticsCellSchema),
});

export const competitorAnalyticsSchema = z.object({
  ownBusinessName: z.string(),
  columns: z.array(competitorAnalyticsColumnSchema),
  categories: z.array(competitorAnalyticsRowSchema),
});

export type CompetitorAnalytics = z.infer<typeof competitorAnalyticsSchema>;

export const PERFORMANCE_CATEGORIES = [
  "Food & Beverage",
  "Ambiance",
  "Amenities",
  "Customer Service",
  "Delivery Experience",
] as const;
