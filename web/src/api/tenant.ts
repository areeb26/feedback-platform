import {
  createLocationRequestSchema,
  locationSchema,
  tenantShellSchema,
  updateLocationRequestSchema,
  type CreateLocationRequest,
  type Location,
  type UpdateLocationRequest,
} from "@feedback-platform/shared";
import type { TenantShell } from "@feedback-platform/shared";

const locationListSchema = locationSchema.array();

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchTenantShell(slug: string): Promise<TenantShell> {
  const response = await fetch(`${tenantBase(slug)}/shell`);
  if (!response.ok) {
    throw new Error("Failed to load tenant");
  }
  return tenantShellSchema.parse(await response.json());
}

export async function fetchLocations(slug: string): Promise<Location[]> {
  const response = await fetch(`${tenantBase(slug)}/locations`);
  if (!response.ok) {
    throw new Error("Failed to load locations");
  }
  return locationListSchema.parse(await response.json());
}

export async function createLocation(
  slug: string,
  input: CreateLocationRequest,
): Promise<Location> {
  const body = createLocationRequestSchema.parse(input);
  const response = await fetch(`${tenantBase(slug)}/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to create location");
  }
  return locationSchema.parse(await response.json());
}

export async function updateLocation(
  slug: string,
  locationId: string,
  input: UpdateLocationRequest,
): Promise<Location> {
  const body = updateLocationRequestSchema.parse(input);
  const response = await fetch(`${tenantBase(slug)}/locations/${locationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to update location");
  }
  return locationSchema.parse(await response.json());
}
