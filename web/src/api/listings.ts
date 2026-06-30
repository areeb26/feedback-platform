import { listingSchema, type Listing } from "@feedback-platform/shared";

const listingListSchema = listingSchema.array();

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchListings(slug: string): Promise<Listing[]> {
  const response = await fetch(`${tenantBase(slug)}/listings`);
  if (!response.ok) {
    throw new Error("Failed to load listings");
  }
  return listingListSchema.parse(await response.json());
}

export async function syncListings(slug: string) {
  const response = await fetch(`${tenantBase(slug)}/listings/sync`, {
    method: "POST",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to sync listings");
  }
  return response.json() as Promise<{ synced: number }>;
}

export function directoryLabel(directory: Listing["directory"]) {
  if (directory === "google") return "Google";
  return "Foodpanda";
}

export type { Listing };
