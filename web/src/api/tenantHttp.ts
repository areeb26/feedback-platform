import { apiFetch } from "./http";

export function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export function tenantRequest(
  slug: string,
  path: string,
  init?: RequestInit,
) {
  return apiFetch(`${tenantBase(slug)}${path}`, init);
}
