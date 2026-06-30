import request from "supertest";
import { describe, expect, it } from "vitest";
import type { ClerkAdminClient } from "../src/auth/clerkAdmin.js";
import { createApp } from "../src/app.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

function createTestClerkClient(): ClerkAdminClient & {
  organizations: Array<{ name: string; createdBy: string }>;
  invitations: Array<{ organizationId: string; emailAddress: string }>;
} {
  const organizations: Array<{ name: string; createdBy: string }> = [];
  const invitations: Array<{ organizationId: string; emailAddress: string }> =
    [];

  return {
    organizations,
    invitations,
    async createOrganization({ name, createdBy }) {
      organizations.push({ name, createdBy });
      return { id: "org_new" };
    },
    async inviteAdmin({ organizationId, emailAddress }) {
      invitations.push({ organizationId, emailAddress });
    },
  };
}

describe("POST /api/admin/tenants", () => {
  it("creates tenant with clerk org and admin invite", async () => {
    const clerkClient = createTestClerkClient();
    const app = createApp({
      getAuth: () => ({ userId: "user_admin", orgId: null }),
      superAdminUserIds: ["user_admin"],
      clerkClient,
    });

    const response = await request(app).post("/api/admin/tenants").send({
      name: "Hafiz Sweets",
      slug: "hafiz-sweets",
      primaryColor: "#7c3aed",
      adminEmail: "admin@hafiz.com",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      status: "active",
      primaryColor: "#7c3aed",
      logoUrl: null,
      usage: { surveys: 0, submissions: 0, users: 0 },
    });

    const tenant = await Tenant.findOne({ slug: "hafiz-sweets" });
    expect(tenant?.clerkOrgId).toBe("org_new");
    expect(clerkClient.organizations).toEqual([
      { name: "Hafiz Sweets", createdBy: "user_admin" },
    ]);
    expect(clerkClient.invitations).toEqual([
      { organizationId: "org_new", emailAddress: "admin@hafiz.com" },
    ]);
  });
});
