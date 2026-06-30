import { z } from "zod";

export const tenantProfileSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export type TenantProfile = z.infer<typeof tenantProfileSchema>;

export const createTenantRequestSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  primaryColor: z.string().min(1),
  adminEmail: z.string().email(),
  logoUrl: z.string().url().optional(),
});

export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;

export const updateTenantRequestSchema = z.object({
  name: z.string().min(1).optional(),
  primaryColor: z.string().min(1).optional(),
  logoUrl: z.string().url().nullable().optional(),
  status: z.enum(["active", "suspended"]).optional(),
  featureFlags: z
    .object({
      socialListening: z.boolean().optional(),
      competitorAnalytics: z.boolean().optional(),
      aiReplies: z.boolean().optional(),
      googleReviews: z.boolean().optional(),
    })
    .optional(),
});

export type UpdateTenantRequest = z.infer<typeof updateTenantRequestSchema>;

export const tenantUsageSchema = z.object({
  surveys: z.number().int().nonnegative(),
  submissions: z.number().int().nonnegative(),
  users: z.number().int().nonnegative(),
});

export const adminTenantSchema = z.object({
  slug: z.string(),
  name: z.string(),
  status: z.enum(["active", "suspended"]),
  primaryColor: z.string(),
  logoUrl: z.string().nullable(),
  usage: tenantUsageSchema,
});

export type AdminTenant = z.infer<typeof adminTenantSchema>;
