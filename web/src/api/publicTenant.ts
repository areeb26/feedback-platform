import {
  tenantPublicBrandingSchema,
  type TenantPublicBranding,
} from "@feedback-platform/shared";
import { apiFetch } from "./http";

export async function fetchTenantPublicBranding(
  slug: string,
): Promise<TenantPublicBranding> {
  const response = await apiFetch(`/api/public/tenants/${slug}`);
  if (!response.ok) {
    throw new Error("Failed to load tenant branding");
  }
  return tenantPublicBrandingSchema.parse(await response.json());
}
