import {
  tenantProfileSchema,
  type TenantProfile,
} from "@feedback-platform/shared";
import { apiFetch } from "./client";

export async function fetchTenantProfile(
  getToken: () => Promise<string | null>,
): Promise<TenantProfile> {
  const payload = await apiFetch<unknown>("/api/tenant/me", getToken);
  return tenantProfileSchema.parse(payload);
}

export async function registerPushToken(
  getToken: () => Promise<string | null>,
  token: string,
): Promise<void> {
  await apiFetch("/api/tenant/me/push-token", getToken, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
