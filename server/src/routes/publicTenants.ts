import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { tenantPublicBrandingSchema } from "@feedback-platform/shared";
import { Tenant } from "../models/tenant.js";

export function createPublicTenantRoutes(): Router {
  const router = createRouter();

  router.get("/tenants/:slug", async (req: Request, res: Response) => {
    const tenant = await Tenant.findOne({ slug: req.params.slug });
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    res.json(
      tenantPublicBrandingSchema.parse({
        slug: tenant.slug,
        name: tenant.name,
        logoUrl: tenant.logoUrl ?? null,
        primaryColor: tenant.primaryColor,
        status: tenant.status,
      }),
    );
  });

  return router;
}
