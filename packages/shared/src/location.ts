import { z } from "zod";

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  labels: z.array(z.string()),
});

export type Location = z.infer<typeof locationSchema>;

export const createLocationRequestSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;

export const updateLocationRequestSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;

export const tenantFeatureFlagsSchema = z.object({
  socialListening: z.boolean(),
  competitorAnalytics: z.boolean(),
  aiReplies: z.boolean(),
  googleReviews: z.boolean(),
});

export type TenantFeatureFlags = z.infer<typeof tenantFeatureFlagsSchema>;

export const tenantShellSchema = z.object({
  slug: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  primaryColor: z.string(),
  featureFlags: tenantFeatureFlagsSchema,
});

export type TenantShell = z.infer<typeof tenantShellSchema>;
