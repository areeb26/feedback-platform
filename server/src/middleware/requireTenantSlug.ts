import type { NextFunction, Request, Response } from "express";
import { Tenant } from "../models/tenant.js";

export function requireTenantSlug(paramName = "slug") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const slug = req.params[paramName];
    const orgId = req.auth?.orgId;

    if (!orgId) {
      res.status(403).json({ error: "Organization required" });
      return;
    }

    const tenant = await Tenant.findOne({ slug });
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    if (tenant.clerkOrgId !== orgId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (tenant.status === "suspended") {
      res.status(403).json({ error: "Tenant suspended" });
      return;
    }

    req.tenant = {
      id: tenant._id.toString(),
      slug: tenant.slug,
      name: tenant.name,
    };
    next();
  };
}
