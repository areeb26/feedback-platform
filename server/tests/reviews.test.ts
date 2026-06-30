import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  importReviewsResponseSchema,
  reviewSchema,
} from "@feedback-platform/shared";
import type { GoogleBusinessClient } from "../src/auth/googleBusiness.js";
import { createApp } from "../src/app.js";
import { GoogleConnection } from "../src/models/googleConnection.js";
import { Review } from "../src/models/review.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const foodpandaCsv = `reviewerName,rating,content,locationName,postedAt
Izhan,5,Great food,Hafiz Sweets - Saudabad,2026-06-30T13:50:00.000Z`;

async function seedTenantApp(googleClient?: GoogleBusinessClient) {
  await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  return createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    googleClient,
  });
}

function createMockGoogleClient(): GoogleBusinessClient {
  return {
    buildAuthUrl: vi.fn(() => "https://accounts.google.com/o/oauth2"),
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
    postReply: vi.fn().mockResolvedValue(undefined),
    getSummary: vi.fn().mockResolvedValue({
      reviewCount: 0,
      averageRating: 0,
    }),
  };
}

describe("tenant reviews", () => {
  it("imports Foodpanda CSV reviews with reply not supported", async () => {
    const app = await seedTenantApp();

    const response = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({ source: "foodpanda", csv: foodpandaCsv });

    expect(response.status).toBe(201);
    expect(importReviewsResponseSchema.parse(response.body).imported).toBe(1);

    const list = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/reviews",
    );
    expect(list.status).toBe(200);
    const review = reviewSchema.parse(list.body[0]);
    expect(review.source).toBe("foodpanda");
    expect(review.reviewerName).toBe("Izhan");
    expect(review.status).toBe("reply_not_supported");
    expect(review.canReply).toBe(false);
  });

  it("replies to a Google review", async () => {
    const googleClient = createMockGoogleClient();
    const app = await seedTenantApp(googleClient);
    const tenant = await Tenant.findOne({ slug: "hafiz-sweets" });

    await GoogleConnection.create({
      tenantId: tenant!._id,
      accountId: "accounts/123",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const review = await Review.create({
      tenantId: tenant!._id,
      source: "google",
      externalId: "accounts/123/locations/456/reviews/789",
      reviewerName: "kashif shah",
      rating: 4,
      content: "Average",
      locationName: "Hafiz Sweets",
      status: "not_replied",
      postedAt: new Date("2026-06-30T13:50:00.000Z"),
    });

    const response = await request(app)
      .patch(`/api/tenant/by-slug/hafiz-sweets/reviews/${review._id}/reply`)
      .send({ replyText: "Thank you for your feedback!" });

    expect(response.status).toBe(200);
    const updated = reviewSchema.parse(response.body);
    expect(updated.status).toBe("replied");
    expect(updated.replyText).toBe("Thank you for your feedback!");
    expect(updated.canReply).toBe(false);

    expect(googleClient.postReply).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewExternalId: "accounts/123/locations/456/reviews/789",
        replyText: "Thank you for your feedback!",
      }),
    );
    const stored = await Review.findById(review._id);
    expect(stored?.repliedAt).toBeTruthy();
  });

  it("filters reviews by rating and exports CSV", async () => {
    const app = await seedTenantApp();

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({ source: "foodpanda", csv: foodpandaCsv });
    const secondImport = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({
        source: "google",
        csv:
          "reviewerName,rating,content,locationName,postedAt\n" +
          "Bilal Ahmed,1,Poor service,Hafiz Sweets,2026-06-29T10:00:00.000Z",
      });
    expect(secondImport.status).toBe(201);
    expect(secondImport.body.imported).toBe(1);

    const filtered = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/reviews?rating=5",
    );
    expect(filtered.body).toHaveLength(1);
    expect(reviewSchema.parse(filtered.body[0]).reviewerName).toBe("Izhan");

    const exported = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/reviews/export",
    );
    expect(exported.status).toBe(200);
    expect(exported.text).toContain("Izhan");
    expect(exported.text).toContain("Bilal Ahmed");
  });
});
