import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import {
  createSurveyRequestSchema,
  defaultSurveyFollowUp,
  publicSurveyQuerySchema,
  publicSurveySchema,
  surveySchema,
  updateSurveyRequestSchema,
} from "@feedback-platform/shared";
import { Location } from "../models/location.js";
import { Survey } from "../models/survey.js";
import { Submission } from "../models/submission.js";
import { Tenant } from "../models/tenant.js";
import { generatePreviewSlug } from "../utils/previewSlug.js";

function toSurveyResponse(
  survey: {
    _id: { toString(): string };
    name: string;
    previewSlug: string;
    locationId?: { toString(): string } | null;
    questions: Array<{
      id: string;
      type: "rating" | "text";
      label: { en: string; ur: string };
      required?: boolean | null;
    }>;
    followUp: {
      enabled: boolean;
      triggerMaxRating: number;
      choicesByChannel: {
        in_store: Array<{ id: string; label: { en: string; ur: string } }>;
        takeaway: Array<{ id: string; label: { en: string; ur: string } }>;
        delivery: Array<{ id: string; label: { en: string; ur: string } }>;
      };
    };
    createdAt: Date;
  },
  submissionCount: number,
) {
  return surveySchema.parse({
    id: survey._id.toString(),
    name: survey.name,
    previewSlug: survey.previewSlug,
    previewPath: `/s/${survey.previewSlug}`,
    locationId: survey.locationId?.toString() ?? null,
    submissionCount,
    createdAt: survey.createdAt.toISOString(),
    questions: survey.questions.map((question) => ({
      id: question.id,
      type: question.type,
      label: question.label,
      required: question.required ?? true,
    })),
    followUp: survey.followUp,
  });
}

async function countSubmissions(surveyId: string) {
  return Submission.countDocuments({ surveyId });
}

export function createSurveyRoutes(): Router {
  const router = createRouter();

  router.get("/surveys/:previewSlug", async (req: Request, res: Response) => {
    const query = publicSurveyQuerySchema.parse(req.query);
    const survey = await Survey.findOne({ previewSlug: req.params.previewSlug });
    if (!survey) {
      res.status(404).json({ error: "Survey not found" });
      return;
    }

    const tenant = await Tenant.findById(survey.tenantId);
    if (!tenant || tenant.status === "suspended") {
      res.status(404).json({ error: "Survey not found" });
      return;
    }

    const locationId = query.location ?? survey.locationId?.toString() ?? null;
    let locationName: string | null = null;
    if (locationId) {
      const location = await Location.findOne({
        _id: locationId,
        tenantId: tenant._id,
      });
      locationName = location?.name ?? null;
    }

    res.json(
      publicSurveySchema.parse({
        name: survey.name,
        tenantName: tenant.name,
        primaryColor: tenant.primaryColor,
        questions: survey.questions.map(
          (question: {
            id: string;
            type: "rating" | "text";
            label: { en: string; ur: string };
            required?: boolean | null;
          }) => ({
          id: question.id,
          type: question.type,
          label: question.label,
          required: question.required ?? true,
        })),
        followUp: survey.followUp,
        channel: query.channel ?? null,
        locationId,
        locationName,
      }),
    );
  });

  return router;
}

export function createTenantSurveyRoutes(): {
  list: (req: Request, res: Response) => Promise<void>;
  create: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
} {
  return {
    async list(req, res) {
      const surveys = await Survey.find({ tenantId: req.tenant!.id }).sort({
        createdAt: -1,
      });
      const rows = await Promise.all(
        surveys.map(async (survey) =>
          toSurveyResponse(
            survey,
            await countSubmissions(survey._id.toString()),
          ),
        ),
      );
      res.json(rows);
    },

    async create(req, res) {
      const input = createSurveyRequestSchema.parse(req.body);
      const survey = await Survey.create({
        tenantId: req.tenant!.id,
        name: input.name,
        locationId: input.locationId,
        previewSlug: generatePreviewSlug(),
        questions: input.questions,
        followUp: input.followUp ?? defaultSurveyFollowUp(),
      });
      res.status(201).json(toSurveyResponse(survey, 0));
    },

    async update(req, res) {
      const input = updateSurveyRequestSchema.parse(req.body);
      const survey = await Survey.findOne({
        _id: req.params.surveyId,
        tenantId: req.tenant!.id,
      });
      if (!survey) {
        res.status(404).json({ error: "Survey not found" });
        return;
      }

      if (input.name !== undefined) survey.name = input.name;
      if (input.locationId !== undefined) {
        survey.locationId = input.locationId ?? undefined;
      }
      if (input.questions !== undefined) survey.questions = input.questions;
      if (input.followUp !== undefined) survey.followUp = input.followUp;

      await survey.save();
      res.json(
        toSurveyResponse(
          survey,
          await countSubmissions(survey._id.toString()),
        ),
      );
    },

    async remove(req, res) {
      const result = await Survey.deleteOne({
        _id: req.params.surveyId,
        tenantId: req.tenant!.id,
      });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Survey not found" });
        return;
      }
      res.status(204).send();
    },
  };
}

export function buildSurveyLink(
  previewSlug: string,
  input: { channel?: string; locationId?: string },
) {
  const params = new URLSearchParams();
  if (input.channel) {
    params.set("channel", input.channel);
  }
  if (input.locationId) {
    params.set("location", input.locationId);
  }
  const query = params.toString();
  return `/s/${previewSlug}${query ? `?${query}` : ""}`;
}
