import { z } from "zod";

export const surveyQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["rating", "text"]),
  label: z.string().min(1),
  required: z.boolean().default(true),
});

export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

export const surveySchema = z.object({
  id: z.string(),
  name: z.string(),
  previewSlug: z.string(),
  previewPath: z.string(),
  locationId: z.string().nullable(),
  submissionCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  questions: z.array(surveyQuestionSchema),
});

export type Survey = z.infer<typeof surveySchema>;

export const createSurveyRequestSchema = z.object({
  name: z.string().min(1),
  locationId: z.string().optional(),
  questions: z.array(surveyQuestionSchema).min(1),
});

export type CreateSurveyRequest = z.infer<typeof createSurveyRequestSchema>;

export const updateSurveyRequestSchema = z.object({
  name: z.string().min(1).optional(),
  locationId: z.string().nullable().optional(),
  questions: z.array(surveyQuestionSchema).min(1).optional(),
});

export type UpdateSurveyRequest = z.infer<typeof updateSurveyRequestSchema>;

export const publicSurveySchema = z.object({
  name: z.string(),
  tenantName: z.string(),
  primaryColor: z.string(),
  questions: z.array(surveyQuestionSchema),
});

export type PublicSurvey = z.infer<typeof publicSurveySchema>;
