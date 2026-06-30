import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  googleConnectionSchema,
  googleSyncResponseSchema,
  reviewSchema,
} from "@feedback-platform/shared";
import type { GoogleBusinessClient } from "../src/auth/googleBusiness.js";
import { createApp } from "../src/app.js";
import { GoogleConnection } from "../src/models/googleConnection.js";
import { Review } from "../src/models/review.js";
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
    listReviews: vi.fn().mockResolvedValue([
      {
        externalId: "google_review_1",
        reviewerName: "kashif shah",
        rating: 4,
        content: "Average",
        locationName: "Hafiz Sweets",
        postedAt: new Date("2026-06-30T13:50:00.000Z"),
      },
    ]),
    listListings: vi.fn().mockResolvedValue([]),
    postReply: vi.fn().mockResolvedValue(undefined),
    getSummary: vi.fn().mockResolvedValue({
      reviewCount: 79,
      averageRating: 4.1,
    }),
  };
}

async function seedTenantApp(client: GoogleBusinessClient) {
  await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  return createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    googleClient: client,
  });
}

describe("Google Business Profile integration", () => {
  it("completes OAuth connect and syncs reviews without duplicates", async () => {
    const googleClient = createMockGoogleClient();
    const app = await seedTenantApp(googleClient);

    const start = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/google/connect")
      .send({ redirectUri: "http://localhost:5173/google/callback" });

    expect(start.status).toBe(200);
    const state = start.body.state as string;

    const callback = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/google/callback")
      .send({
        code: "auth_code",
        redirectUri: "http://localhost:5173/google/callback",
        state,
      });

    expect(callback.status).toBe(200);
    expect(googleConnectionSchema.parse(callback.body).status).toBe("connected");

    const firstSync = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/google/sync",
    );
    expect(firstSync.status).toBe(200);
    expect(googleSyncResponseSchema.parse(firstSync.body).imported).toBe(1);

    const secondSync = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/google/sync",
    );
    expect(googleSyncResponseSchema.parse(secondSync.body)).toEqual({
      imported: 0,
      updated: 1,
    });

    const stored = await Review.find({ source: "google" });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.externalId).toBe("google_review_1");
  });

  it("posts Google reply from dashboard", async () => {
    const googleClient = createMockGoogleClient();
    const app = await seedTenantApp(googleClient);

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
    await request(app).post("/api/tenant/by-slug/hafiz-sweets/google/sync");

    const review = await Review.findOne({ externalId: "google_review_1" });
    const response = await request(app)
      .patch(`/api/tenant/by-slug/hafiz-sweets/reviews/${review!._id}/reply`)
      .send({ replyText: "Thank you for visiting!" });

    expect(response.status).toBe(200);
    expect(reviewSchema.parse(response.body).status).toBe("replied");
    expect(googleClient.postReply).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewExternalId: "google_review_1",
        replyText: "Thank you for visiting!",
      }),
    );
  });

  it("returns expired status when token refresh fails", async () => {
    const googleClient = createMockGoogleClient();
    googleClient.refreshAccessToken = vi
      .fn()
      .mockRejectedValue(new Error("invalid_grant"));
    const app = await seedTenantApp(googleClient);

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

    const connection = await GoogleConnection.findOne();
    connection!.expiresAt = new Date(Date.now() - 60_000);
    await connection!.save();

    const sync = await request(app).post(
      "/api/tenant/by-slug/hafiz-sweets/google/sync",
    );
    expect(sync.status).toBe(502);

    const status = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/google/status",
    );
    expect(googleConnectionSchema.parse(status.body).status).toBe("expired");
  });
});
