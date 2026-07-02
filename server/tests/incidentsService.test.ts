import { describe, expect, it } from "vitest";
import { defaultSurveyFollowUp } from "@feedback-platform/shared";
import { PushToken } from "../src/models/pushToken.js";
import { Tenant } from "../src/models/tenant.js";
import { createRecordingExpoPushClient } from "../src/services/expoPush.js";
import {
  createForSubmission,
  listForTenant,
  updateForTenant,
} from "../src/services/incidents.js";
import { recordFeedback } from "../src/services/submissionIntake.js";
import { registerTestDbHooks } from "./db.js";
import { defaultRatingQuestion } from "./helpers/feedbackIntake.js";

registerTestDbHooks();

describe("Incident module", () => {
  it("listForTenant returns enriched incidents", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });

    const { Survey } = await import("../src/models/survey.js");
    const survey = await Survey.create({
      tenantId: tenant._id,
      name: "Takeaway Survey",
      previewSlug: "takeaway",
      questions: [defaultRatingQuestion],
      followUp: defaultSurveyFollowUp(),
    });

    await recordFeedback({
      tenantId: tenant._id,
      tenantName: tenant.name,
      surveyId: survey._id,
      customer: { email: "takeaway@example.com" },
      rating: 1,
      channel: "takeaway",
      locale: "en",
      issueCategory: "food_quality",
      followUp: survey.followUp,
      answers: [{ questionId: "q1", value: 1 }],
      incidentPolicy: "optional",
    });

    const rows = await listForTenant(tenant._id.toString());

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rating: 1,
      surveyName: "Takeaway Survey",
      customerEmail: "takeaway@example.com",
    });
  });

  it("updateForTenant updates status, timeline, and assignees", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });

    const { Survey } = await import("../src/models/survey.js");
    const survey = await Survey.create({
      tenantId: tenant._id,
      name: "Branch Survey",
      previewSlug: "branch",
      questions: [defaultRatingQuestion],
      followUp: defaultSurveyFollowUp(),
    });

    const { incident } = await recordFeedback({
      tenantId: tenant._id,
      tenantName: tenant.name,
      surveyId: survey._id,
      customer: { phone: "+923001111111" },
      rating: 2,
      channel: "in_store",
      locale: "en",
      issueCategory: "wait_time",
      followUp: survey.followUp,
      answers: [{ questionId: "q1", value: 2 }],
      incidentPolicy: "optional",
    });

    const updated = await updateForTenant(
      tenant._id.toString(),
      incident!._id.toString(),
      { status: "reviewed", assignees: ["user_1"] },
    );

    expect(updated).toMatchObject({
      status: "reviewed",
      assignees: ["user_1"],
      rating: 2,
      surveyName: "Branch Survey",
    });
    expect(updated?.timeline).toHaveLength(2);
    expect(updated?.timeline[1]?.status).toBe("reviewed");
  });

  it("updateForTenant returns null for unknown incident", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });

    const result = await updateForTenant(tenant._id.toString(), "507f1f77bcf86cd799439011", {
      status: "resolved",
    });

    expect(result).toBeNull();
  });

  it("createForSubmission sends push when client is provided", async () => {
    const tenant = await Tenant.create({
      slug: "hafiz-sweets",
      name: "Hafiz Sweets",
      clerkOrgId: "org_hafiz",
      primaryColor: "#7c3aed",
    });

    const { Submission } = await import("../src/models/submission.js");
    const submission = await Submission.create({
      tenantId: tenant._id,
      surveyId: tenant._id,
      rating: 1,
      channel: "delivery",
      locale: "en",
      answers: [{ questionId: "q1", value: 1 }],
    });

    await PushToken.create({
      tenantId: tenant._id,
      userId: "user_1",
      token: "ExponentPushToken[device]",
    });

    const expoPushClient = createRecordingExpoPushClient();
    const incident = await createForSubmission({
      tenantId: tenant._id,
      tenantName: tenant.name,
      submissionId: submission._id,
      expoPushClient,
    });

    expect(incident.code).toMatch(/^HAF-\d{6}-\d{4}$/);
    expect(expoPushClient.messages).toHaveLength(1);
    expect(expoPushClient.messages[0]?.data?.type).toBe("incident");
    expect(expoPushClient.messages[0]?.data?.incidentId).toBe(
      incident._id.toString(),
    );
  });
});
