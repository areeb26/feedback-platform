import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  defaultSurveyFollowUp,
  surveySchema,
} from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";
import { defaultRatingQuestion } from "./helpers/feedbackIntake.js";

registerTestDbHooks();

async function seedTenant() {
  return Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });
}

function createTenantApp() {
  return createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
  });
}

describe("POST /api/tenant/by-slug/:slug/surveys", () => {
  it("creates a survey with preview link", async () => {
    await seedTenant();
    const app = createTenantApp();

    const response = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/surveys")
      .send({
        name: "Call Centre Survey",
        questions: [defaultRatingQuestion],
      });

    expect(response.status).toBe(201);
    const body = surveySchema.parse(response.body);
    expect(body.name).toBe("Call Centre Survey");
    expect(body.previewPath).toBe(`/s/${body.previewSlug}`);
    expect(body.submissionCount).toBe(0);
    expect(body.questions).toEqual([defaultRatingQuestion]);
    expect(body.followUp.enabled).toBe(true);
  });
});

describe("GET /api/tenant/by-slug/:slug/surveys", () => {
  it("lists surveys for tenant", async () => {
    await seedTenant();
    const app = createTenantApp();

    await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/surveys")
      .send({ name: "Delivery Survey", questions: [defaultRatingQuestion] });

    const response = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/surveys",
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(surveySchema.parse(response.body[0]).name).toBe("Delivery Survey");
  });
});

describe("PATCH /api/tenant/by-slug/:slug/surveys/:id", () => {
  it("updates survey name", async () => {
    await seedTenant();
    const app = createTenantApp();

    const created = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/surveys")
      .send({ name: "Old Name", questions: [defaultRatingQuestion] });

    const surveyId = surveySchema.parse(created.body).id;

    const response = await request(app)
      .patch(`/api/tenant/by-slug/hafiz-sweets/surveys/${surveyId}`)
      .send({ name: "Branch Takeaway Survey" });

    expect(response.status).toBe(200);
    expect(surveySchema.parse(response.body).name).toBe("Branch Takeaway Survey");
  });
});

describe("DELETE /api/tenant/by-slug/:slug/surveys/:id", () => {
  it("deletes survey", async () => {
    await seedTenant();
    const app = createTenantApp();

    const created = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/surveys")
      .send({ name: "Packaging Survey", questions: [defaultRatingQuestion] });

    const surveyId = surveySchema.parse(created.body).id;

    const deleted = await request(app).delete(
      `/api/tenant/by-slug/hafiz-sweets/surveys/${surveyId}`,
    );
    expect(deleted.status).toBe(204);

    const list = await request(app).get(
      "/api/tenant/by-slug/hafiz-sweets/surveys",
    );
    expect(list.body).toHaveLength(0);
  });
});

describe("GET /api/public/surveys/:previewSlug", () => {
  it("returns public survey preview without auth", async () => {
    await seedTenant();
    const app = createTenantApp();

    const created = await request(app)
      .post("/api/tenant/by-slug/hafiz-sweets/surveys")
      .send({ name: "Call Centre Survey", questions: [defaultRatingQuestion] });

    const previewSlug = surveySchema.parse(created.body).previewSlug;

    const response = await request(app).get(
      `/api/public/surveys/${previewSlug}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Call Centre Survey",
      tenantName: "Hafiz Sweets",
      primaryColor: "#7c3aed",
      questions: [defaultRatingQuestion],
      followUp: defaultSurveyFollowUp(),
      channel: null,
      locationId: null,
      locationName: null,
    });
  });
});
