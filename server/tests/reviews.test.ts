import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  importReviewsResponseSchema,
  reviewSchema,
} from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Review } from "../src/models/review.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const foodpandaCsv = `reviewerName,rating,content,locationName,postedAt
Izhan,5,"Great food, fresh sweets",Hafiz Sweets - Saudabad,2026-06-30T13:50:00.000Z`;

const googleCsv = `reviewerName,rating,content,locationName,postedAt
kashif shah,4,Average,Hafiz Sweets,2026-06-30T13:50:00.000Z`;

async function seedTenantApp() {
  await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  return createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
  });
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
    expect(review.content).toBe("Great food, fresh sweets");
    expect(review.status).toBe("reply_not_supported");
    expect(review.canReply).toBe(false);

    const duplicateImport = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({ source: "foodpanda", csv: foodpandaCsv });
    expect(importReviewsResponseSchema.parse(duplicateImport.body).imported).toBe(0);
  });

  it("replies to a Google review", async () => {
    const app = await seedTenantApp();

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({ source: "google", csv: googleCsv });

    const list = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/reviews?directory=google",
    );
    const reviewId = reviewSchema.parse(list.body[0]).id;

    const response = await request(app)
      .patch(`/api/tenant/by-slug/hafiz-sweets/reviews/${reviewId}/reply`)
      .send({ replyText: "Thank you for your feedback!" });

    expect(response.status).toBe(200);
    const updated = reviewSchema.parse(response.body);
    expect(updated.status).toBe("replied");
    expect(updated.replyText).toBe("Thank you for your feedback!");
    expect(updated.canReply).toBe(false);

    const stored = await Review.findById(reviewId);
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

    const literalSearch = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/reviews?content=.",
    );
    expect(literalSearch.status).toBe(200);
    expect(literalSearch.body).toHaveLength(0);

    const exported = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/reviews/export",
    );
    expect(exported.status).toBe(200);
    expect(exported.text).toContain("Izhan");
    expect(exported.text).toContain("Bilal Ahmed");
    expect(exported.text).toContain('"Great food, fresh sweets"');
  });
});
