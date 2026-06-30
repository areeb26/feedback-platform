import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { tenantProfileSchema } from "@feedback-platform/shared";
import type { AuthContext } from "../types.js";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { createNoopGoogleBusinessClient } from "../auth/googleBusiness.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireTenantSlug } from "../middleware/requireTenantSlug.js";
import { resolveTenant } from "../middleware/resolveTenant.js";
import { createTenantSlugRoutes } from "./tenantSlug.js";

export function createTenantRoutes(
  getAuth: (req: Request) => AuthContext | null,
  googleClient: GoogleBusinessClient = createNoopGoogleBusinessClient(),
): Router {
  const router = createRouter();

  router.get(
    "/me",
    requireAuth(getAuth),
    resolveTenant,
    (req: Request, res: Response) => {
      const body = tenantProfileSchema.parse({
        slug: req.tenant!.slug,
        name: req.tenant!.name,
      });
      res.json(body);
    },
  );

  router.get(
    "/by-slug/:slug",
    requireAuth(getAuth),
    requireTenantSlug("slug"),
    (req: Request, res: Response) => {
      const body = tenantProfileSchema.parse({
        slug: req.tenant!.slug,
        name: req.tenant!.name,
      });
      res.json(body);
    },
  );

  router.use("/by-slug/:slug", createTenantSlugRoutes(getAuth, googleClient));

  return router;
}
