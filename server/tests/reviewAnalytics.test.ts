import request from "supertest";
import { describe, expect, it } from "vitest";
import { reviewAnalyticsSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Location } from "../src/models/location.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const importCsv = `reviewerName,rating,content,locationName,postedAt
kashif shah,4,Average,Hafiz Sweets,2026-06-30T13:50:00.000Z
Izhan,5,Great food,Hafiz Sweets - Saudabad,2026-06-30T13:50:00.000Z
Bilal Ahmed,1,Poor service,Hafiz Sweets,2026-06-29T10:00:00.000Z`;

async function seedReviews() {
  const tenant = await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });
  await Location.create({
    tenantId: tenant._id,
    name: "Hafiz Sweets",
    labels: ["Karachi", "Flagship"],
  });
  await Location.create({
    tenantId: tenant._id,
    name: "Hafiz Sweets - Saudabad",
    labels: ["Karachi"],
  });

  const app = createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
  });

  await request(app)
    .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
    .send({ source: "google", csv: importCsv });

  return app;
}

describe("GET /api/tenant/by-slug/:slug/analytics/reviews", () => {
  it("returns review analytics metrics", async () => {
    const app = await seedReviews();

    const response = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/analytics/reviews" +
        "?startDate=2026-06-01T00:00:00.000Z&endDate=2026-06-30T23:59:59.999Z",
    );

    expect(response.status).toBe(200);
    const analytics = reviewAnalyticsSchema.parse(response.body);
    expect(analytics.totalReviews).toBe(3);
    expect(analytics.averageRating).toBe(3.33);
    expect(analytics.positiveReviewsCount).toBe(2);
    expect(analytics.ratingsByDate.length).toBeGreaterThan(0);
    expect(analytics.listingsBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          listingName: "Hafiz Sweets",
          reviews: 2,
        }),
        expect.objectContaining({
          listingName: "Hafiz Sweets - Saudabad",
          reviews: 1,
        }),
      ]),
    );
    expect(analytics.labelsBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          listingName: "Karachi",
          reviews: 3,
        }),
        expect.objectContaining({
          listingName: "Flagship",
          reviews: 2,
        }),
      ]),
    );
  });
});
