import { describe, expect, it } from "vitest";
import {
  defaultSurveyFollowUp,
} from "@feedback-platform/shared";
import { Submission } from "../src/models/submission.js";
import { Customer } from "../src/models/customer.js";
import { Tenant } from "../src/models/tenant.js";
import { Survey } from "../src/models/survey.js";
import {
  IncidentRequiredError,
  recordFeedback,
} from "../src/services/submissionIntake.js";
import { registerTestDbHooks } from "./db.js";
import { defaultRatingQuestion } from "./helpers/feedbackIntake.js";

registerTestDbHooks();

async function seedTenantSurvey() {
  const tenant = await Tenant.create({
    slug: "hafiz-sweets",
    name: "Hafiz Sweets",
    clerkOrgId: "org_hafiz",
    primaryColor: "#7c3aed",
  });

  const survey = await Survey.create({
    tenantId: tenant._id,
    name: "Branch Survey",
    previewSlug: "branch-survey",
    questions: [defaultRatingQuestion],
    followUp: defaultSurveyFollowUp(),
  });

  return { tenant, survey };
}

describe("recordFeedback", () => {
  it("creates submission without incident when policy is optional and rating is high", async () => {
    const { tenant, survey } = await seedTenantSurvey();

    const result = await recordFeedback({
      tenantId: tenant._id,
      tenantName: tenant.name,
      surveyId: survey._id,
      customer: { phone: "+923001234567" },
      rating: 5,
      channel: "in_store",
      locale: "en",
      followUp: survey.followUp,
      answers: [{ questionId: "q1", value: 5 }],
      incidentPolicy: "optional",
    });

    expect(result.submission.rating).toBe(5);
    expect(result.incident).toBeNull();
    expect(await Submission.countDocuments()).toBe(1);
    expect(await Customer.countDocuments()).toBe(1);
  });

  it("throws IncidentRequiredError before persisting when policy is required and rating is high", async () => {
    const { tenant, survey } = await seedTenantSurvey();

    await expect(
      recordFeedback({
        tenantId: tenant._id,
        tenantName: tenant.name,
        surveyId: survey._id,
        customer: { phone: "+923009999999" },
        rating: 5,
        channel: "in_store",
        locale: "en",
        followUp: survey.followUp,
        answers: [{ questionId: "q1", value: 5 }],
        incidentPolicy: "required",
      }),
    ).rejects.toBeInstanceOf(IncidentRequiredError);

    expect(await Submission.countDocuments()).toBe(0);
    expect(await Customer.countDocuments()).toBe(0);
  });

  it("creates incident when policy is required and rating is low", async () => {
    const { tenant, survey } = await seedTenantSurvey();

    const result = await recordFeedback({
      tenantId: tenant._id,
      tenantName: tenant.name,
      surveyId: survey._id,
      customer: { phone: "+923008888888" },
      rating: 2,
      channel: "in_store",
      locale: "en",
      issueCategory: "service",
      followUp: survey.followUp,
      answers: [{ questionId: "q1", value: 2 }],
      incidentPolicy: "required",
    });

    expect(result.incident).not.toBeNull();
    expect(result.incident?.code).toMatch(/^HAF-\d{6}-\d{4}$/);
  });
});
