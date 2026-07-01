import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  autoReplyRuleSchema,
  generateRepliesResponseSchema,
  reviewSchema,
} from "@feedback-platform/shared";
import type { OpenAiClient } from "../src/auth/openai.js";
import { createApp } from "../src/app.js";
import { AutoReplyRule } from "../src/models/autoReplyRule.js";
import { Review } from "../src/models/review.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const googleCsv = `reviewerName,rating,content,locationName,postedAt
kashif shah,2,Poor experience,Hafiz Sweets,2026-06-30T13:50:00.000Z`;

function createMockOpenAiClient(): OpenAiClient {
  return {
    generateReviewReplies: vi.fn(async ({ reviews }) =>
      reviews.map((review) => ({
        reviewId: review.id,
        draftReply: `Thank you ${review.reviewerName} for your feedback.`,
      })),
    ),
  };
}

async function seedTenant(aiReplies: boolean) {
  return Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
    featureFlags: { aiReplies },
  });
}

describe("AI replies", () => {
  it("returns 403 when aiReplies feature is disabled", async () => {
    await seedTenant(false);
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      openAiClient: createMockOpenAiClient(),
    });

    const generate = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/generate-replies")
      .send({ reviewIds: ["rev_1"] });
    expect(generate.status).toBe(403);

    const rules = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/auto-reply-rules",
    );
    expect(rules.status).toBe(403);
  });

  it("generates draft replies for selected unreplied reviews", async () => {
    const openAiClient = createMockOpenAiClient();
    await seedTenant(true);
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      openAiClient,
    });

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({ source: "google", csv: googleCsv });

    const list = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/reviews?directory=google",
    );
    const reviewId = reviewSchema.parse(list.body[0]).id;

    const response = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/generate-replies")
      .send({ reviewIds: [reviewId] });

    expect(response.status).toBe(200);
    const payload = generateRepliesResponseSchema.parse(response.body);
    expect(payload.drafts).toHaveLength(1);
    expect(payload.drafts[0].reviewId).toBe(reviewId);
    expect(payload.drafts[0].draftReply).toContain("kashif shah");
    expect(openAiClient.generateReviewReplies).toHaveBeenCalledOnce();
  });

  it("creates, lists, updates, and deletes auto-reply rules", async () => {
    await seedTenant(true);
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      openAiClient: createMockOpenAiClient(),
    });

    const created = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/auto-reply-rules")
      .send({
        name: "Low rating apology",
        maxRating: 2,
        templateText: "Sorry {reviewerName}, we value your {rating}-star feedback.",
        enabled: true,
      });
    expect(created.status).toBe(201);
    const rule = autoReplyRuleSchema.parse(created.body);
    expect(rule.maxRating).toBe(2);

    const listed = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/auto-reply-rules",
    );
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const updated = await request(app)
      .patch(`/api/tenant/by-slug/hafiz-sweets/auto-reply-rules/${rule.id}`)
      .send({ enabled: false });
    expect(updated.status).toBe(200);
    expect(autoReplyRuleSchema.parse(updated.body).enabled).toBe(false);

    const removed = await request(app).delete(
      `/api/tenant/by-slug/hafiz-sweets/auto-reply-rules/${rule.id}`,
    );
    expect(removed.status).toBe(204);
    expect(await AutoReplyRule.countDocuments()).toBe(0);
  });

  it("applies auto-reply rules when importing reviews", async () => {
    const tenant = await seedTenant(true);
    await AutoReplyRule.create({
      tenantId: tenant._id,
      name: "Low rating",
      maxRating: 3,
      templateText: "Hi {reviewerName}, thanks for the {rating}-star review.",
      enabled: true,
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      openAiClient: createMockOpenAiClient(),
    });

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({ source: "google", csv: googleCsv });

    const stored = await Review.findOne({ tenantId: tenant._id });
    expect(stored?.status).toBe("replied");
    expect(stored?.replyText).toContain("kashif shah");
    expect(stored?.replyText).toContain("2-star");
    expect(stored?.repliedAt).toBeTruthy();
  });
});
