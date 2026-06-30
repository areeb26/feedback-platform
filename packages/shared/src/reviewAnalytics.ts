import { z } from "zod";

export const reviewAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  directory: z.enum(["google", "foodpanda"]).optional(),
  listing: z.string().optional(),
  label: z.string().optional(),
});

export type ReviewAnalyticsQuery = z.infer<typeof reviewAnalyticsQuerySchema>;

export const ratingsByDateSchema = z.object({
  date: z.string(),
  one: z.number().int().nonnegative(),
  two: z.number().int().nonnegative(),
  three: z.number().int().nonnegative(),
  four: z.number().int().nonnegative(),
  five: z.number().int().nonnegative(),
});

export const listingBreakdownRowSchema = z.object({
  listingName: z.string(),
  reviews: z.number().int().nonnegative(),
  rating: z.number(),
  positivePercent: z.number(),
  positiveCount: z.number().int().nonnegative(),
  negativePercent: z.number(),
  negativeCount: z.number().int().nonnegative(),
  replyRate: z.number(),
  repliedCount: z.number().int().nonnegative(),
});

export const reviewAnalyticsSchema = z.object({
  totalReviews: z.number().int().nonnegative(),
  totalReviewsTrend: z.number(),
  averageRating: z.number(),
  averageRatingTrend: z.number(),
  replyRate: z.number(),
  replyRateTrend: z.number(),
  repliedCount: z.number().int().nonnegative(),
  positiveReviewsPercent: z.number(),
  positiveReviewsTrend: z.number(),
  positiveReviewsCount: z.number().int().nonnegative(),
  ratingsByDate: z.array(ratingsByDateSchema),
  listingsBreakdown: z.array(listingBreakdownRowSchema),
  labelsBreakdown: z.array(listingBreakdownRowSchema),
});

export type ReviewAnalytics = z.infer<typeof reviewAnalyticsSchema>;
export type ListingBreakdownRow = z.infer<typeof listingBreakdownRowSchema>;
