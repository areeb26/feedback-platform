import request from "supertest";
import { describe, expect, it } from "vitest";
import { overviewSchema, surveySchema, locationSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Incident } from "../src/models/incident.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";
import {
  defaultRatingQuestion,
  submitMeta,
} from "./helpers/feedbackIntake.js";

registerTestDbHooks();

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

describe("GET /api/tenant/by-slug/:slug/overview", () => {
  it("returns dashboard metrics from submissions and incidents", async () => {
    const tenantApp = await seedTenantApp();
    const publicApp = createApp();

    const survey = surveySchema.parse(
      (
        await request(tenantApp)
          .post("/api/tenant/by-slug/hafiz-sweets/surveys")
          .send({ name: "Delivery Survey", questions: [defaultRatingQuestion] })
      ).body,
    );

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        answers: [{ questionId: "q1", value: 5 }],
      });

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        issueCategory: "packaging",
        answers: [{ questionId: "q1", value: 1 }],
      });

    const incident = await Incident.findOne();
    if (incident) {
      incident.status = "resolved";
      incident.timeline.push({ status: "resolved", at: new Date() });
      await incident.save();
    }

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/overview",
    );

    expect(response.status).toBe(200);
    const overview = overviewSchema.parse(response.body);
    expect(overview.submissions).toBe(2);
    expect(overview.totalIncidents).toBe(1);
    expect(overview.smileScore).toBe(60);
    expect(overview.resolvedPercent).toBe(100);
    expect(overview.ratingBreakdown).toEqual([
      { stars: 5, count: 1, percent: 50 },
      { stars: 4, count: 0, percent: 0 },
      { stars: 3, count: 0, percent: 0 },
      { stars: 2, count: 0, percent: 0 },
      { stars: 1, count: 1, percent: 50 },
    ]);
  });

  it("scopes incident metrics to the selected survey", async () => {
    const tenantApp = await seedTenantApp();
    const publicApp = createApp();

    const deliverySurvey = surveySchema.parse(
      (
        await request(tenantApp)
          .post("/api/tenant/by-slug/hafiz-sweets/surveys")
          .send({ name: "Delivery Survey", questions: [defaultRatingQuestion] })
      ).body,
    );
    const dineInSurvey = surveySchema.parse(
      (
        await request(tenantApp)
          .post("/api/tenant/by-slug/hafiz-sweets/surveys")
          .send({ name: "Dine-in Survey", questions: [defaultRatingQuestion] })
      ).body,
    );

    await request(publicApp)
      .post(`/api/public/surveys/${deliverySurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        issueCategory: "temperature",
        answers: [{ questionId: "q1", value: 1 }],
      });
    await request(publicApp)
      .post(`/api/public/surveys/${dineInSurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("in_store", "en"),
        issueCategory: "service",
        answers: [{ questionId: "q1", value: 1 }],
      });

    const response = await request(tenantApp).get(
      `/api/tenant/by-slug/hafiz-sweets/overview?surveyId=${deliverySurvey.id}`,
    );

    expect(response.status).toBe(200);
    const overview = overviewSchema.parse(response.body);
    expect(overview.submissions).toBe(1);
    expect(overview.totalIncidents).toBe(1);
  });

  it("returns 400 for invalid query filters", async () => {
    const tenantApp = await seedTenantApp();

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/overview?startDate=not-a-date",
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });

  it("filters metrics by location label", async () => {
    const tenantApp = await seedTenantApp();
    const publicApp = createApp();

    const deliveryLocation = locationSchema.parse(
      (
        await request(tenantApp)
          .post("/api/tenant/by-slug/hafiz-sweets/locations")
          .send({ name: "Delivery Branch", labels: ["delivery"] })
      ).body,
    );
    const dineInLocation = locationSchema.parse(
      (
        await request(tenantApp)
          .post("/api/tenant/by-slug/hafiz-sweets/locations")
          .send({ name: "Dine-in Branch", labels: ["dine-in"] })
      ).body,
    );

    const deliverySurvey = surveySchema.parse(
      (
        await request(tenantApp)
          .post("/api/tenant/by-slug/hafiz-sweets/surveys")
          .send({
            name: "Delivery Survey",
            locationId: deliveryLocation.id,
            questions: [defaultRatingQuestion],
          })
      ).body,
    );
    const dineInSurvey = surveySchema.parse(
      (
        await request(tenantApp)
          .post("/api/tenant/by-slug/hafiz-sweets/surveys")
          .send({
            name: "Dine-in Survey",
            locationId: dineInLocation.id,
            questions: [defaultRatingQuestion],
          })
      ).body,
    );

    await request(publicApp)
      .post(`/api/public/surveys/${deliverySurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        answers: [{ questionId: "q1", value: 5 }],
      });
    await request(publicApp)
      .post(`/api/public/surveys/${dineInSurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("in_store", "en"),
        issueCategory: "food_quality",
        answers: [{ questionId: "q1", value: 1 }],
      });

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/overview?label=delivery",
    );

    expect(response.status).toBe(200);
    const overview = overviewSchema.parse(response.body);
    expect(overview.submissions).toBe(1);
    expect(overview.totalIncidents).toBe(0);
    expect(overview.smileScore).toBe(100);
  });
});
