import type { Request, Response } from "express";
import {
  importReviewsRequestSchema,
  importReviewsResponseSchema,
  replyReviewRequestSchema,
  reviewListQuerySchema,
  reviewSchema,
} from "@feedback-platform/shared";
import { Location } from "../models/location.js";
import { Review } from "../models/review.js";
import {
  buildReviewExternalId,
  canReplyToReview,
  defaultStatusForSource,
  formatCsvField,
  parseReviewCsv,
} from "../services/reviews.js";

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createReviewRoutes() {
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

        const externalId = buildReviewExternalId(input.source, row);
        const existingReview = await Review.findOne({
          tenantId: req.tenant!.id,
          source: input.source,
          externalId,
        });
        if (existingReview) {
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

        await Review.create({
          tenantId: req.tenant!.id,
          source: input.source,
          externalId,
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

      review.status = "replied";
      review.replyText = input.replyText;
      review.repliedAt = new Date();
      await review.save();

      res.json(toReviewResponse(review));
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
