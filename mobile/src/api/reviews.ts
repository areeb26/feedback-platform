import {
  replyReviewRequestSchema,
  reviewSchema,
  type ReplyReviewRequest,
  type Review,
} from "@feedback-platform/shared";
import { apiFetch } from "./client";

const reviewListSchema = reviewSchema.array();

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchReviews(
  slug: string,
  getToken: () => Promise<string | null>,
  query: Record<string, string> = {},
): Promise<Review[]> {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const payload = await apiFetch<unknown>(
    `${tenantBase(slug)}/reviews${qs ? `?${qs}` : ""}`,
    getToken,
  );
  return reviewListSchema.parse(payload);
}

export async function replyToReview(
  slug: string,
  reviewId: string,
  getToken: () => Promise<string | null>,
  input: ReplyReviewRequest,
): Promise<Review> {
  const body = replyReviewRequestSchema.parse(input);
  const payload = await apiFetch<unknown>(
    `${tenantBase(slug)}/reviews/${reviewId}/reply`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return reviewSchema.parse(payload);
}

export function formatReviewDate(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function reviewStatusLabel(status: Review["status"]) {
  if (status === "replied") return "Replied";
  if (status === "reply_not_supported") return "Reply Not Supported";
  return "Not Replied";
}
