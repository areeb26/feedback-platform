import request from "supertest";
import { locationSchema, surveySchema } from "@feedback-platform/shared";
import { createApp } from "../../src/app.js";
import { Tenant } from "../../src/models/tenant.js";
import { defaultRatingQuestion } from "./feedbackIntake.js";

export async function seedTenantWithSurveys() {
  await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  const app = createApp({
    getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
  });

  const gulberg = locationSchema.parse(
    (
      await request(app)
        .post("/api/tenant/by-slug/hafiz-sweets/locations")
        .send({ name: "Gulberg Branch" })
    ).body,
  );

  const dha = locationSchema.parse(
    (
      await request(app)
        .post("/api/tenant/by-slug/hafiz-sweets/locations")
        .send({ name: "DHA Branch" })
    ).body,
  );

  const takeawaySurvey = surveySchema.parse(
    (
      await request(app)
        .post("/api/tenant/by-slug/hafiz-sweets/surveys")
        .send({
          name: "Takeaway Survey",
          locationId: gulberg.id,
          questions: [defaultRatingQuestion],
        })
    ).body,
  );

  const deliverySurvey = surveySchema.parse(
    (
      await request(app)
        .post("/api/tenant/by-slug/hafiz-sweets/surveys")
        .send({
          name: "Delivery Survey",
          locationId: dha.id,
          questions: [defaultRatingQuestion],
        })
    ).body,
  );

  return { takeawaySurvey, deliverySurvey };
}
