import type { ReviewSource } from "@feedback-platform/shared";
import { createHash } from "node:crypto";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function splitCsvRecords(csv: string) {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '""';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      current += character;
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (current.trim()) {
        records.push(current);
      }
      current = "";
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    records.push(current);
  }
  return records;
}

export function parseReviewCsv(csv: string) {
  const lines = splitCsvRecords(csv.trim());
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.trim(), value.trim()]),
    );
  });
}

export function buildReviewExternalId(
  source: ReviewSource,
  row: Record<string, string>,
) {
  const providedId = row.externalId || row.id || row.reviewId;
  if (providedId) return providedId;

  return createHash("sha256")
    .update(
      [
        source,
        row.reviewerName,
        row.rating,
        row.content,
        row.locationName,
        row.listingName,
        row.postedAt,
      ].join("\0"),
    )
    .digest("hex");
}

export function formatCsvField(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
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
