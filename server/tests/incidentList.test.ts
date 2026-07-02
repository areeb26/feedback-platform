import request from "supertest";
import { describe, expect, it } from "vitest";
import { incidentSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { registerTestDbHooks } from "./db.js";
import { submitMeta } from "./helpers/feedbackIntake.js";
import { seedTenantWithSurveys } from "./helpers/incidentListSeed.js";

registerTestDbHooks();

describe("GET /api/tenant/by-slug/:slug/incidents", () => {
  it("lists enriched context per incident when tenant has multiple incidents", async () => {
    const { takeawaySurvey, deliverySurvey } = await seedTenantWithSurveys();
    const publicApp = createApp();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${takeawaySurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("takeaway", "en"),
        email: "takeaway@example.com",
        issueCategory: "food_quality",
        answers: [{ questionId: "q1", value: 1 }],
      });

    await request(publicApp)
      .post(`/api/public/surveys/${deliverySurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("delivery", "en"),
        email: "delivery@example.com",
        issueCategory: "packaging",
        answers: [{ questionId: "q1", value: 2 }],
      });

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents",
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    const incidents = response.body.map((row: unknown) =>
      incidentSchema.parse(row),
    );
    const takeaway = incidents.find(
      (row) => row.surveyName === "Takeaway Survey",
    );
    const delivery = incidents.find(
      (row) => row.surveyName === "Delivery Survey",
    );

    expect(takeaway).toMatchObject({
      rating: 1,
      surveyName: "Takeaway Survey",
      locationName: "Gulberg Branch",
      customerEmail: "takeaway@example.com",
    });
    expect(delivery).toMatchObject({
      rating: 2,
      surveyName: "Delivery Survey",
      locationName: "DHA Branch",
      customerEmail: "delivery@example.com",
    });
  });

  it("returns a single incident by id", async () => {
    const { takeawaySurvey } = await seedTenantWithSurveys();
    const publicApp = createApp();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${takeawaySurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("takeaway", "en"),
        email: "takeaway@example.com",
        issueCategory: "wait_time",
        answers: [{ questionId: "q1", value: 1 }],
      });

    const list = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents",
    );
    const incident = incidentSchema.parse(list.body[0]);

    const response = await request(tenantApp).get(
      `/api/tenant/by-slug/hafiz-sweets/incidents/${incident.id}`,
    );

    expect(response.status).toBe(200);
    expect(incidentSchema.parse(response.body)).toMatchObject({
      id: incident.id,
      code: incident.code,
      surveyName: "Takeaway Survey",
    });
  });

  it("exports incidents as CSV", async () => {
    const { takeawaySurvey } = await seedTenantWithSurveys();
    const publicApp = createApp();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${takeawaySurvey.previewSlug}/submit`)
      .send({
        ...submitMeta("takeaway", "en"),
        email: "takeaway@example.com",
        issueCategory: "wait_time",
        answers: [{ questionId: "q1", value: 1 }],
      });

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents/export",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain("Takeaway Survey");
    expect(response.text).toContain("takeaway@example.com");
  });
});
