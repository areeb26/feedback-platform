import type { Channel, Incident, Review } from "@feedback-platform/shared";
import {
  channelLabelEn,
  issueCategoryLabelEn,
} from "@feedback-platform/shared";

export function statusLabel(status: Incident["status"]) {
  if (status === "reviewed") return "Reviewed";
  if (status === "resolved") return "Resolved";
  return "Created";
}

export function reviewStatusLabel(status: Review["status"]) {
  if (status === "replied") return "Replied";
  if (status === "reply_not_supported") return "Reply Not Supported";
  return "Not Replied";
}

export { channelLabelEn, issueCategoryLabelEn };

export function incidentContextLabel(incident: {
  channel: Channel | null;
  issueCategory: string | null;
}) {
  const parts: string[] = [];
  if (incident.channel) {
    parts.push(channelLabelEn(incident.channel));
  }
  if (incident.issueCategory) {
    parts.push(issueCategoryLabelEn(incident.issueCategory));
  }
  return parts.join(" · ");
}
