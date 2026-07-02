import {
  INCIDENT_RATING_THRESHOLD,
  type Channel,
  type SurveyFollowUp,
} from "@feedback-platform/shared";

export class FeedbackIntakeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackIntakeValidationError";
  }
}

export function resolveSubmissionLocationId(input: {
  requestLocationId?: string;
  surveyLocationId?: string | null;
}) {
  return input.requestLocationId ?? input.surveyLocationId ?? undefined;
}

export function validateFeedbackIntake(input: {
  rating?: number;
  channel: Channel;
  issueCategory?: string;
  followUp: SurveyFollowUp;
}) {
  const needsFollowUp =
    input.followUp.enabled &&
    input.rating !== undefined &&
    input.rating <= input.followUp.triggerMaxRating;

  if (!needsFollowUp) {
    if (input.issueCategory) {
      throw new FeedbackIntakeValidationError(
        "Issue category is only allowed for low ratings",
      );
    }
    return;
  }

  if (!input.issueCategory) {
    throw new FeedbackIntakeValidationError(
      "Issue category is required for low ratings",
    );
  }

  const allowed = input.followUp.choicesByChannel[input.channel].map(
    (choice) => choice.id,
  );
  if (!allowed.includes(input.issueCategory)) {
    throw new FeedbackIntakeValidationError("Invalid issue category for channel");
  }
}

export function shouldCreateIncident(rating: number | undefined) {
  return rating !== undefined && rating <= INCIDENT_RATING_THRESHOLD;
}
