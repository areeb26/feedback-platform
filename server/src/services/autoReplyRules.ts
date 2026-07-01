import type { HydratedDocument } from "mongoose";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { AutoReplyRule } from "../models/autoReplyRule.js";
import { Tenant } from "../models/tenant.js";
import type { ReviewDocument } from "../models/review.js";
import { postGoogleReviewReply } from "./googleReviews.js";

export function renderAutoReplyTemplate(
  template: string,
  input: { reviewerName: string; rating: number },
) {
  return template
    .replaceAll("{reviewerName}", input.reviewerName)
    .replaceAll("{rating}", String(input.rating));
}

export async function applyAutoReplyRules(input: {
  tenantId: string;
  review: HydratedDocument<ReviewDocument>;
  googleClient?: GoogleBusinessClient;
}) {
  const tenant = await Tenant.findById(input.tenantId);
  if (!tenant?.featureFlags?.aiReplies) {
    return;
  }

  if (input.review.status === "replied") {
    return;
  }

  const rules = await AutoReplyRule.find({
    tenantId: input.tenantId,
    enabled: true,
  }).sort({ maxRating: 1 });

  const rule = rules.find((row) => input.review.rating <= row.maxRating);
  if (!rule) {
    return;
  }

  const replyText = renderAutoReplyTemplate(rule.templateText, {
    reviewerName: input.review.reviewerName,
    rating: input.review.rating,
  });

  if (
    input.review.source === "google" &&
    input.review.externalId &&
    input.googleClient
  ) {
    try {
      await postGoogleReviewReply({
        tenantId: input.tenantId,
        reviewExternalId: input.review.externalId,
        replyText,
        client: input.googleClient,
      });
    } catch {
      // Save local reply even when Google post fails.
    }
  }

  input.review.status = "replied";
  input.review.replyText = replyText;
  input.review.repliedAt = new Date();
  await input.review.save();
}
