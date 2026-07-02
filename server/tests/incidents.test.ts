import request from "supertest";
import { describe, expect, it } from "vitest";
import { incidentSchema, surveySchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Customer } from "../src/models/customer.js";
import { Incident } from "../src/models/incident.js";
import { Submission } from "../src/models/submission.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";
import {
  defaultRatingQuestion,
  submitMeta,
} from "./helpers/feedbackIntake.js";

registerTestDbHooks();

async function seedSurvey() {
  await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  const app = createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
  });

  const created = await request(app)
    .post("/api/tenant/by-slug/hafiz-sweets/surveys")
    .send({
      name: "Branch Takeaway Survey",
      questions: [defaultRatingQuestion],
    });

  return surveySchema.parse(created.body);
}

describe("incidents from low-rating submissions", () => {
  it("auto-creates incident when rating is 1", async () => {
    const survey = await seedSurvey();
    const publicApp = createApp();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("takeaway", "en"),
        phone: "+923001234567",
        issueCategory: "food_quality",
        answers: [{ questionId: "q1", value: 1 }],
      });

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents",
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    const incident = incidentSchema.parse(response.body[0]);
    expect(incident.code).toMatch(/^HAF-\d{6}-\d{4}$/);
    expect(incident.rating).toBe(1);
    expect(incident.surveyName).toBe("Branch Takeaway Survey");
    expect(incident.timeline[0]?.status).toBe("created");

    const stored = await Incident.findOne({ code: incident.code });
    expect(stored).not.toBeNull();
  });

  it("does not create incident when rating is 5", async () => {
    const survey = await seedSurvey();
    const publicApp = createApp();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("in_store", "en"),
        answers: [{ questionId: "q1", value: 5 }],
      });

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents",
    );

    expect(response.body).toHaveLength(0);
  });
});

describe("POST /api/tenant/by-slug/:slug/incidents", () => {
  it("returns 400 and does not persist submission when rating is above threshold", async () => {
    const survey = await seedSurvey();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    const response = await request(tenantApp)
      .post("/api/tenant/by-slug/hafiz-sweets/incidents")
      .send({
        surveyId: survey.id,
        rating: 5,
        phone: "+923007777777",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/above incident threshold/);
    expect(await Submission.countDocuments()).toBe(0);
    expect(await Customer.countDocuments()).toBe(0);
    expect(await Incident.countDocuments()).toBe(0);
  });

  it("creates incident when staff logs low rating", async () => {
    const survey = await seedSurvey();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    const response = await request(tenantApp)
      .post("/api/tenant/by-slug/hafiz-sweets/incidents")
      .send({
        surveyId: survey.id,
        rating: 2,
        phone: "+923006666666",
        name: "Staff logged",
        issueCategory: "service",
      });

    expect(response.status).toBe(201);
    const incident = incidentSchema.parse(response.body);
    expect(incident.rating).toBe(2);
    expect(incident.surveyName).toBe("Branch Takeaway Survey");
  });
});

describe("PATCH /api/tenant/by-slug/:slug/incidents/:id", () => {
  it("updates incident status and timeline", async () => {
    const survey = await seedSurvey();
    const publicApp = createApp();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        ...submitMeta("in_store", "en"),
        issueCategory: "wait_time",
        answers: [{ questionId: "q1", value: 2 }],
      });

    const list = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents",
    );
    const incidentId = incidentSchema.parse(list.body[0]).id;

    const response = await request(tenantApp)
      .patch(`/api/tenant/by-slug/hafiz-sweets/incidents/${incidentId}`)
      .send({ status: "reviewed", assignees: ["user_1"] });

    expect(response.status).toBe(200);
    const incident = incidentSchema.parse(response.body);
    expect(incident.status).toBe("reviewed");
    expect(incident.timeline).toHaveLength(2);
    expect(incident.timeline[1]?.status).toBe("reviewed");
    expect(incident.assignees).toEqual(["user_1"]);
  });
});
