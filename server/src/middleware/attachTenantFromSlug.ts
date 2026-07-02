import type { NextFunction, Request, Response } from "express";
import { Tenant } from "../models/tenant.js";
import { setRequestTenant } from "./setRequestTenant.js";

export async function attachTenantFromSlug(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const slug = req.params.slug;
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

  setRequestTenant(req, tenant);
  next();
}
