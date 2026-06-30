import type { Request } from "express";
import type { TenantDocument } from "../models/tenant.js";

export function setRequestTenant(req: Request, tenant: TenantDocument) {
  req.tenant = {
    id: tenant._id.toString(),
    slug: tenant.slug,
    name: tenant.name,
    logoUrl: tenant.logoUrl ?? null,
    primaryColor: tenant.primaryColor,
    featureFlags: {
      socialListening: tenant.featureFlags?.socialListening ?? false,
      competitorAnalytics: tenant.featureFlags?.competitorAnalytics ?? false,
      aiReplies: tenant.featureFlags?.aiReplies ?? false,
      googleReviews: tenant.featureFlags?.googleReviews ?? false,
    },
  };
}
