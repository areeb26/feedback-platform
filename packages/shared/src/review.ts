import { z } from "zod";

export const reviewSourceSchema = z.enum(["google", "foodpanda"]);
export type ReviewSource = z.infer<typeof reviewSourceSchema>;

export const reviewStatusSchema = z.enum([
  "not_replied",
  "replied",
  "reply_not_supported",
]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  source: reviewSourceSchema,
  reviewerName: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string(),
  locationName: z.string().nullable(),
  listingName: z.string().nullable(),
  categories: z.array(z.string()),
  status: reviewStatusSchema,
  replyText: z.string().nullable(),
  postedAt: z.string(),
  createdAt: z.string(),
  canReply: z.boolean(),
});

export type Review = z.infer<typeof reviewSchema>;

export const reviewListQuerySchema = z.object({
  directory: reviewSourceSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  listing: z.string().optional(),
  content: z.string().optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
});

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const importReviewsRequestSchema = z.object({
  source: reviewSourceSchema,
  csv: z.string().min(1),
});

export type ImportReviewsRequest = z.infer<typeof importReviewsRequestSchema>;

export const importReviewsResponseSchema = z.object({
  imported: z.number().int().nonnegative(),
});

export type ImportReviewsResponse = z.infer<typeof importReviewsResponseSchema>;

export const replyReviewRequestSchema = z.object({
  replyText: z.string().min(1),
});

export type ReplyReviewRequest = z.infer<typeof replyReviewRequestSchema>;
