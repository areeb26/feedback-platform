import request from "supertest";
import { describe, expect, it } from "vitest";
import { locationSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

async function seedTenant() {
  return Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });
}

function createTenantApp() {
  return createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
  });
}

describe("POST /api/tenant/by-slug/:slug/locations", () => {
  it("creates a location for the tenant", async () => {
    await seedTenant();
    const app = createTenantApp();

    const response = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/locations")
      .send({ name: "Memon Goth", address: "Karachi" });

    expect(response.status).toBe(201);
    const body = locationSchema.parse(response.body);
    expect(body.name).toBe("Memon Goth");
    expect(body.address).toBe("Karachi");
    expect(body.labels).toEqual([]);
    expect(body.googlePlaceId).toBeNull();
    expect(body.assigneeUserIds).toEqual([]);
  });
});

describe("GET /api/tenant/by-slug/:slug/locations", () => {
  it("lists tenant locations", async () => {
    await seedTenant();
    const app = createTenantApp();

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/locations")
      .send({ name: "Memon Goth" });

    const response = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/locations",
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(locationSchema.parse(response.body[0]).name).toBe("Memon Goth");
  });
});

describe("GET /api/tenant/by-slug/:slug/shell", () => {
  it("returns tenant branding for shell", async () => {
    await seedTenant();
    const app = createTenantApp();

    const response = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/shell",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      logoUrl: null,
      primaryColor: "#7c3aed",
      featureFlags: {
        socialListening: false,
        competitorAnalytics: false,
        aiReplies: false,
        googleReviews: false,
      },
    });
  });

  it("returns 403 for another tenant slug", async () => {
    await seedTenant();
    await Tenant.create({
      slug: "other-store",
      name: "Other Store",
      clerkOrgId: "org_other",
      primaryColor: "#000000",
    });
    const app = createTenantApp();

    const response = await request(app).get(
      "/api/tenant/by-slug/other-store/shell",
    );

    expect(response.status).toBe(403);
  });
});
