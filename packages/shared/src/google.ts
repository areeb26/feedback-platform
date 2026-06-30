import { z } from "zod";

export const googleConnectionStatusSchema = z.enum([
  "disconnected",
  "connected",
  "expired",
  "error",
]);

export type GoogleConnectionStatus = z.infer<
  typeof googleConnectionStatusSchema
>;

export const googleConnectionSchema = z.object({
  status: googleConnectionStatusSchema,
  accountId: z.string().nullable(),
  reviewCount: z.number().int().nonnegative(),
  averageRating: z.number(),
  errorMessage: z.string().nullable(),
  connectedAt: z.string().nullable(),
});

export type GoogleConnection = z.infer<typeof googleConnectionSchema>;

export const googleConnectStartRequestSchema = z.object({
  redirectUri: z.string().url(),
});

export const googleConnectStartResponseSchema = z.object({
  authUrl: z.string().url(),
  state: z.string(),
});

export const googleConnectCallbackRequestSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().min(1),
});

export const googleSyncResponseSchema = z.object({
  imported: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
});

export type GoogleSyncResponse = z.infer<typeof googleSyncResponseSchema>;

export const thirdPartyReviewSummarySchema = z.object({
  source: z.enum(["google", "foodpanda"]),
  name: z.string(),
  reviewCount: z.number().int().nonnegative(),
  averageRating: z.number(),
  trend: z.number(),
  connected: z.boolean(),
  errorMessage: z.string().nullable(),
});

export type ThirdPartyReviewSummary = z.infer<
  typeof thirdPartyReviewSummarySchema
>;
