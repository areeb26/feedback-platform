import request from "supertest";
import { describe, expect, it } from "vitest";
import { incidentSchema, surveySchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Incident } from "../src/models/incident.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const defaultQuestions = [
  { id: "q1", type: "rating" as const, label: "Overall experience", required: true },
];

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
    .send({ name: "Branch Takeaway Survey", questions: defaultQuestions });

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
        phone: "+923001234567",
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
        answers: [{ questionId: "q1", value: 5 }],
      });

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/incidents",
    );

    expect(response.body).toHaveLength(0);
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
      .send({ answers: [{ questionId: "q1", value: 2 }] });

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
