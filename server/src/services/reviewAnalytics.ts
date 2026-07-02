import {
  reviewAnalyticsQuerySchema,
  reviewAnalyticsSchema,
  type ReviewAnalytics,
  type ReviewAnalyticsQuery,
} from "@feedback-platform/shared";
import { Location } from "../models/location.js";
import { Review } from "../models/review.js";
import { parseAnalyticsDateRange } from "./analytics/dateRange.js";
import { calculateTrend } from "./analytics/trend.js";
import { escapeRegex } from "./text.js";

export function calculateAverageRating(ratings: number[]) {
  if (ratings.length === 0) {
    return 0;
  }
  return (
    Math.round(
      (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100,
    ) / 100
  );
}

export function calculateReplyRate(reviews: Array<{ status: string }>) {
  if (reviews.length === 0) {
    return 0;
  }
  const replied = reviews.filter((review) => review.status === "replied").length;
  return Math.round((replied / reviews.length) * 1000) / 10;
}

export function calculatePositivePercent(ratings: number[]) {
  if (ratings.length === 0) {
    return 0;
  }
  const positive = ratings.filter((rating) => rating >= 4).length;
  return Math.round((positive / ratings.length) * 1000) / 10;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildRatingsByDate(
  reviews: Array<{ postedAt: Date; rating: number }>,
) {
  const byDate = new Map<
    string,
    { one: number; two: number; three: number; four: number; five: number }
  >();

  for (const review of reviews) {
    const date = toDateKey(review.postedAt);
    const bucket =
      byDate.get(date) ?? { one: 0, two: 0, three: 0, four: 0, five: 0 };
    if (review.rating === 1) bucket.one += 1;
    if (review.rating === 2) bucket.two += 1;
    if (review.rating === 3) bucket.three += 1;
    if (review.rating === 4) bucket.four += 1;
    if (review.rating === 5) bucket.five += 1;
    byDate.set(date, bucket);
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, counts]) => ({ date, ...counts }));
}

export function buildListingBreakdown(
  reviews: Array<{
    listingName?: string | null;
    locationName?: string | null;
    rating: number;
    status: string;
  }>,
) {
  const byListing = new Map<
    string,
    Array<{ rating: number; status: string }>
  >();

  for (const review of reviews) {
    const listingName =
      review.listingName ?? review.locationName ?? "Unknown listing";
    const bucket = byListing.get(listingName) ?? [];
    bucket.push({ rating: review.rating, status: review.status });
    byListing.set(listingName, bucket);
  }

  return [...byListing.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([listingName, rows]) => {
      const ratings = rows.map((row) => row.rating);
      const positiveCount = ratings.filter((rating) => rating >= 4).length;
      const negativeCount = ratings.length - positiveCount;
      const repliedCount = rows.filter((row) => row.status === "replied").length;

      return {
        listingName,
        reviews: rows.length,
        rating: calculateAverageRating(ratings),
        positivePercent:
          rows.length === 0
            ? 0
            : Math.round((positiveCount / rows.length) * 1000) / 10,
        positiveCount,
        negativePercent:
          rows.length === 0
            ? 0
            : Math.round((negativeCount / rows.length) * 1000) / 10,
        negativeCount,
        replyRate: calculateReplyRate(rows),
        repliedCount,
      };
    });
}

export function buildLabelBreakdown(
  reviews: Array<{
    locationName?: string | null;
    rating: number;
    status: string;
  }>,
  labelsByLocationName: Map<string, string[]>,
) {
  const byLabel = new Map<string, Array<{ rating: number; status: string }>>();

  for (const review of reviews) {
    const labels = review.locationName
      ? labelsByLocationName.get(review.locationName)
      : undefined;
    const labelNames = labels && labels.length > 0 ? labels : ["Unlabeled"];

    for (const label of labelNames) {
      const bucket = byLabel.get(label) ?? [];
      bucket.push({ rating: review.rating, status: review.status });
      byLabel.set(label, bucket);
    }
  }

  return [...byLabel.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([listingName, rows]) => {
      const ratings = rows.map((row) => row.rating);
      const positiveCount = ratings.filter((rating) => rating >= 4).length;
      const negativeCount = ratings.length - positiveCount;

      return {
        listingName,
        reviews: rows.length,
        rating: calculateAverageRating(ratings),
        positivePercent:
          rows.length === 0
            ? 0
            : Math.round((positiveCount / rows.length) * 1000) / 10,
        positiveCount,
        negativePercent:
          rows.length === 0
            ? 0
            : Math.round((negativeCount / rows.length) * 1000) / 10,
        negativeCount,
        replyRate: calculateReplyRate(rows),
        repliedCount: rows.filter((row) => row.status === "replied").length,
      };
    });
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
    const listing = escapeRegex(filters.listing);
    mongoFilter.$or = [
      { locationName: { $regex: listing, $options: "i" } },
      { listingName: { $regex: listing, $options: "i" } },
    ];
  }

  let reviews = await Review.find(mongoFilter);

  if (filters.label) {
    const locations = await Location.find({
      tenantId,
      labels: { $regex: escapeRegex(filters.label), $options: "i" },
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
  labelsByLocationName: Map<string, string[]>,
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
    labelsBreakdown: buildLabelBreakdown(reviews, labelsByLocationName),
  };
}

export async function getReviewAnalyticsDashboard(
  tenantId: string,
  query: ReviewAnalyticsQuery,
): Promise<ReviewAnalytics> {
  const { start, end, previousStart, previousEnd, filters } =
    parseAnalyticsDateRange(query, reviewAnalyticsQuerySchema);

  const [currentReviews, previousReviews] = await Promise.all([
    loadReviews(tenantId, { start, end }, filters),
    loadReviews(
      tenantId,
      { start: previousStart, end: previousEnd },
      filters,
    ),
  ]);
  const locations = await Location.find({ tenantId });
  const labelsByLocationName = new Map(
    locations.map((location) => [location.name, location.labels ?? []]),
  );

  const current = summarize(currentReviews, labelsByLocationName);
  const previous = summarize(previousReviews, labelsByLocationName);

  return reviewAnalyticsSchema.parse({
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
  });
}
