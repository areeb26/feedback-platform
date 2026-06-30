import request from "supertest";
import { describe, expect, it } from "vitest";
import { customerSchema, surveySchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";
import { Customer } from "../src/models/customer.js";
import { Submission } from "../src/models/submission.js";
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
    .send({ name: "Delivery Survey", questions: defaultQuestions });

  return surveySchema.parse(created.body);
}

describe("POST /api/public/surveys/:previewSlug/submit", () => {
  it("creates submission and customer", async () => {
    const survey = await seedSurvey();
    const app = createApp();

    const response = await request(app)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        name: "Areeb",
        phone: "+923001234567",
        answers: [{ questionId: "q1", value: 4 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Thank you for your feedback");

    const submissions = await Submission.find();
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.rating).toBe(4);

    const customers = await Customer.find();
    expect(customers).toHaveLength(1);
    expect(customers[0]?.phone).toBe("+923001234567");
  });
});

describe("GET /api/tenant/by-slug/:slug/customers", () => {
  it("lists customers after public submission", async () => {
    const survey = await seedSurvey();
    const publicApp = createApp();
    const tenantApp = createApp({
      getAuth: () => ({ userId: "user_1", orgId: "org_hafiz" }),
    });

    await request(publicApp)
      .post(`/api/public/surveys/${survey.previewSlug}/submit`)
      .send({
        name: "Areeb",
        phone: "+923001234567",
        answers: [{ questionId: "q1", value: 4 }],
      });

    const response = await request(tenantApp).get(
      "/api/tenant/by-slug/hafiz-sweets/customers",
    );

    expect(response.status).toBe(200);
    const customer = customerSchema.parse(response.body[0]);
    expect(customer.name).toBe("Areeb");
    expect(customer.phone).toBe("+923001234567");
  });
});
