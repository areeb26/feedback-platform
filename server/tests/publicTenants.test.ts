import request from "supertest";
import { describe, expect, it } from "vitest";
import { tenantPublicBrandingSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

describe("GET /api/public/tenants/:slug", () => {
  it("returns branding for an active tenant", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
      logoUrl: "https://cdn.example.com/logo.png",
    });

    const app = createApp({ getAuth: () => null });
    const response = await request(app).get("/api/public/tenants/hafiz-sweets");

    expect(response.status).toBe(200);
    expect(tenantPublicBrandingSchema.parse(response.body)).toEqual({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      logoUrl: "https://cdn.example.com/logo.png",
      primaryColor: "#7c3aed",
      status: "active",
    });
  });

  it("returns branding with suspended status", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
      status: "suspended",
    });

    const app = createApp({ getAuth: () => null });
    const response = await request(app).get("/api/public/tenants/hafiz-sweets");

    expect(response.status).toBe(200);
    expect(tenantPublicBrandingSchema.parse(response.body).status).toBe(
      "suspended",
    );
  });

  it("returns 404 for an unknown slug", async () => {
    const app = createApp({ getAuth: () => null });
    const response = await request(app).get("/api/public/tenants/unknown");

    expect(response.status).toBe(404);
  });
});
