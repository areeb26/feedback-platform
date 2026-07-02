import type { Request, Response } from "express";
import {
  createReviewRequestSchema,
  generateRepliesRequestSchema,
  generateRepliesResponseSchema,
  importReviewsRequestSchema,
  importReviewsResponseSchema,
  replyReviewRequestSchema,
  reviewListQuerySchema,
  reviewSchema,
} from "@feedback-platform/shared";
import { Review } from "../models/review.js";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import type { OpenAiClient } from "../auth/openai.js";
import {
  createNoopExpoPushClient,
  type ExpoPushClient,
} from "../services/expoPush.js";
import {
  GoogleReviewReplyError,
  createManualReview,
  importReviewsFromCsv,
  replyToReview,
  ReviewReplyNotSupportedError,
} from "../services/reviewLifecycle.js";
import {
  buildReviewExternalId,
  canReplyToReview,
  defaultStatusForSource,
  formatCsvField,
} from "../services/reviews.js";
import { escapeRegex } from "../services/text.js";

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
  externalId?: string | null;
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
      externalId: review.externalId,
    }),
  });
}

function buildReviewFilter(tenantId: string, query: Record<string, unknown>) {
  const filters = reviewListQuerySchema.parse(query);
  const mongoFilter: Record<string, unknown> = { tenantId };

  if (filters.directory) mongoFilter.source = filters.directory;
  if (filters.rating) mongoFilter.rating = filters.rating;
  if (filters.listing) {
    const listingRegex = escapeRegex(filters.listing);
    mongoFilter.$or = [
      { locationName: { $regex: listingRegex, $options: "i" } },
      { listingName: { $regex: listingRegex, $options: "i" } },
    ];
  }
  if (filters.content) {
    mongoFilter.content = { $regex: escapeRegex(filters.content), $options: "i" };
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
  expoPushClient: ExpoPushClient = createNoopExpoPushClient(),
) {
  return {
    async list(req: Request, res: Response) {
      const reviews = await Review.find(
        buildReviewFilter(req.tenant!.id, req.query),
      ).sort({ postedAt: -1 });
      res.json(reviews.map(toReviewResponse));
    },

    async get(req: Request, res: Response) {
      const review = await Review.findOne({
        _id: req.params.reviewId,
        tenantId: req.tenant!.id,
      });
      if (!review) {
        res.status(404).json({ error: "Review not found" });
        return;
      }
      res.json(toReviewResponse(review));
    },

    async create(req: Request, res: Response) {
      const input = createReviewRequestSchema.parse(req.body);
      const review = await createManualReview({
        tenantId: req.tenant!.id,
        ...input,
      });
      res.status(201).json(toReviewResponse(review));
    },

    async importCsv(req: Request, res: Response) {
      const input = importReviewsRequestSchema.parse(req.body);
      const result = await importReviewsFromCsv({
        tenantId: req.tenant!.id,
        source: input.source,
        csv: input.csv,
        googleClient,
        expoPushClient,
      });
      res.status(201).json(importReviewsResponseSchema.parse(result));
    },

    async reply(req: Request, res: Response) {
      const input = replyReviewRequestSchema.parse(req.body);

      try {
        const review = await replyToReview({
          tenantId: req.tenant!.id,
          reviewId: String(req.params.reviewId),
          replyText: input.replyText,
          googleClient,
        });

        if (!review) {
          res.status(404).json({ error: "Review not found" });
          return;
        }

        res.json(toReviewResponse(review));
      } catch (error) {
        if (error instanceof ReviewReplyNotSupportedError) {
          res.status(400).json({ error: error.message });
          return;
        }
        if (error instanceof GoogleReviewReplyError) {
          res.status(502).json({ error: error.message });
          return;
        }
        throw error;
      }
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
            review.content,
            review.locationName ?? "",
            review.postedAt.toISOString(),
            review.replyText ?? "",
          ].map(formatCsvField).join(","),
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
