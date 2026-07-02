import {
  listingSchema,
  listingSyncResponseSchema,
  type Listing,
} from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";

const listingListSchema = listingSchema.array();


export async function fetchListings(slug: string): Promise<Listing[]> {
  const response = await apiFetch(`${tenantBase(slug)}/listings`);
  if (!response.ok) {
    throw new Error("Failed to load listings");
  }
  return listingListSchema.parse(await response.json());
}

export async function syncListings(slug: string) {
  const response = await apiFetch(`${tenantBase(slug)}/listings/sync`, {
    method: "POST",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to sync listings");
  }
  return listingSyncResponseSchema.parse(await response.json());
}

export function directoryLabel(directory: Listing["directory"]) {
  if (directory === "google") return "Google";
  return "Foodpanda";
}

export type { Listing };
