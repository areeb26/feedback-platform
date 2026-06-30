import {
  PERFORMANCE_CATEGORIES,
  type CompetitorAnalytics,
} from "@feedback-platform/shared";
import type { GooglePlacesClient } from "../auth/googlePlaces.js";
import { Competitor } from "../models/competitor.js";
import { Listing } from "../models/listing.js";

export function ratingToSmileScore(rating: number | null | undefined) {
  if (rating == null || rating <= 0) {
    return null;
  }
  return Math.round(rating * 20);
}

function toCompetitorResponse(competitor: {
  _id: { toString(): string };
  name: string;
  placeId: string;
  rating?: number | null;
  reviewCount?: number | null;
  lastRefreshedAt?: Date | null;
}) {
  return {
    id: competitor._id.toString(),
    name: competitor.name,
    placeId: competitor.placeId,
    rating: competitor.rating ?? null,
    reviewCount: competitor.reviewCount ?? null,
    lastRefreshedAt: competitor.lastRefreshedAt?.toISOString() ?? null,
  };
}

export async function listCompetitors(tenantId: string) {
  const competitors = await Competitor.find({ tenantId }).sort({ name: 1 });
  return competitors.map(toCompetitorResponse);
}

export async function createCompetitor(
  tenantId: string,
  input: { name: string; placeId: string },
  client?: GooglePlacesClient,
) {
  const competitor = await Competitor.create({
    tenantId,
    name: input.name,
    placeId: input.placeId,
  });

  if (client) {
    try {
      const details = await client.getPlaceDetails(input.placeId);
      competitor.name = details.name || competitor.name;
      competitor.rating = details.rating;
      competitor.reviewCount = details.reviewCount;
      competitor.lastRefreshedAt = new Date();
      await competitor.save();
    } catch {
      // Keep competitor without Places data if lookup fails
    }
  }

  return toCompetitorResponse(competitor);
}

export async function updateCompetitor(
  tenantId: string,
  competitorId: string,
  input: { name?: string; placeId?: string },
  client?: GooglePlacesClient,
) {
  const competitor = await Competitor.findOne({
    _id: competitorId,
    tenantId,
  });
  if (!competitor) {
    return null;
  }

  const placeIdChanged =
    input.placeId !== undefined && input.placeId !== competitor.placeId;

  if (input.name !== undefined) {
    competitor.name = input.name;
  }
  if (input.placeId !== undefined) {
    competitor.placeId = input.placeId;
  }

  if (placeIdChanged && client) {
    try {
      const details = await client.getPlaceDetails(competitor.placeId);
      competitor.name = details.name || competitor.name;
      competitor.rating = details.rating;
      competitor.reviewCount = details.reviewCount;
      competitor.lastRefreshedAt = new Date();
    } catch {
      competitor.rating = null;
      competitor.reviewCount = null;
      competitor.lastRefreshedAt = null;
    }
  }

  await competitor.save();
  return toCompetitorResponse(competitor);
}

export async function deleteCompetitor(tenantId: string, competitorId: string) {
  const result = await Competitor.findOneAndDelete({
    _id: competitorId,
    tenantId,
  });
  return result != null;
}

export async function refreshCompetitors(input: {
  tenantId: string;
  client: GooglePlacesClient;
}) {
  const competitors = await Competitor.find({ tenantId: input.tenantId });
  let refreshed = 0;
  let failed = 0;

  for (const competitor of competitors) {
    try {
      const details = await input.client.getPlaceDetails(competitor.placeId);
      competitor.name = details.name || competitor.name;
      competitor.rating = details.rating;
      competitor.reviewCount = details.reviewCount;
      competitor.lastRefreshedAt = new Date();
      await competitor.save();
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }

  return { refreshed, failed };
}

async function getOwnBusinessListing(tenantId: string) {
  const listings = await Listing.find({
    tenantId,
    directory: "google",
  }).sort({ rating: -1, reviewCount: -1 });

  return listings[0] ?? null;
}

function buildRankInfo(
  scores: Array<{ name: string; score: number | null; isOwnBusiness: boolean }>,
) {
  const ranked = scores
    .filter((entry) => entry.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (ranked.length === 0) {
    return { rank: null, leaderName: null, isLeading: false };
  }

  const ownIndex = ranked.findIndex((entry) => entry.isOwnBusiness);
  const leader = ranked[0]!;

  if (ownIndex === -1) {
    return { rank: null, leaderName: leader.name, isLeading: false };
  }

  return {
    rank: ownIndex + 1,
    leaderName: leader.name,
    isLeading: ownIndex === 0,
  };
}

export async function getCompetitorAnalytics(input: {
  tenantId: string;
  tenantName: string;
  competitorIds?: string[];
  search?: string;
}): Promise<CompetitorAnalytics> {
  const filter: Record<string, unknown> = { tenantId: input.tenantId };
  if (input.competitorIds?.length) {
    filter._id = { $in: input.competitorIds };
  }
  if (input.search) {
    filter.name = { $regex: input.search, $options: "i" };
  }

  const competitors = await Competitor.find(filter).sort({ name: 1 });
  const ownListing = await getOwnBusinessListing(input.tenantId);
  const ownBusinessName = ownListing?.name ?? input.tenantName;
  const ownScore = ratingToSmileScore(ownListing?.rating);
  const ownReviewCount = ownListing?.reviewCount ?? null;

  const columns = [
    {
      id: "own",
      name: ownBusinessName,
      isOwnBusiness: true,
    },
    ...competitors.map((competitor) => ({
      id: competitor._id.toString(),
      name: competitor.name,
      isOwnBusiness: false,
    })),
  ];

  const columnScores = [
    {
      name: ownBusinessName,
      score: ownScore,
      reviewCount: ownReviewCount,
      isOwnBusiness: true,
    },
    ...competitors.map((competitor) => ({
      name: competitor.name,
      score: ratingToSmileScore(competitor.rating),
      reviewCount: competitor.reviewCount ?? null,
      isOwnBusiness: false,
    })),
  ];

  const categories = PERFORMANCE_CATEGORIES.map((category) => {
    const rankInfo = buildRankInfo(columnScores);
    return {
      category,
      rank: rankInfo.rank,
      leaderName: rankInfo.leaderName,
      isLeading: rankInfo.isLeading,
      cells: columnScores.map((entry) => ({
        score: entry.score,
        reviewCount: entry.reviewCount,
      })),
    };
  });

  return {
    ownBusinessName,
    columns,
    categories,
  };
}
