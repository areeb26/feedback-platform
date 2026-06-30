import type { ReviewSource } from "@feedback-platform/shared";

export function parseReviewCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.trim(), value.trim()]),
    );
  });
}

export function defaultStatusForSource(source: ReviewSource) {
  if (source === "foodpanda") {
    return "reply_not_supported" as const;
  }
  return "not_replied" as const;
}

export function canReplyToReview(input: {
  source: ReviewSource;
  status: string;
  externalId?: string | null;
}) {
  return (
    input.source === "google" &&
    input.status === "not_replied" &&
    Boolean(input.externalId)
  );
}

export function reviewStatusLabel(status: string) {
  if (status === "replied") return "Replied";
  if (status === "reply_not_supported") return "Reply Not Supported";
  return "Not Replied";
}
