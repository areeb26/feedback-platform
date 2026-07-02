import { z } from "zod";
import { channelSchema, surveyLocaleSchema } from "./feedbackIntake.js";

export const incidentTimelineEventSchema = z.object({
  status: z.enum(["created", "reviewed", "resolved"]),
  at: z.string(),
});

export type IncidentTimelineEvent = z.infer<typeof incidentTimelineEventSchema>;

export const incidentSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: z.enum(["created", "reviewed", "resolved"]),
  timeline: z.array(incidentTimelineEventSchema),
  createdAt: z.string(),
  rating: z.number().nullable(),
  surveyName: z.string(),
  locationName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  channel: channelSchema.nullable(),
  issueCategory: z.string().nullable(),
  assignees: z.array(z.string()),
});

export type Incident = z.infer<typeof incidentSchema>;

export const updateIncidentRequestSchema = z.object({
  status: z.enum(["reviewed", "resolved"]),
  assignees: z.array(z.string()).optional(),
});

export type UpdateIncidentRequest = z.infer<typeof updateIncidentRequestSchema>;

export const createIncidentRequestSchema = z.object({
  surveyId: z.string(),
  rating: z.number().int().min(1).max(5),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  channel: channelSchema.default("in_store"),
  locale: surveyLocaleSchema.default("en"),
  issueCategory: z.string().optional(),
});

export type CreateIncidentRequest = z.infer<typeof createIncidentRequestSchema>;
