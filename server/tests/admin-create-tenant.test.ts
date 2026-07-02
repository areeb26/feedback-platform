import request from "supertest";
import { describe, expect, it } from "vitest";
import type { ClerkAdminClient } from "../src/auth/clerkAdmin.js";
import { createApp } from "../src/app.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

function createTestClerkClient(): ClerkAdminClient & {
  organizations: Array<{ name: string; createdBy: string }>;
  provisionedAdmins: Array<{
    organizationId: string;
    emailAddress: string;
    password: string;
  }>;
  deletedOrganizations: string[];
} {
  const organizations: Array<{ name: string; createdBy: string }> = [];
  const provisionedAdmins: Array<{
    organizationId: string;
    emailAddress: string;
    password: string;
  }> = [];
  const deletedOrganizations: string[] = [];

  return {
    organizations,
    provisionedAdmins,
    deletedOrganizations,
    async createOrganization({ name, createdBy }) {
      organizations.push({ name, createdBy });
      return { id: "org_new" };
    },
    async deleteOrganization(organizationId) {
      deletedOrganizations.push(organizationId);
    },
    async provisionTenantAdmin({ organizationId, emailAddress, password }) {
      provisionedAdmins.push({ organizationId, emailAddress, password });
    },
  };
}

describe("POST /api/admin/tenants", () => {
  it("creates tenant with clerk org and provisioned client login", async () => {
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
      adminPassword: "client-pass-123",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      status: "active",
      primaryColor: "#7c3aed",
      logoUrl: null,
      featureFlags: {
        socialListening: false,
        competitorAnalytics: false,
        aiReplies: false,
        googleReviews: false,
      },
      usage: { surveys: 0, submissions: 0, users: 0 },
      clientEntryPath: "/t/hafiz-sweets",
      adminEmail: "admin@hafiz.com",
    });

    const tenant = await Tenant.findOne({ slug: "hafiz-sweets" });
    expect(tenant?.clerkOrgId).toBe("org_new");
    expect(clerkClient.organizations).toEqual([
      { name: "Hafiz Sweets", createdBy: "user_admin" },
    ]);
    expect(clerkClient.provisionedAdmins).toEqual([
      {
        organizationId: "org_new",
        emailAddress: "admin@hafiz.com",
        password: "client-pass-123",
      },
    ]);
  });
});

describe("PATCH /api/admin/tenants/:slug", () => {
  it("updates tenant status and feature flags", async () => {
    const clerkClient = createTestClerkClient();
    const app = createApp({
      getAuth: () => ({ userId: "user_admin", orgId: null }),
      superAdminUserIds: ["user_admin"],
      clerkClient,
    });

    await request(app).post("/api/admin/tenants").send({
      name: "Hafiz Sweets",
      slug: "hafiz-sweets",
      primaryColor: "#7c3aed",
      adminEmail: "admin@hafiz.com",
      adminPassword: "client-pass-123",
    });

    const response = await request(app)
      .patch("/api/admin/tenants/hafiz-sweets")
      .send({
        status: "suspended",
        featureFlags: {
          googleReviews: true,
          aiReplies: true,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      slug: "hafiz-sweets",
      status: "suspended",
      featureFlags: {
        socialListening: false,
        competitorAnalytics: false,
        aiReplies: true,
        googleReviews: true,
      },
    });
  });
});
