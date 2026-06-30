import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { z } from "zod";
import type { AuthContext } from "../types.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { Tenant } from "../models/tenant.js";

const tenantListSchema = z.array(
  z.object({
    slug: z.string(),
    name: z.string(),
    status: z.enum(["active", "suspended"]),
  }),
);

export function createAdminRoutes(
  getAuth: (req: Request) => AuthContext | null,
  superAdminUserIds: string[],
): Router {
  const router = createRouter();

  router.get(
    "/tenants",
    requireAuth(getAuth),
    requireSuperAdmin(superAdminUserIds),
    async (_req: Request, res: Response) => {
      const tenants = await Tenant.find().sort({ name: 1 });
      const body = tenantListSchema.parse(
        tenants.map((tenant) => ({
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
        })),
      );
      res.json(body);
    },
  );

  return router;
}
