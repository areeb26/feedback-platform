import { z } from "zod";

export const registerPushTokenRequestSchema = z.object({
  token: z.string().min(1),
});

export type RegisterPushTokenRequest = z.infer<
  typeof registerPushTokenRequestSchema
>;

export const registerPushTokenResponseSchema = z.object({
  ok: z.literal(true),
});

export type RegisterPushTokenResponse = z.infer<
  typeof registerPushTokenResponseSchema
>;
