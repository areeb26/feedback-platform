import {
  createLocationRequestSchema,
  locationSchema,
  tenantProfileSchema,
  tenantShellSchema,
  updateLocationRequestSchema,
  type CreateLocationRequest,
  type Location,
  type TenantProfile,
  type UpdateLocationRequest,
} from "@feedback-platform/shared";
import type { TenantShell } from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";

const locationListSchema = locationSchema.array();


export async function fetchTenantShell(slug: string): Promise<TenantShell> {
  const response = await apiFetch(`${tenantBase(slug)}/shell`);
  if (!response.ok) {
    throw new Error("Failed to load tenant");
  }
  return tenantShellSchema.parse(await response.json());
}

export async function fetchTenantProfile(): Promise<TenantProfile> {
  const response = await apiFetch("/api/tenant/me");
  if (!response.ok) {
    throw new Error("Failed to load tenant profile");
  }
  return tenantProfileSchema.parse(await response.json());
}

export async function fetchLocations(slug: string): Promise<Location[]> {
  const response = await apiFetch(`${tenantBase(slug)}/locations`);
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
  const response = await apiFetch(`${tenantBase(slug)}/locations`, {
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
  const response = await apiFetch(`${tenantBase(slug)}/locations/${locationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to update location");
  }
  return locationSchema.parse(await response.json());
}
