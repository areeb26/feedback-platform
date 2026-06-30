import type { NextFunction, Request, Response } from "express";
import { attachTenantFromSlug } from "./attachTenantFromSlug.js";

export function requireTenantSlug(paramName = "slug") {
  return async (req: Request, res: Response, next: NextFunction) => {
    req.params.slug = req.params[paramName];
    await attachTenantFromSlug(req, res, next);
  };
}
