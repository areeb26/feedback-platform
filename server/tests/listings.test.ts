import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { listingSchema, listingSyncResponseSchema } from "@feedback-platform/shared";
import type { GoogleBusinessClient } from "../src/auth/googleBusiness.js";
import { createApp } from "../src/app.js";
import { Listing } from "../src/models/listing.js";
import { Location } from "../src/models/location.js";
import { Listing } from "../src/models/listing.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

function createMockGoogleClient(): GoogleBusinessClient {
  return {
    buildAuthUrl: ({ redirectUri, state }) =>
      `https://accounts.google.com/o/oauth2?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    exchangeCode: vi.fn().mockResolvedValue({
      accessToken: "access_token",
      refreshToken: "refresh_token",
      expiresAt: new Date(Date.now() + 3_600_000),
      accountId: "accounts/123",
    }),
    refreshAccessToken: vi.fn().mockResolvedValue({
      accessToken: "access_token_refreshed",
      expiresAt: new Date(Date.now() + 3_600_000),
    }),
    listReviews: vi.fn().mockResolvedValue([]),
    listListings: vi.fn().mockResolvedValue([
      {
        externalId: "locations/456",
        name: "Hafiz Sweets",
        rating: 4.3,
        reviewCount: 65,
        locationName: "Hafiz Sweets",
      },
      {
        externalId: "locations/789",
        name: "Hafiz Sweets - Saudabad",
        rating: 4.1,
        reviewCount: 48,
        locationName: "Hafiz Sweets - Saudabad",
      },
    ]),
    postReply: vi.fn().mockResolvedValue(undefined),
    getSummary: vi.fn().mockResolvedValue({
      reviewCount: 113,
      averageRating: 4.2,
    }),
  };
}

async function connectGoogle(app: Awaited<ReturnType<typeof createApp>>) {
  const start = await request(app)
    .post("/api/tenant/by-slug/hafiz-sweets/google/connect")
    .send({ redirectUri: "http://localhost:5173/google/callback" });
  await request(app)
    .post("/api/tenant/by-slug/hafiz-sweets/google/callback")
    .send({
      code: "auth_code",
      redirectUri: "http://localhost:5173/google/callback",
      state: start.body.state,
    });
}

describe("tenant listings", () => {
  it("syncs Google listings per location and prunes stale Google listings", async () => {
    const googleClient = createMockGoogleClient();
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
      featureFlags: {
        socialListening: false,
        competitorAnalytics: false,
        aiReplies: false,
        googleReviews: true,
      },
    });
    await Location.create({
      tenantId: tenant._id,
      name: "Hafiz Sweets",
      labels: [],
    });
    await Location.create({
      tenantId: tenant._id,
      name: "Hafiz Sweets - Saudabad",
      labels: [],
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      googleClient,
    });

    await connectGoogle(app);

    const sync = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/listings/sync",
    );
    expect(sync.status).toBe(200);
    expect(listingSyncResponseSchema.parse(sync.body).synced).toBe(2);

    const list = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/listings",
    );
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    const listing = listingSchema.parse(list.body[0]);
    expect(listing.directory).toBe("google");
    expect(listing.locationName).toBeTruthy();

    vi.mocked(googleClient.listListings).mockResolvedValue([
      {
        externalId: "locations/456",
        name: "Hafiz Sweets",
        rating: 4.5,
        reviewCount: 70,
        locationName: "Hafiz Sweets",
      },
    ]);

    const secondSync = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/listings/sync",
    );
    expect(secondSync.status).toBe(200);

    const prunedList = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/listings",
    );
    expect(prunedList.status).toBe(200);
    expect(prunedList.body).toHaveLength(1);
    expect(listingSchema.parse(prunedList.body[0]).name).toBe("Hafiz Sweets");
  });

  it("does not expose a cross-tenant location name from a listing", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });
    const otherTenant = await Tenant.create({
      slug: "other-shop",
      name: "Other Shop",
      clerkOrgId: "org_other",
      primaryColor: "#2563eb",
    });
    const otherLocation = await Location.create({
      tenantId: otherTenant._id,
      name: "Other Shop Branch",
      labels: [],
    });
    await Listing.create({
      tenantId: tenant._id,
      locationId: otherLocation._id,
      directory: "google",
      externalId: "locations/cross-tenant",
      name: "Hafiz Sweets Google",
      rating: 4.3,
      reviewCount: 65,
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      googleClient: createMockGoogleClient(),
    });

    const response = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/listings",
    );
    expect(response.status).toBe(200);
    expect(listingSchema.parse(response.body[0]).locationName).toBeNull();
  });

  it("returns 502 when syncing before Google is connected", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      googleClient: createMockGoogleClient(),
    });

    const response = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/listings/sync",
    );
    expect(response.status).toBe(502);
    expect(response.body.error).toBe("Google account not connected");
  });

  it("rejects listings access when the Clerk org does not match the slug", async () => {
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_other" }),
      googleClient: createMockGoogleClient(),
    });

    const response = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/listings",
    );
    expect(response.status).toBe(403);
  });

  it("does not expose another tenant location name for a listing", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });
    const otherTenant = await Tenant.create({
      slug: "other-store",
      name: "Other Store",
      clerkOrgId: "org_other",
      primaryColor: "#000000",
    });
    const otherLocation = await Location.create({
      tenantId: otherTenant._id,
      name: "Private Other Location",
      labels: [],
    });
    await Listing.create({
      tenantId: tenant._id,
      locationId: otherLocation._id,
      directory: "google",
      externalId: "locations/cross-tenant",
      name: "Hafiz Sweets",
      rating: 4.3,
      reviewCount: 65,
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      googleClient: createMockGoogleClient(),
    });

    const list = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/listings",
    );

    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    const listing = listingSchema.parse(list.body[0]);
    expect(listing.locationName).toBeNull();
  });
});
