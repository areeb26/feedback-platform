import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

describe("GET /api/admin/tenants", () => {
  it("returns 403 for non-super-admin users", async () => {
    const app = createApp({
      getAuth: () => ({ userId: "user_regular", orgId: "org_hafiz" }),
      superAdminUserIds: ["user_admin"],
    });

    const response = await request(app).get("/api/admin/tenants");

    expect(response.status).toBe(403);
  });

  it("returns all tenants for super-admin", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });
    await Tenant.create({
      slug: "other-store",
      name: "Other Store",
      clerkOrgId: "org_other",
      primaryColor: "#7c3aed",
      status: "suspended",
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_admin", orgId: null }),
      superAdminUserIds: ["user_admin"],
    });

    const response = await request(app).get("/api/admin/tenants");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        slug: "hafiz-sweets",
        name: "Hafiz Sweets",
        status: "active",
        primaryColor: "#7c3aed",
        logoUrl: null,
        usage: { surveys: 0, submissions: 0, users: 0 },
      },
      {
        slug: "other-store",
        name: "Other Store",
        status: "suspended",
        primaryColor: "#7c3aed",
        logoUrl: null,
        usage: { surveys: 0, submissions: 0, users: 0 },
      },
    ]);
  });
});

describe("PATCH /api/admin/tenants/:slug", () => {
  it("updates tenant branding and status", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_admin", orgId: null }),
      superAdminUserIds: ["user_admin"],
    });

    const response = await request(app)
      .patch("/api/admin/tenants/hafiz-sweets")
      .send({
        name: "Hafiz Sweets Updated",
        primaryColor: "#ff0000",
        status: "suspended",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets Updated",
      status: "suspended",
      primaryColor: "#ff0000",
      logoUrl: null,
      usage: { surveys: 0, submissions: 0, users: 0 },
    });
  });
});
