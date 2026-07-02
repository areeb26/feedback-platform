import type { Types } from "mongoose";
import {
  buildGoogleReviewUrl,
  REVIEW_NUDGE_MIN_RATING,
  type Channel,
  type SurveyLocale,
} from "@feedback-platform/shared";
import { Submission } from "../models/submission.js";
import { Location } from "../models/location.js";
import { upsertCustomer } from "./customers.js";
import {
  createForSubmission,
  IncidentRequiredError,
} from "./incidents.js";
import {
  shouldCreateIncident,
  validateFeedbackIntake,
} from "./feedbackIntakeValidation.js";
import type { ExpoPushClient } from "./expoPush.js";
import type { SurveyFollowUp } from "@feedback-platform/shared";

export type IncidentPolicy = "optional" | "required";

export { IncidentRequiredError };

export function extractRating(
  answers: Array<{ questionId: string; value: string | number }>,
  survey: { questions: Array<{ id: string; type: string }> },
) {
  const ratingQuestion = survey.questions.find(
    (question) => question.type === "rating",
  );
  if (!ratingQuestion) {
    return undefined;
  }
  const answer = answers.find(
    (item) => item.questionId === ratingQuestion.id,
  );
  return typeof answer?.value === "number" ? answer.value : undefined;
}

export async function recordFeedback(input: {
  tenantId: Types.ObjectId | string;
  tenantName: string;
  surveyId: Types.ObjectId | string;
  locationId?: Types.ObjectId | string | null;
  customer: {
    name?: string;
    email?: string;
    phone?: string;
  };
  rating?: number;
  channel: Channel;
  locale: SurveyLocale;
  issueCategory?: string;
  followUp: SurveyFollowUp;
  answers: Array<{ questionId: string; value: string | number }>;
  incidentPolicy: IncidentPolicy;
  expoPushClient?: ExpoPushClient;
}) {
  validateFeedbackIntake({
    rating: input.rating,
    channel: input.channel,
    issueCategory: input.issueCategory,
    followUp: input.followUp,
  });

  if (
    input.incidentPolicy === "required" &&
    !shouldCreateIncident(input.rating)
  ) {
    throw new IncidentRequiredError();
  }

  const tenantId = input.tenantId.toString();
  const customer = await upsertCustomer({
    tenantId,
    name: input.customer.name,
    email: input.customer.email,
    phone: input.customer.phone,
    locationId: input.locationId?.toString(),
  });

  const submission = await Submission.create({
    tenantId: input.tenantId,
    surveyId: input.surveyId,
    locationId: input.locationId ?? undefined,
    customerId: customer._id,
    rating: input.rating,
    channel: input.channel,
    locale: input.locale,
    issueCategory: input.issueCategory,
    answers: input.answers,
  });

  let incident = null;
  if (shouldCreateIncident(input.rating)) {
    incident = await createForSubmission({
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      submissionId: submission._id,
      locationId: input.locationId,
      channel: input.channel,
      issueCategory: input.issueCategory,
      expoPushClient: input.expoPushClient,
    });
  }

  let reviewNudge: { googleReviewUrl: string } | undefined;
  if (
    input.rating !== undefined &&
    input.rating >= REVIEW_NUDGE_MIN_RATING &&
    input.locationId
  ) {
    const location = await Location.findOne({
      _id: input.locationId,
      tenantId: input.tenantId,
    });
    if (location?.googlePlaceId) {
      reviewNudge = {
        googleReviewUrl: buildGoogleReviewUrl(location.googlePlaceId),
      };
    }
  }

  return { customer, submission, incident, reviewNudge };
}
