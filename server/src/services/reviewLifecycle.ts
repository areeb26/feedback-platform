import type { ReviewSource } from "@feedback-platform/shared";
import { Location } from "../models/location.js";
import { Review } from "../models/review.js";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import type { ExpoPushClient } from "./expoPush.js";
import { applyAutoReplyRules } from "./autoReplyRules.js";
import { postGoogleReviewReply } from "./googleReviews.js";
import { notifyUnrepliedReview } from "./pushNotifications.js";
import {
  buildReviewExternalId,
  canReplyToReview,
  defaultStatusForSource,
  parseReviewCsv,
} from "./reviews.js";

const MAX_IMPORT_ROWS = 1000;

export class ReviewReplyNotSupportedError extends Error {
  constructor() {
    super("Reply not supported for this review");
    this.name = "ReviewReplyNotSupportedError";
  }
}

export class GoogleReviewReplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleReviewReplyError";
  }
}

export async function importReviewsFromCsv(input: {
  tenantId: string;
  source: ReviewSource;
  csv: string;
  googleClient?: GoogleBusinessClient;
  expoPushClient?: ExpoPushClient;
}) {
  const rows = parseReviewCsv(input.csv).slice(0, MAX_IMPORT_ROWS);
  const locationNames = [
    ...new Set(
      rows
        .map((row) => row.locationName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const locations = await Location.find({
    tenantId: input.tenantId,
    name: { $in: locationNames },
  });
  const locationIdByName = new Map(
    locations.map((location) => [location.name, location._id]),
  );

  const candidates = [];
  for (const row of rows) {
    const rating = Number(row.rating);
    if (
      !row.reviewerName ||
      !row.content ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      continue;
    }

    const postedAt = row.postedAt ? new Date(row.postedAt) : new Date();
    if (Number.isNaN(postedAt.getTime())) {
      continue;
    }

    const externalId = buildReviewExternalId(input.source, row);
    candidates.push({
      tenantId: input.tenantId,
      source: input.source,
      externalId,
      reviewerName: row.reviewerName,
      rating,
      content: row.content,
      locationId: row.locationName
        ? locationIdByName.get(row.locationName)
        : undefined,
      locationName: row.locationName || undefined,
      listingName: row.listingName || row.locationName || undefined,
      categories: row.categories
        ? row.categories.split("|").map((item) => item.trim())
        : [],
      status: defaultStatusForSource(input.source),
      postedAt,
    });
  }

  const existingReviews = await Review.find({
    tenantId: input.tenantId,
    source: input.source,
    externalId: { $in: candidates.map((review) => review.externalId) },
  }).select("externalId");
  const existingIds = new Set(
    existingReviews
      .map((review) => review.externalId)
      .filter((externalId): externalId is string => Boolean(externalId)),
  );
  const newReviews = candidates.filter(
    (review) => !existingIds.has(review.externalId),
  );

  if (newReviews.length > 0) {
    const insertedReviews = await Review.insertMany(newReviews);
    for (const review of insertedReviews) {
      await applyAutoReplyRules({
        tenantId: input.tenantId,
        review,
        googleClient: input.googleClient,
      });
      if (review.status === "not_replied" && input.expoPushClient) {
        await notifyUnrepliedReview(
          input.expoPushClient,
          input.tenantId,
          review._id.toString(),
          review.reviewerName,
        );
      }
    }
  }

  return { imported: newReviews.length };
}

export async function replyToReview(input: {
  tenantId: string;
  reviewId: string;
  replyText: string;
  googleClient?: GoogleBusinessClient;
}) {
  const review = await Review.findOne({
    _id: input.reviewId,
    tenantId: input.tenantId,
  });

  if (!review) {
    return null;
  }

  if (
    !canReplyToReview({
      source: review.source,
      status: review.status,
      externalId: review.externalId,
    })
  ) {
    throw new ReviewReplyNotSupportedError();
  }

  if (review.source === "google" && input.googleClient) {
    try {
      await postGoogleReviewReply({
        tenantId: input.tenantId,
        reviewExternalId: review.externalId,
        replyText: input.replyText,
        client: input.googleClient,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google reply failed";
      throw new GoogleReviewReplyError(message);
    }
  }

  review.status = "replied";
  review.replyText = input.replyText;
  review.repliedAt = new Date();
  await review.save();

  return review;
}

export async function createManualReview(input: {
  tenantId: string;
  source: ReviewSource;
  reviewerName: string;
  rating: number;
  content: string;
  locationName?: string;
  listingName?: string;
  postedAt?: string;
}) {
  const location = input.locationName
    ? await Location.findOne({
        tenantId: input.tenantId,
        name: input.locationName,
      })
    : null;

  const postedAt = input.postedAt ? new Date(input.postedAt) : new Date();
  const externalId = buildReviewExternalId(input.source, {
    reviewerName: input.reviewerName,
    rating: String(input.rating),
    content: input.content,
    locationName: input.locationName ?? "",
    listingName: input.listingName ?? "",
    postedAt: postedAt.toISOString(),
  });

  const existing = await Review.findOne({
    tenantId: input.tenantId,
    source: input.source,
    externalId,
  });
  if (existing) {
    return existing;
  }

  return Review.create({
    tenantId: input.tenantId,
    source: input.source,
    externalId,
    reviewerName: input.reviewerName,
    rating: input.rating,
    content: input.content,
    locationId: location?._id,
    locationName: input.locationName,
    listingName: input.listingName ?? input.locationName,
    categories: [],
    status: defaultStatusForSource(input.source),
    postedAt,
  });
}
