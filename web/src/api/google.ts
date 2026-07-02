import {
  googleConnectCallbackRequestSchema,
  googleConnectStartRequestSchema,
  googleConnectStartResponseSchema,
  googleConnectionSchema,
  googleSyncResponseSchema,
  type GoogleConnection,
  type GoogleSyncResponse,
} from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";


const redirectUri = `${window.location.origin}/google/callback`;

export async function fetchGoogleConnection(slug: string): Promise<GoogleConnection> {
  const response = await apiFetch(`${tenantBase(slug)}/google/status`);
  if (!response.ok) {
    throw new Error("Failed to load Google connection");
  }
  return googleConnectionSchema.parse(await response.json());
}

export async function startGoogleConnect(slug: string) {
  const body = googleConnectStartRequestSchema.parse({ redirectUri });
  const response = await apiFetch(`${tenantBase(slug)}/google/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to start Google connect");
  }
  return googleConnectStartResponseSchema.parse(await response.json());
}

export async function completeGoogleCallback(
  slug: string,
  input: { code: string; state: string },
) {
  const body = googleConnectCallbackRequestSchema.parse({
    ...input,
    redirectUri,
  });
  const response = await apiFetch(`${tenantBase(slug)}/google/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to complete Google connect");
  }
  return googleConnectionSchema.parse(await response.json());
}

export async function syncGoogleReviews(slug: string): Promise<GoogleSyncResponse> {
  const response = await apiFetch(`${tenantBase(slug)}/google/sync`, {
    method: "POST",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to sync Google reviews");
  }
  return googleSyncResponseSchema.parse(await response.json());
}

export type { GoogleConnection };
