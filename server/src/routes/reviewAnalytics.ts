import type { Request, Response } from "express";
import {
  reviewAnalyticsQuerySchema,
  reviewAnalyticsSchema,
} from "@feedback-platform/shared";
import { Location } from "../models/location.js";
import { Review } from "../models/review.js";
import {
  buildListingBreakdown,
  buildRatingsByDate,
  calculateAverageRating,
  calculatePositivePercent,
  calculateReplyRate,
  calculateTrend,
} from "../services/reviewAnalytics.js";

function parseRange(query: Record<string, unknown>) {
  const filters = reviewAnalyticsQuerySchema.parse(query);
  const end = filters.endDate ? new Date(filters.endDate) : new Date();
  const start = filters.startDate
    ? new Date(filters.startDate)
    : new Date(end.getFullYear(), end.getMonth(), 1);

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return { start, end, previousStart, previousEnd, filters };
}

async function loadReviews(
  tenantId: string,
  range: { start: Date; end: Date },
  filters: {
    directory?: "google" | "foodpanda";
    listing?: string;
    label?: string;
  },
) {
  const mongoFilter: Record<string, unknown> = {
    tenantId,
    postedAt: { $gte: range.start, $lte: range.end },
  };

  if (filters.directory) mongoFilter.source = filters.directory;
  if (filters.listing) {
    mongoFilter.$or = [
      { locationName: { $regex: filters.listing, $options: "i" } },
      { listingName: { $regex: filters.listing, $options: "i" } },
    ];
  }

  let reviews = await Review.find(mongoFilter);

  if (filters.label) {
    const locations = await Location.find({
      tenantId,
      labels: { $regex: filters.label, $options: "i" },
    });
    const locationNames = new Set(locations.map((location) => location.name));
    reviews = reviews.filter(
      (review) =>
        review.locationName && locationNames.has(review.locationName),
    );
  }

  return reviews;
}

function summarize(
  reviews: Array<{
    rating: number;
    status: string;
    postedAt: Date;
    listingName?: string | null;
    locationName?: string | null;
  }>,
) {
  const ratings = reviews.map((review) => review.rating);
  const repliedCount = reviews.filter(
    (review) => review.status === "replied",
  ).length;
  const positiveReviewsCount = ratings.filter((rating) => rating >= 4).length;

  return {
    totalReviews: reviews.length,
    averageRating: calculateAverageRating(ratings),
    replyRate: calculateReplyRate(reviews),
    repliedCount,
    positiveReviewsPercent: calculatePositivePercent(ratings),
    positiveReviewsCount,
    ratingsByDate: buildRatingsByDate(reviews),
    listingsBreakdown: buildListingBreakdown(reviews),
    labelsBreakdown: buildListingBreakdown(reviews),
  };
}

export function createReviewAnalyticsRoutes() {
  return {
    async get(req: Request, res: Response) {
      const { start, end, previousStart, previousEnd, filters } = parseRange(
        req.query,
      );
      const tenantId = req.tenant!.id;

      const [currentReviews, previousReviews] = await Promise.all([
        loadReviews(tenantId, { start, end }, filters),
        loadReviews(
          tenantId,
          { start: previousStart, end: previousEnd },
          filters,
        ),
      ]);

      const current = summarize(currentReviews);
      const previous = summarize(previousReviews);

      res.json(
        reviewAnalyticsSchema.parse({
          totalReviews: current.totalReviews,
          totalReviewsTrend: calculateTrend(
            current.totalReviews,
            previous.totalReviews,
          ),
          averageRating: current.averageRating,
          averageRatingTrend: calculateTrend(
            current.averageRating,
            previous.averageRating,
          ),
          replyRate: current.replyRate,
          replyRateTrend: calculateTrend(current.replyRate, previous.replyRate),
          repliedCount: current.repliedCount,
          positiveReviewsPercent: current.positiveReviewsPercent,
          positiveReviewsTrend: calculateTrend(
            current.positiveReviewsPercent,
            previous.positiveReviewsPercent,
          ),
          positiveReviewsCount: current.positiveReviewsCount,
          ratingsByDate: current.ratingsByDate,
          listingsBreakdown: current.listingsBreakdown,
          labelsBreakdown: current.labelsBreakdown,
        }),
      );
    },
  };
}
