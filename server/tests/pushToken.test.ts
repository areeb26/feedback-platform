import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerPushTokenResponseSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { PushToken } from "../src/models/pushToken.js";
import { Tenant } from "../src/models/tenant.js";
import { createRecordingExpoPushClient } from "../src/services/expoPush.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

async function seedTenant() {
  const tenant = await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });
  return tenant;
}

describe("push token registration", () => {
  it("registers and upserts a push token for the current user", async () => {
    await seedTenant();
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    const first = await request(app)
      .post("/api/tenant/me/push-token")
      .send({ token: "ExponentPushToken[abc123]" });

    expect(first.status).toBe(200);
    registerPushTokenResponseSchema.parse(first.body);

    const second = await request(app)
      .post("/api/tenant/me/push-token")
      .send({ token: "ExponentPushToken[updated]" });

    expect(second.status).toBe(200);

    const stored = await PushToken.findOne({ userId: "user_1" });
    expect(stored?.token).toBe("ExponentPushToken[updated]");
    expect(stored?.tenantId.toString()).toBeTruthy();
  });

  it("requires organization membership", async () => {
    await seedTenant();
    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: null }),
    });

    const response = await request(app)
      .post("/api/tenant/me/push-token")
      .send({ token: "ExponentPushToken[abc123]" });

    expect(response.status).toBe(403);
  });
});

describe("push notifications", () => {
  it("sends a push when a low-rating submission creates an incident", async () => {
    await seedTenant();
    const expoPushClient = createRecordingExpoPushClient();
    await PushToken.create({
      userId: "user_1",
      tenantId: (await Tenant.findOne({ slug: "hafiz-sweets" }))!._id,
      token: "ExponentPushToken[device]",
      updatedAt: new Date(),
    });

    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      expoPushClient,
    });
    const publicApp = createApp({ expoPushClient });

    const survey = await request(tenantApp)
      .post("/api/tenant/by-slug/hafiz-sweets/surveys")
      .send({
        name: "Branch Survey",
        questions: [
          {
            id: "q1",
            type: "rating",
            label: "Overall",
            required: true,
          },
        ],
      });

    await request(publicApp)
      .post(`/api/public/surveys/${survey.body.previewSlug}/submit`)
      .send({
        answers: [{ questionId: "q1", value: 1 }],
      });

    expect(expoPushClient.messages).toHaveLength(1);
    expect(expoPushClient.messages[0]?.to).toBe("ExponentPushToken[device]");
    expect(expoPushClient.messages[0]?.data?.type).toBe("incident");
    expect(expoPushClient.messages[0]?.data?.incidentId).toBeTruthy();
  });

  it("sends a push when importing an unreplied google review", async () => {
    await seedTenant();
    const expoPushClient = createRecordingExpoPushClient();
    await PushToken.create({
      userId: "user_1",
      tenantId: (await Tenant.findOne({ slug: "hafiz-sweets" }))!._id,
      token: "ExponentPushToken[device]",
      updatedAt: new Date(),
    });

    const app = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
      expoPushClient,
    });

    const csv = [
      "reviewerName,rating,content",
      "Jane Doe,2,Poor service",
    ].join("\n");

    const response = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/reviews/import")
      .send({ source: "google", csv });

    expect(response.status).toBe(201);
    expect(expoPushClient.messages).toHaveLength(1);
    expect(expoPushClient.messages[0]?.data?.type).toBe("review");
    expect(expoPushClient.messages[0]?.data?.reviewId).toBeTruthy();
    expect(expoPushClient.messages[0]?.body).toContain("Jane Doe");
  });
});
