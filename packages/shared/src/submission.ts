import { z } from "zod";

export const submissionAnswerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number()]),
});

export const submitSurveyRequestSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  answers: z.array(submissionAnswerSchema).min(1),
});

export type SubmitSurveyRequest = z.infer<typeof submitSurveyRequestSchema>;

export const submitSurveyResponseSchema = z.object({
  submissionId: z.string(),
  message: z.string(),
});

export type SubmitSurveyResponse = z.infer<typeof submitSurveyResponseSchema>;

export const customerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  mostRecentLocation: z.string().nullable(),
  createdAt: z.string(),
});

export type Customer = z.infer<typeof customerSchema>;
