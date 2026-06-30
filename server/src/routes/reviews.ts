import type { Request, Response } from "express";
import {
  generateRepliesRequestSchema,
  generateRepliesResponseSchema,
  importReviewsRequestSchema,
  importReviewsResponseSchema,
  replyReviewRequestSchema,
  reviewListQuerySchema,
  reviewSchema,
} from "@feedback-platform/shared";
import { Location } from "../models/location.js";
import { Review } from "../models/review.js";
import {
  canReplyToReview,
  defaultStatusForSource,
  parseReviewCsv,
} from "../services/reviews.js";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import type { OpenAiClient } from "../auth/openai.js";
import { postGoogleReviewReply } from "../services/googleReviews.js";
import { applyAutoReplyRules } from "../services/autoReplyRules.js";

function toReviewResponse(review: {
  _id: { toString(): string };
  source: "google" | "foodpanda";
  reviewerName: string;
  rating: number;
  content: string;
  locationName?: string | null;
  listingName?: string | null;
  categories?: string[] | null;
  status: "not_replied" | "replied" | "reply_not_supported";
  replyText?: string | null;
  postedAt: Date;
  createdAt: Date;
}) {
  return reviewSchema.parse({
    id: review._id.toString(),
    source: review.source,
    reviewerName: review.reviewerName,
    rating: review.rating,
    content: review.content,
    locationName: review.locationName ?? null,
    listingName: review.listingName ?? null,
    categories: review.categories ?? [],
    status: review.status,
    replyText: review.replyText ?? null,
    postedAt: review.postedAt.toISOString(),
    createdAt: review.createdAt.toISOString(),
    canReply: canReplyToReview({
      source: review.source,
      status: review.status,
    }),
  });
}

function buildReviewFilter(tenantId: string, query: Record<string, unknown>) {
  const filters = reviewListQuerySchema.parse(query);
  const mongoFilter: Record<string, unknown> = { tenantId };

  if (filters.directory) mongoFilter.source = filters.directory;
  if (filters.rating) mongoFilter.rating = filters.rating;
  if (filters.listing) {
    mongoFilter.$or = [
      { locationName: { $regex: filters.listing, $options: "i" } },
      { listingName: { $regex: filters.listing, $options: "i" } },
    ];
  }
  if (filters.content) {
    mongoFilter.content = { $regex: filters.content, $options: "i" };
  }
  if (filters.startDate || filters.endDate) {
    mongoFilter.postedAt = {
      ...(filters.startDate ? { $gte: new Date(filters.startDate) } : {}),
      ...(filters.endDate ? { $lte: new Date(filters.endDate) } : {}),
    };
  }

  return mongoFilter;
}

function requireAiReplies(req: Request, res: Response) {
  if (!req.tenant?.featureFlags.aiReplies) {
    res.status(403).json({ error: "AI replies not enabled" });
    return false;
  }
  return true;
}

export function createReviewRoutes(
  googleClient?: GoogleBusinessClient,
  openAiClient?: OpenAiClient,
) {
  return {
    async list(req: Request, res: Response) {
      const reviews = await Review.find(
        buildReviewFilter(req.tenant!.id, req.query),
      ).sort({ postedAt: -1 });
      res.json(reviews.map(toReviewResponse));
    },

    async importCsv(req: Request, res: Response) {
      const input = importReviewsRequestSchema.parse(req.body);
      const rows = parseReviewCsv(input.csv);
      let imported = 0;

      for (const row of rows) {
        const rating = Number(row.rating);
        if (!row.reviewerName || !row.content || Number.isNaN(rating)) {
          continue;
        }

        let locationId;
        if (row.locationName) {
          const location = await Location.findOne({
            tenantId: req.tenant!.id,
            name: row.locationName,
          });
          locationId = location?._id;
        }

        const review = await Review.create({
          tenantId: req.tenant!.id,
          source: input.source,
          reviewerName: row.reviewerName,
          rating,
          content: row.content,
          locationId,
          locationName: row.locationName || undefined,
          listingName: row.listingName || row.locationName || undefined,
          categories: row.categories
            ? row.categories.split("|").map((item) => item.trim())
            : [],
          status: defaultStatusForSource(input.source),
          postedAt: row.postedAt ? new Date(row.postedAt) : new Date(),
        });
        await applyAutoReplyRules({
          tenantId: req.tenant!.id,
          review,
          googleClient,
        });
        imported += 1;
      }

      res.status(201).json(importReviewsResponseSchema.parse({ imported }));
    },

    async reply(req: Request, res: Response) {
      const input = replyReviewRequestSchema.parse(req.body);
      const review = await Review.findOne({
        _id: req.params.reviewId,
        tenantId: req.tenant!.id,
      });

      if (!review) {
        res.status(404).json({ error: "Review not found" });
        return;
      }

      if (!canReplyToReview({ source: review.source, status: review.status })) {
        res.status(400).json({ error: "Reply not supported for this review" });
        return;
      }

      if (review.source === "google" && review.externalId && googleClient) {
        try {
          await postGoogleReviewReply({
            tenantId: req.tenant!.id,
            reviewExternalId: review.externalId,
            replyText: input.replyText,
            client: googleClient,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Google reply failed";
          res.status(502).json({ error: message });
          return;
        }
      }

      review.status = "replied";
      review.replyText = input.replyText;
      review.repliedAt = new Date();
      await review.save();

      res.json(toReviewResponse(review));
    },

    async generateReplies(req: Request, res: Response) {
      if (!requireAiReplies(req, res)) return;
      if (!openAiClient) {
        res.status(503).json({ error: "OpenAI client not configured" });
        return;
      }

      const input = generateRepliesRequestSchema.parse(req.body);
      const reviews = await Review.find({
        _id: { $in: input.reviewIds },
        tenantId: req.tenant!.id,
        status: "not_replied",
      });

      if (reviews.length === 0) {
        res.status(400).json({ error: "No unreplied reviews found" });
        return;
      }

      try {
        const drafts = await openAiClient.generateReviewReplies({
          reviews: reviews.map((review) => ({
            id: review._id.toString(),
            content: review.content,
            rating: review.rating,
            reviewerName: review.reviewerName,
          })),
        });

        res.json(
          generateRepliesResponseSchema.parse({
            drafts: drafts.map((draft) => ({
              reviewId: draft.reviewId,
              draftReply: draft.draftReply,
            })),
          }),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Reply generation failed";
        res.status(502).json({ error: message });
      }
    },

    async exportCsv(req: Request, res: Response) {
      const reviews = await Review.find(
        buildReviewFilter(req.tenant!.id, req.query),
      ).sort({ postedAt: -1 });

      const lines = [
        "Source,Reviewer,Rating,Status,Content,Location,Posted At,Reply",
      ];
      for (const review of reviews) {
        lines.push(
          [
            review.source,
            review.reviewerName,
            review.rating,
            review.status,
            `"${review.content.replaceAll('"', '""')}"`,
            review.locationName ?? "",
            review.postedAt.toISOString(),
            review.replyText ?? "",
          ].join(","),
        );
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="reviews.csv"',
      );
      res.send(lines.join("\n"));
    },
  };
}
