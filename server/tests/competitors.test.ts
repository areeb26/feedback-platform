import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  competitorAnalyticsSchema,
  competitorRefreshResponseSchema,
  competitorSchema,
} from "@feedback-platform/shared";
import type { GooglePlacesClient } from "../src/auth/googlePlaces.js";
import { createApp } from "../src/app.js";
import { Competitor } from "../src/models/competitor.js";
import { Listing } from "../src/models/listing.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const PLACE_DETAILS: Record<
  string,
  { rating: number; reviewCount: number; name: string }
> = {
  ChIJ_competitor_1: {
    name: "Qasr e Shereen",
    rating: 5,
    reviewCount: 120,
  },
  ChIJ_competitor_2: {
    name: "United King",
    rating: 4.5,
    reviewCount: 95,
  },
};

function createMockPlacesClient(): GooglePlacesClient {
  return {
    getPlaceDetails: vi.fn(async (placeId: string) => {
      const details = PLACE_DETAILS[placeId];
      if (!details) {
        throw new Error("Place not found");
      }
      return details;
    }),
  };
}

async function seedTenantWithFlag(enabled: boolean) {
  return Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
    featureFlags: { competitorAnalytics: enabled },
  });
}

describe("tenant competitors", () => {
  it("returns 403 when competitor analytics feature is disabled", async () => {
    await seedTenantWithFlag(false);
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient: createMockPlacesClient(),
    });

    const response = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/competitors",
    );
    expect(response.status).toBe(403);
  });

  it("creates, lists, refreshes, and deletes competitors", async () => {
    const placesClient = createMockPlacesClient();
    const tenant = await seedTenantWithFlag(true);
    await Listing.create({
      tenantId: tenant._id,
      directory: "google",
      externalId: "locations/own",
      name: "Hafiz Sweets",
      rating: 4,
      reviewCount: 80,
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient,
    });

    const created = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "Qasr e Shereen", placeId: "ChIJ_competitor_1" });
    expect(created.status).toBe(201);
    const competitor = competitorSchema.parse(created.body);
    expect(competitor.name).toBe("Qasr e Shereen");
    expect(competitor.placeId).toBe("ChIJ_competitor_1");
    expect(competitor.rating).toBe(5);
    expect(competitor.reviewCount).toBe(120);
    expect(competitor.lastRefreshedAt).not.toBeNull();

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "United King", placeId: "ChIJ_competitor_2" });

    const list = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/competitors",
    );
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);

    const refresh = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/competitors/refresh",
    );
    expect(refresh.status).toBe(200);
    expect(competitorRefreshResponseSchema.parse(refresh.body)).toEqual({
      refreshed: 2,
      failed: 0,
    });

    const refreshed = await Competitor.findOne({ placeId: "ChIJ_competitor_1" });
    expect(refreshed?.rating).toBe(5);
    expect(refreshed?.reviewCount).toBe(120);

    const analytics = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/analytics/competitors",
    );
    expect(analytics.status).toBe(200);
    const data = competitorAnalyticsSchema.parse(analytics.body);
    expect(data.columns).toHaveLength(3);
    expect(data.columns[0]?.isOwnBusiness).toBe(true);
    expect(data.categories).toHaveLength(5);
    expect(data.categories[0]?.cells[0]?.score).toBe(80);

    const deleted = await request(app).delete(
      `/api/tenant/by-slug/hafiz-sweets/competitors/${competitor.id}`,
    );
    expect(deleted.status).toBe(204);

    const remaining = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/competitors",
    );
    expect(remaining.body).toHaveLength(1);
  });

  it("updates competitor name and re-fetches Places when placeId changes", async () => {
    const placesClient = createMockPlacesClient();
    await seedTenantWithFlag(true);

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient,
    });

    const created = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "Qasr e Shereen", placeId: "ChIJ_competitor_1" });
    const competitor = competitorSchema.parse(created.body);

    const renamed = await request(app)
      .patch(`/api/tenant/by-slug/hafiz-sweets/competitors/${competitor.id}`)
      .send({ name: "Qasr Updated" });
    expect(renamed.status).toBe(200);
    expect(competitorSchema.parse(renamed.body).name).toBe("Qasr Updated");

    const moved = await request(app)
      .patch(`/api/tenant/by-slug/hafiz-sweets/competitors/${competitor.id}`)
      .send({ placeId: "ChIJ_competitor_2" });
    expect(moved.status).toBe(200);
    const updated = competitorSchema.parse(moved.body);
    expect(updated.placeId).toBe("ChIJ_competitor_2");
    expect(updated.rating).toBe(4.5);
    expect(updated.reviewCount).toBe(95);
    expect(updated.name).toBe("United King");
  });

  it("populates rating from Places on create without manual refresh", async () => {
    const placesClient = createMockPlacesClient();
    await seedTenantWithFlag(true);

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient,
    });

    const created = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "United King", placeId: "ChIJ_competitor_2" });

    expect(created.status).toBe(201);
    const competitor = competitorSchema.parse(created.body);
    expect(competitor.rating).toBe(4.5);
    expect(competitor.reviewCount).toBe(95);
    expect(placesClient.getPlaceDetails).toHaveBeenCalledWith(
      "ChIJ_competitor_2",
    );
  });

  it("returns 409 when creating a competitor with duplicate placeId", async () => {
    await seedTenantWithFlag(true);

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient: createMockPlacesClient(),
    });

    const first = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "Qasr e Shereen", placeId: "ChIJ_competitor_1" });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "Duplicate", placeId: "ChIJ_competitor_1" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: "Competitor with the already exists",
    });
  });

  it("continues refresh when some Places lookups fail", async () => {
    const placesClient = createMockPlacesClient();
    await seedTenantWithFlag(true);

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient,
    });

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "Qasr e Shereen", placeId: "ChIJ_competitor_1" });
    await Competitor.create({
      tenantId: (await Tenant.findOne({ slug: "hafiz-sweets" }))!._id,
      name: "Broken Place",
      placeId: "ChIJ_missing",
    });

    const refresh = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/competitors/refresh",
    );
    expect(refresh.status).toBe(200);
    expect(competitorRefreshResponseSchema.parse(refresh.body)).toEqual({
      refreshed: 1,
      failed: 1,
    });
  });

  it("returns 502 when all competitor refreshes fail", async () => {
    const placesClient = createMockPlacesClient();
    await seedTenantWithFlag(true);

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient,
    });

    await Competitor.create({
      tenantId: (await Tenant.findOne({ slug: "hafiz-sweets" }))!._id,
      name: "Broken Place",
      placeId: "ChIJ_missing",
    });

    const refresh = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/competitors/refresh",
    );
    expect(refresh.status).toBe(502);
    expect(refresh.body).toEqual({ error: "All competitor refreshes failed" });
  });

  it("returns 404 when another tenant tries to delete or patch a competitor", async () => {
    await seedTenantWithFlag(true);
    await Tenant.create({
      slug: "other-store",
      name: "Other Store",
      clerkOrgId: "org_other",
      primaryColor: "#000000",
      featureFlags: { competitorAnalytics: true },
    });

    const tenantAApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient: createMockPlacesClient(),
    });
    const tenantBApp = createApp({
      getAuth: () => ({ userId: "user_2", orgId: "org_other" }),
      placesClient: createMockPlacesClient(),
    });

    const created = await request(tenantAApp)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "Qasr e Shereen", placeId: "ChIJ_competitor_1" });
    const competitor = competitorSchema.parse(created.body);

    const deleted = await request(tenantBApp).delete(
      `/api/tenant/by-slug/other-store/competitors/${competitor.id}`,
    );
    expect(deleted.status).toBe(404);

    const patched = await request(tenantBApp)
      .patch(`/api/tenant/by-slug/other-store/competitors/${competitor.id}`)
      .send({ name: "Hacked" });
    expect(patched.status).toBe(404);
  });

  it("isolates competitors by tenant", async () => {
    await seedTenantWithFlag(true);
    await Tenant.create({
      slug: "other-store",
      name: "Other Store",
      clerkOrgId: "org_other",
      primaryColor: "#000000",
      featureFlags: { competitorAnalytics: true },
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      placesClient: createMockPlacesClient(),
    });

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/competitors")
      .send({ name: "Qasr e Shereen", placeId: "ChIJ_competitor_1" });

    const otherApp = createApp({
      getAuth: () => ({ userId: "user_2", orgId: "org_other" }),
      placesClient: createMockPlacesClient(),
    });

    const otherList = await request(otherApp).get(
      "/api/tenant/by-slug/other-store/competitors",
    );
    expect(otherList.status).toBe(200);
    expect(otherList.body).toHaveLength(0);
  });
});
