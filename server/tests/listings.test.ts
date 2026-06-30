import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { listingSchema, listingSyncResponseSchema } from "@feedback-platform/shared";
import type { GoogleBusinessClient } from "../src/auth/googleBusiness.js";
import { createApp } from "../src/app.js";
import { Location } from "../src/models/location.js";
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
  it("syncs Google listings per location", async () => {
    const googleClient = createMockGoogleClient();
    await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });
    await Location.create({
      tenantId: (await Tenant.findOne())!._id,
      name: "Hafiz Sweets",
      labels: [],
    });
    await Location.create({
      tenantId: (await Tenant.findOne())!._id,
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
  });
});
