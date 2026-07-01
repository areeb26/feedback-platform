import { z } from "zod";

export const generateRepliesRequestSchema = z.object({
  reviewIds: z.array(z.string()).min(1).max(20),
});

export type GenerateRepliesRequest = z.infer<typeof generateRepliesRequestSchema>;

export const generateRepliesDraftSchema = z.object({
  reviewId: z.string(),
  draftReply: z.string(),
});

export const generateRepliesResponseSchema = z.object({
  drafts: z.array(generateRepliesDraftSchema),
});

export type GenerateRepliesResponse = z.infer<typeof generateRepliesResponseSchema>;

export const autoReplyRuleSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  maxRating: z.number().int().min(1).max(5),
  templateText: z.string().min(1),
  enabled: z.boolean(),
});

export type AutoReplyRule = z.infer<typeof autoReplyRuleSchema>;

export const createAutoReplyRuleRequestSchema = z.object({
  name: z.string().optional(),
  maxRating: z.number().int().min(1).max(5),
  templateText: z.string().min(1),
  enabled: z.boolean().optional(),
});

export type CreateAutoReplyRuleRequest = z.infer<
  typeof createAutoReplyRuleRequestSchema
>;

export const updateAutoReplyRuleRequestSchema = z.object({
  name: z.string().nullable().optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  templateText: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateAutoReplyRuleRequest = z.infer<
  typeof updateAutoReplyRuleRequestSchema
>;
