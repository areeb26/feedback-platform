import {
  importReviewsRequestSchema,
  importReviewsResponseSchema,
  replyReviewRequestSchema,
  reviewSchema,
  type ImportReviewsRequest,
  type ReplyReviewRequest,
  type Review,
} from "@feedback-platform/shared";

const reviewListSchema = reviewSchema.array();

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function fetchReviews(
  slug: string,
  query: Record<string, string> = {},
): Promise<Review[]> {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const response = await fetch(
    `${tenantBase(slug)}/reviews${qs ? `?${qs}` : ""}`,
  );
  if (!response.ok) {
    throw new Error("Failed to load reviews");
  }
  return reviewListSchema.parse(await response.json());
}

export async function importReviewsCsv(
  slug: string,
  input: ImportReviewsRequest,
): Promise<number> {
  const body = importReviewsRequestSchema.parse(input);
  const response = await fetch(`${tenantBase(slug)}/reviews/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to import reviews");
  }
  return importReviewsResponseSchema.parse(await response.json()).imported;
}

export async function replyToReview(
  slug: string,
  reviewId: string,
  input: ReplyReviewRequest,
): Promise<Review> {
  const body = replyReviewRequestSchema.parse(input);
  const response = await fetch(`${tenantBase(slug)}/reviews/${reviewId}/reply`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to reply to review");
  }
  return reviewSchema.parse(await response.json());
}

export function exportReviewsUrl(slug: string, query: Record<string, string> = {}) {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  return `${tenantBase(slug)}/reviews/export${qs ? `?${qs}` : ""}`;
}

export function formatReviewDate(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
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

export function sourceLabel(source: Review["source"]) {
  if (source === "google") return "Google";
  return "Foodpanda";
}

export type { Review };
