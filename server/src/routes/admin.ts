import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import {
  adminTenantSchema,
  createTenantRequestSchema,
  createTenantResponseSchema,
  tenantFeatureFlagsSchema,
  updateTenantRequestSchema,
} from "@feedback-platform/shared";
import type { ClerkAdminClient } from "../auth/clerkAdmin.js";
import type { AuthContext } from "../types.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { Tenant } from "../models/tenant.js";

async function getTenantUsage(_tenantId: string) {
  return { surveys: 0, submissions: 0, users: 0 };
}

function toAdminTenant(tenant: {
  slug: string;
  name: string;
  status: "active" | "suspended";
  primaryColor: string;
  logoUrl?: string | null;
  featureFlags?: {
    socialListening?: boolean;
    competitorAnalytics?: boolean;
    aiReplies?: boolean;
    googleReviews?: boolean;
  };
  _id: { toString(): string };
}) {
  return {
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    primaryColor: tenant.primaryColor,
    logoUrl: tenant.logoUrl ?? null,
    featureFlags: tenantFeatureFlagsSchema.parse({
      socialListening: tenant.featureFlags?.socialListening ?? false,
      competitorAnalytics: tenant.featureFlags?.competitorAnalytics ?? false,
      aiReplies: tenant.featureFlags?.aiReplies ?? false,
      googleReviews: tenant.featureFlags?.googleReviews ?? false,
    }),
    usage: { surveys: 0, submissions: 0, users: 0 },
  };
}

export function createAdminRoutes(
  getAuth: (req: Request) => AuthContext | null,
  superAdminUserIds: string[],
  clerkClient: ClerkAdminClient,
): Router {
  const router = createRouter();
  const guard = [requireAuth(getAuth), requireSuperAdmin(superAdminUserIds)];

  router.get("/tenants", ...guard, async (_req: Request, res: Response) => {
    const tenants = await Tenant.find().sort({ name: 1 });
    const body = await Promise.all(
      tenants.map(async (tenant) => {
        const usage = await getTenantUsage(tenant._id.toString());
        return adminTenantSchema.parse({
          ...toAdminTenant(tenant),
          usage,
        });
      }),
    );
    res.json(body);
  });

  router.post("/tenants", ...guard, async (req: Request, res: Response) => {
    const input = createTenantRequestSchema.parse(req.body);
    const existing = await Tenant.findOne({ slug: input.slug });
    if (existing) {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }

    const organization = await clerkClient.createOrganization({
      name: input.name,
      createdBy: req.auth!.userId,
    });

    const tenant = await Tenant.create({
      slug: input.slug,
      name: input.name,
      primaryColor: input.primaryColor,
      logoUrl: input.logoUrl,
      clerkOrgId: organization.id,
    });

    try {
      await clerkClient.provisionTenantAdmin({
        organizationId: organization.id,
        emailAddress: input.adminEmail,
        password: input.adminPassword,
      });
    } catch (error) {
      await Tenant.deleteOne({ _id: tenant._id });
      await clerkClient.deleteOrganization(organization.id).catch(() => undefined);
      const message =
        error instanceof Error ? error.message : "Failed to provision client login";
      if (/already exists|taken|duplicate/i.test(message)) {
        res.status(409).json({ error: "Admin email already has a Clerk account" });
        return;
      }
      res.status(502).json({ error: "Failed to provision client login" });
      return;
    }

    const usage = await getTenantUsage(tenant._id.toString());
    res.status(201).json(
      createTenantResponseSchema.parse({
        ...toAdminTenant(tenant),
        usage,
        clientEntryPath: `/t/${tenant.slug}`,
        adminEmail: input.adminEmail,
      }),
    );
  });

  router.patch(
    "/tenants/:slug",
    ...guard,
    async (req: Request, res: Response) => {
      const input = updateTenantRequestSchema.parse(req.body);
      const tenant = await Tenant.findOne({ slug: req.params.slug });
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      if (input.name !== undefined) tenant.name = input.name;
      if (input.primaryColor !== undefined) {
        tenant.primaryColor = input.primaryColor;
      }
      if (input.logoUrl !== undefined) tenant.logoUrl = input.logoUrl;
      if (input.status !== undefined) tenant.status = input.status;
      if (input.featureFlags) {
        tenant.featureFlags = {
          ...tenant.featureFlags,
          ...input.featureFlags,
        };
      }

      await tenant.save();

      const usage = await getTenantUsage(tenant._id.toString());
      res.json(
        adminTenantSchema.parse({
          ...toAdminTenant(tenant),
          usage,
        }),
      );
    },
  );

  return router;
}
