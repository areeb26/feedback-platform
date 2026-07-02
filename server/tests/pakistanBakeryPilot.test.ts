import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  bilingualLabel,
  buildGoogleReviewUrl,
  incidentSchema,
  submitSurveyResponseSchema,
} from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { PushToken } from "../src/models/pushToken.js";
import { Tenant } from "../src/models/tenant.js";
import { createRecordingExpoPushClient } from "../src/services/expoPush.js";
import { registerTestDbHooks } from "./db.js";
import {
  defaultRatingQuestion,
  submitMeta,
} from "./helpers/feedbackIntake.js";

registerTestDbHooks();

async function seedPilotTenant() {
  const tenant = await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  const tenantApp = createApp({
    getAuth: () => ({ userId: "user_branch_a", orgId: "org_hafiz" }),
  });
  const adminApp = createApp({
    getAuth: () => ({ userId: "user_admin", orgId: "org_hafiz" }),
  });

  const branchA = (
    await request(adminApp)
      .post("/api/tenant/by-slug/hafiz-sweets/locations")
      .send({ name: "Gulberg Branch" })
  ).body;

  const branchB = (
    await request(adminApp)
      .post("/api/tenant/by-slug/hafiz-sweets/locations")
      .send({ name: "DHA Branch" })
  ).body;

  await request(adminApp)
    .patch(`/api/tenant/by-slug/hafiz-sweets/locations/${branchA.id}`)
    .send({
      googlePlaceId: "ChIJ_gulberg_branch",
      assigneeUserIds: ["user_branch_a"],
    });

  await request(adminApp)
    .patch(`/api/tenant/by-slug/hafiz-sweets/locations/${branchB.id}`)
    .send({ assigneeUserIds: ["user_branch_b"] });

  const survey = (
    await request(adminApp)
      .post("/api/tenant/by-slug/hafiz-sweets/surveys")
      .send({
        name: "Branch Feedback",
        locationId: branchA.id,
        questions: [defaultRatingQuestion],
      })
  ).body;

  return { tenant, tenantApp, adminApp, branchA, branchB, survey };
}

describe("Pakistan bakery pilot feedback intake", () => {
  it("stores channel on submission from public feedback intake", async () => {
    const { survey, branchA } = await seedPilotTenant();
    const publicApp = createApp();

    const response = await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "ur"),
        locationId: branchA.id,
        answers: [{ questionId: "q1", value: 5 }],
      });

    expect(response.status).toBe(201);
    submitSurveyResponseSchema.parse(response.body);
  });

  it("requires issue category for low delivery ratings", async () => {
    const { survey, branchA } = await seedPilotTenant();
    const publicApp = createApp();

    const missingCategory = await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        locationId: branchA.id,
        answers: [{ questionId: "q1", value: 2 }],
      });

    expect(missingCategory.status).toBe(400);
    expect(missingCategory.body.error).toMatch(/issue category/i);

    const withCategory = await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        locationId: branchA.id,
        issueCategory: "packaging",
        answers: [{ questionId: "q1", value: 2 }],
      });

    expect(withCategory.status).toBe(201);
  });

  it("returns review nudge for high ratings when location has Google Place ID", async () => {
    const { survey, branchA } = await seedPilotTenant();
    const publicApp = createApp();

    const response = await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("in_store", "en"),
        locationId: branchA.id,
        answers: [{ questionId: "q1", value: 5 }],
      });

    const body = submitSurveyResponseSchema.parse(response.body);
    expect(body.reviewNudge?.googleReviewUrl).toBe(
      buildGoogleReviewUrl("ChIJ_gulberg_branch"),
    );
  });

  it("alerts only location assignees for new incidents", async () => {
    const { survey, branchA, branchB } = await seedPilotTenant();
    const expoPushClient = createRecordingExpoPushClient();
    const publicApp = createApp({ expoPushClient });

    await PushToken.create({
      userId: "user_branch_a",
      tenantId: (await Tenant.findOne({ slug: "hafiz-sweets" }))!._id,
      token: "ExponentPushToken[branch_a]",
      updatedAt: new Date(),
    });
    await PushToken.create({
      userId: "user_branch_b",
      tenantId: (await Tenant.findOne({ slug: "hafiz-sweets" }))!._id,
      token: "ExponentPushToken[branch_b]",
      updatedAt: new Date(),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        locationId: branchA.id,
        issueCategory: "temperature",
        answers: [{ questionId: "q1", value: 1 }],
      });

    expect(expoPushClient.messages).toHaveLength(1);
    expect(expoPushClient.messages[0]?.to).toBe("ExponentPushToken[branch_a]");

    expoPushClient.messages.length = 0;

    const branchBSurvey = (
      await request(
        createApp({
          getAuth: () => ({ userId: "user_admin", orgId: "org_hafiz" }),
        }),
      )
        .post("/api/tenant/by-slug/hafiz-sweets/surveys")
        .send({
          name: "DHA Feedback",
          locationId: branchB.id,
          questions: [defaultRatingQuestion],
        })
    ).body;

    await request(publicApp)
      .post(`/api/public/surveys/${branchBSurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("in_store", "en"),
        locationId: branchB.id,
        issueCategory: "service",
        answers: [{ questionId: "q1", value: 2 }],
      });

    expect(expoPushClient.messages).toHaveLength(1);
    expect(expoPushClient.messages[0]?.to).toBe("ExponentPushToken[branch_b]");
  });

  it("exposes channel and issue category on incident list", async () => {
    const { survey, branchA, adminApp } = await seedPilotTenant();
    const publicApp = createApp();

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        locationId: branchA.id,
        issueCategory: "packaging",
        answers: [{ questionId: "q1", value: 2 }],
      });

    const response = await request(adminApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents",
    );

    expect(response.status).toBe(200);
    const incident = incidentSchema.parse(response.body[0]);
    expect(incident.channel).toBe("delivery");
    expect(incident.issueCategory).toBe("packaging");
  });

  it("returns channel-aware follow-up choices on public survey fetch", async () => {
    const { survey, branchA } = await seedPilotTenant();
    const publicApp = createApp();

    const response = await request(publicApp).get(
      `/api/public/surveys/${survey.previewSlug}?channel=delivery&location=${branchA.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.channel).toBe("delivery");
    expect(response.body.locationId).toBe(branchA.id);
    expect(response.body.followUp.choicesByChannel.delivery.length).toBeGreaterThan(
      0,
    );
    expect(response.body.questions[0].label).toEqual(
      bilingualLabel("Overall experience", "مجموعی تجربہ"),
    );
  });
});
