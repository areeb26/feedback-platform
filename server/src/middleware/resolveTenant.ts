import type { NextFunction, Request, Response } from "express";
import { Tenant } from "../models/tenant.js";

export async function resolveTenant(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const orgId = req.auth?.orgId;
  if (!orgId) {
    res.status(403).json({ error: "Organization required" });
    return;
  }

  const tenant = await Tenant.findOne({ clerkOrgId: orgId });
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
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
}
