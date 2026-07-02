import { describe, expect, it } from "vitest";
import { Review } from "../src/models/review.js";
import { Tenant } from "../src/models/tenant.js";
import { importReviewsFromCsv } from "../src/services/reviewLifecycle.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const foodpandaCsv = `reviewerName,rating,content,locationName,postedAt
Izhan,5,"Great food",Hafiz Sweets,2026-06-30T13:50:00.000Z`;

describe("importReviewsFromCsv", () => {
  it("imports new reviews and skips duplicates on second import", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });

    const first = await importReviewsFromCsv({
      tenantId: tenant._id.toString(),
      source: "foodpanda",
      csv: foodpandaCsv,
    });
    expect(first.imported).toBe(1);
    expect(await Review.countDocuments()).toBe(1);

    const second = await importReviewsFromCsv({
      tenantId: tenant._id.toString(),
      source: "foodpanda",
      csv: foodpandaCsv,
    });
    expect(second.imported).toBe(0);
    expect(await Review.countDocuments()).toBe(1);
  });
});
