import { z } from "zod";
import { apiFetch } from "./http";
import {
  adminTenantSchema,
  createTenantRequestSchema,
  createTenantResponseSchema,
  updateTenantRequestSchema,
  type UpdateTenantRequest,
} from "@feedback-platform/shared";

export type AdminTenant = z.infer<typeof adminTenantSchema>;
export type CreateTenantInput = z.infer<typeof createTenantRequestSchema>;
export type CreateTenantResponse = z.infer<typeof createTenantResponseSchema>;

const adminTenantListSchema = z.array(adminTenantSchema);

export async function fetchAdminTenants(): Promise<AdminTenant[]> {
  const response = await apiFetch("/api/admin/tenants");
  if (!response.ok) {
    throw new Error("Failed to load tenants");
  }
  return adminTenantListSchema.parse(await response.json());
}

export async function createAdminTenant(
  input: CreateTenantInput,
): Promise<CreateTenantResponse> {
  const body = createTenantRequestSchema.parse(input);
  const response = await apiFetch("/api/admin/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to create tenant");
  }
  return createTenantResponseSchema.parse(await response.json());
}

export async function updateAdminTenant(
  slug: string,
  input: UpdateTenantRequest,
): Promise<AdminTenant> {
  const body = updateTenantRequestSchema.parse(input);
  const response = await apiFetch(`/api/admin/tenants/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to update tenant");
  }
  return adminTenantSchema.parse(await response.json());
}
