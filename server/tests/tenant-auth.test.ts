import request from "supertest";
import { describe, expect, it } from "vitest";
import { tenantProfileSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

describe("GET /api/tenant/me", () => {
  it("returns 401 when not authenticated", async () => {
    const app = createApp({ getAuth: () => null });

    const response = await request(app).get("/api/tenant/me");

    expect(response.status).toBe(401);
  });

  it("returns tenant profile for authenticated org member", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    const response = await request(app).get("/api/tenant/me");

    expect(response.status).toBe(200);
    expect(tenantProfileSchema.parse(response.body)).toEqual({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
    });
  });

  it("returns 403 when tenant is suspended", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
      status: "suspended",
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    const response = await request(app).get("/api/tenant/me");

    expect(response.status).toBe(403);
  });

  it("returns 403 when accessing another tenant slug", async () => {
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
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    const response = await request(app).get("/api/tenant/by-slug/other-store");

    expect(response.status).toBe(403);
  });
});
