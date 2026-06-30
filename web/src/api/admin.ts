import { z } from "zod";
import {
  adminTenantSchema,
  createTenantRequestSchema,
} from "@feedback-platform/shared";

export type AdminTenant = z.infer<typeof adminTenantSchema>;
export type CreateTenantInput = z.infer<typeof createTenantRequestSchema>;

const adminTenantListSchema = z.array(adminTenantSchema);

export async function fetchAdminTenants(): Promise<AdminTenant[]> {
  const response = await fetch("/api/admin/tenants");
  if (!response.ok) {
    throw new Error("Failed to load tenants");
  }
  return adminTenantListSchema.parse(await response.json());
}

export async function createAdminTenant(
  input: CreateTenantInput,
): Promise<AdminTenant> {
  const body = createTenantRequestSchema.parse(input);
  const response = await fetch("/api/admin/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to create tenant");
  }
  return adminTenantSchema.parse(await response.json());
}
