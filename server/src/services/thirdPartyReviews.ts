import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { GoogleConnection } from "../models/googleConnection.js";
import { Review } from "../models/review.js";
import {
  ensureAccessToken,
  toGoogleConnectionResponse,
} from "./googleReviews.js";

function averageRating(ratings: number[]) {
  if (ratings.length === 0) {
    return 0;
  }
  return (
    Math.round(
      (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10,
    ) / 10
  );
}

async function summarizeSource(
  tenantId: string,
  source: "google" | "foodpanda",
) {
  const reviews = await Review.find({ tenantId, source });
  const ratings = reviews.map((review) => review.rating);
  return {
    reviewCount: reviews.length,
    averageRating: averageRating(ratings),
  };
}

export async function getThirdPartyReviewSummaries(input: {
  tenantId: string;
  googleClient?: GoogleBusinessClient;
}) {
  const foodpanda = await summarizeSource(input.tenantId, "foodpanda");
  const connection = await GoogleConnection.findOne({
    tenantId: input.tenantId,
  });
  const connectionView = toGoogleConnectionResponse(connection);

  let googleSummary = {
    reviewCount: connectionView.reviewCount,
    averageRating: connectionView.averageRating,
    connected: connectionView.status === "connected",
    errorMessage: connectionView.errorMessage,
  };

  if (connection && connectionView.status === "connected" && input.googleClient) {
    try {
      const accessToken = await ensureAccessToken(connection, input.googleClient);
      const summary = await input.googleClient.getSummary({
        accessToken,
        accountId: connection.accountId,
      });
      googleSummary = {
        reviewCount: summary.reviewCount,
        averageRating: summary.averageRating,
        connected: true,
        errorMessage: null,
      };
    } catch {
      const fallback = await summarizeSource(input.tenantId, "google");
      googleSummary = {
        reviewCount: fallback.reviewCount,
        averageRating: fallback.averageRating,
        connected: false,
        errorMessage: connectionView.errorMessage ?? "Google connection error",
      };
    }
  } else if (connectionView.status !== "connected") {
    const fallback = await summarizeSource(input.tenantId, "google");
    googleSummary = {
      reviewCount: fallback.reviewCount,
      averageRating: fallback.averageRating,
      connected: false,
      errorMessage: connectionView.errorMessage,
    };
  }

  return [
    {
      source: "google" as const,
      name: "Google",
      reviewCount: googleSummary.reviewCount,
      averageRating: googleSummary.averageRating,
      trend: 0,
      connected: googleSummary.connected,
      errorMessage: googleSummary.errorMessage,
    },
    {
      source: "foodpanda" as const,
      name: "Food Panda",
      reviewCount: foodpanda.reviewCount,
      averageRating: foodpanda.averageRating,
      trend: 0,
      connected: foodpanda.reviewCount > 0,
      errorMessage: null,
    },
  ];
}
