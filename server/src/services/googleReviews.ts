import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { GoogleConnection } from "../models/googleConnection.js";
import { Review } from "../models/review.js";

type PersistedGoogleConnection = {
  _id: { toString(): string };
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  status: "connected" | "expired" | "error";
  errorMessage?: string | null;
  save(): Promise<unknown>;
};

export async function getGoogleConnection(tenantId: string) {
  return GoogleConnection.findOne({ tenantId });
}

export async function ensureAccessToken(
  connection: PersistedGoogleConnection,
  client: GoogleBusinessClient,
) {
  if (connection.expiresAt.getTime() > Date.now() + 60_000) {
    return connection.accessToken;
  }

  try {
    const refreshed = await client.refreshAccessToken(connection.refreshToken);
    connection.accessToken = refreshed.accessToken;
    connection.expiresAt = refreshed.expiresAt;
    connection.status = "connected";
    connection.errorMessage = undefined;
    await connection.save();
    return connection.accessToken;
  } catch (error) {
    connection.status = "expired";
    connection.errorMessage =
      error instanceof Error ? error.message : "Token refresh failed";
    await connection.save();
    throw error;
  }
}

export async function syncGoogleReviews(input: {
  tenantId: string;
  client: GoogleBusinessClient;
}) {
  const connection = await getGoogleConnection(input.tenantId);
  if (!connection) {
    throw new Error("Google account not connected");
  }

  const accessToken = await ensureAccessToken(connection, input.client);
  const reviews = await input.client.listReviews({
    accessToken,
    accountId: connection.accountId,
  });

  let imported = 0;
  let updated = 0;

  for (const review of reviews) {
    const existing = await Review.findOne({
      tenantId: input.tenantId,
      source: "google",
      externalId: review.externalId,
    });

    if (existing) {
      existing.reviewerName = review.reviewerName;
      existing.rating = review.rating;
      existing.content = review.content;
      existing.locationName = review.locationName;
      existing.listingName = review.locationName;
      existing.postedAt = review.postedAt;
      await existing.save();
      updated += 1;
      continue;
    }

    await Review.create({
      tenantId: input.tenantId,
      source: "google",
      externalId: review.externalId,
      reviewerName: review.reviewerName,
      rating: review.rating,
      content: review.content,
      locationName: review.locationName,
      listingName: review.locationName,
      status: "not_replied",
      postedAt: review.postedAt,
    });
    imported += 1;
  }

  const summary = await input.client.getSummary({
    accessToken,
    accountId: connection.accountId,
  });
  connection.reviewCount = summary.reviewCount;
  connection.averageRating = summary.averageRating;
  connection.status = "connected";
  connection.errorMessage = undefined;
  await connection.save();

  return { imported, updated };
}

export async function postGoogleReviewReply(input: {
  tenantId: string;
  reviewExternalId: string;
  replyText: string;
  client: GoogleBusinessClient;
}) {
  const connection = await getGoogleConnection(input.tenantId);
  if (!connection) {
    throw new Error("Google account not connected");
  }

  const accessToken = await ensureAccessToken(connection, input.client);
  await input.client.postReply({
    accessToken,
    accountId: connection.accountId,
    reviewExternalId: input.reviewExternalId,
    replyText: input.replyText,
  });
}

export function toGoogleConnectionResponse(connection: {
  status: "connected" | "expired" | "error";
  accountId: string;
  reviewCount?: number | null;
  averageRating?: number | null;
  errorMessage?: string | null;
  createdAt: Date;
} | null) {
  if (!connection) {
    return {
      status: "disconnected" as const,
      accountId: null,
      reviewCount: 0,
      averageRating: 0,
      errorMessage: null,
      connectedAt: null,
    };
  }

  return {
    status: connection.status,
    accountId: connection.accountId,
    reviewCount: connection.reviewCount ?? 0,
    averageRating: connection.averageRating ?? 0,
    errorMessage: connection.errorMessage ?? null,
    connectedAt: connection.createdAt.toISOString(),
  };
}
