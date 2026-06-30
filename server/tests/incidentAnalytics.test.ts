import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  incidentAnalyticsSchema,
  surveySchema,
} from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Incident } from "../src/models/incident.js";
import { Submission } from "../src/models/submission.js";
import { Survey } from "../src/models/survey.js";
import { Tenant } from "../src/models/tenant.js";
import { registerTestDbHooks } from "./db.js";

registerTestDbHooks();

const defaultQuestions = [
  {
    id: "q1",
    type: "rating" as const,
    label: "Overall experience",
    required: true,
  },
];

async function seedIncident() {
  await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  const tenantApp = createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
  });
  const publicApp = createApp();

  const survey = surveySchema.parse(
    (
      await request(tenantApp)
        .post("/api/tenant/by-slug/hafiz-sweets/surveys")
        .send({ name: "Branch Takeaway Survey", questions: defaultQuestions })
    ).body,
  );

  await request(publicApp)
    .post(`/api/public/surveys/${survey.previewSlug}/submit`)
    .send({ answers: [{ questionId: "q1", value: 1 }] });

  const incident = await Incident.findOne();
  if (!incident) {
    throw new Error("Expected incident");
  }

  await Incident.collection.updateOne(
    { _id: incident._id },
    {
      $set: {
        timeline: [
          { status: "created", at: new Date("2026-06-11T10:00:00.000Z") },
          { status: "reviewed", at: new Date("2026-06-17T10:27:00.000Z") },
          { status: "resolved", at: new Date("2026-06-17T10:30:00.000Z") },
        ],
        status: "resolved",
        assignees: ["user_1"],
        createdAt: new Date("2026-06-11T10:00:00.000Z"),
      },
    },
  );

  return tenantApp;
}

describe("GET /api/tenant/by-slug/:slug/analytics/incidents", () => {
  it("returns incident analytics metrics", async () => {
    const tenantApp = await seedIncident();

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/analytics/incidents" +
        "?startDate=2026-06-01T00:00:00.000Z&endDate=2026-06-30T23:59:59.999Z",
    );

    expect(response.status).toBe(200);
    const analytics = incidentAnalyticsSchema.parse(response.body);
    expect(analytics.totalIncidents).toBe(1);
    expect(analytics.resolvedIncidents).toBe(1);
    expect(analytics.avgReviewTimeMinutes).toBe(8667);
    expect(analytics.avgResolveTimeMinutes).toBe(8670);
    expect(analytics.newIncidentsByDate).toEqual([
      { date: "2026-06-11", oneStar: 1, twoStar: 0, threeStar: 0 },
    ]);
    expect(analytics.staffPerformance).toEqual([
      expect.objectContaining({
        staffMember: "user_1",
        submissions: 1,
        incidentsCreated: 1,
        reviewed: 1,
        resolved: 1,
        percentResolved: 100,
      }),
    ]);
  });

  it("does not read linked submission ratings from another tenant", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });
    const otherTenant = await Tenant.create({
      slug: "other-tenant",
      name: "Other Tenant",
      clerkOrgId: "org_other",
      primaryColor: "#111827",
    });
    const otherSurvey = await Survey.create({
      tenantId: otherTenant._id,
      name: "Other Survey",
      previewSlug: "other-survey",
      questions: defaultQuestions,
    });
    const otherSubmission = await Submission.create({
      tenantId: otherTenant._id,
      surveyId: otherSurvey._id,
      rating: 1,
      answers: [{ questionId: "q1", value: 1 }],
    });

    const incident = await Incident.create({
      tenantId: tenant._id,
      submissionId: otherSubmission._id,
      code: "HAF-999",
      status: "created",
      timeline: [
        { status: "created", at: new Date("2026-06-11T10:00:00.000Z") },
      ],
    });
    await Incident.collection.updateOne(
      { _id: incident._id },
      { $set: { createdAt: new Date("2026-06-11T10:00:00.000Z") } },
    );

    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });
    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/analytics/incidents" +
        "?startDate=2026-06-01T00:00:00.000Z&endDate=2026-06-30T23:59:59.999Z",
    );

    expect(response.status).toBe(200);
    const analytics = incidentAnalyticsSchema.parse(response.body);
    expect(analytics.totalIncidents).toBe(1);
    expect(analytics.newIncidentsByDate).toEqual([
      { date: "2026-06-11", oneStar: 0, twoStar: 0, threeStar: 0 },
    ]);
  });
});
