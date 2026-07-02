import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import {
  customerSchema,
  submitSurveyRequestSchema,
  submitSurveyResponseSchema,
} from "@feedback-platform/shared";
import { Customer } from "../models/customer.js";
import { Location } from "../models/location.js";
import { Survey } from "../models/survey.js";
import { Tenant } from "../models/tenant.js";
import type { ExpoPushClient } from "../services/expoPush.js";
import { createNoopExpoPushClient } from "../services/expoPush.js";
import { FeedbackIntakeValidationError, resolveSubmissionLocationId } from "../services/feedbackIntakeValidation.js";
import {
  extractRating,
  recordFeedback,
} from "../services/submissionIntake.js";

export function createPublicSubmissionRoutes(
  expoPushClient: ExpoPushClient = createNoopExpoPushClient(),
): Router {
  const router = createRouter();

  router.post(
    "/surveys/:previewSlug/submit",
    async (req: Request, res: Response) => {
      try {
        const input = submitSurveyRequestSchema.parse(req.body);
        const survey = await Survey.findOne({
          previewSlug: req.params.previewSlug,
        });
        if (!survey) {
          res.status(404).json({ error: "Survey not found" });
          return;
        }

        const tenant = await Tenant.findById(survey.tenantId);
        if (!tenant || tenant.status === "suspended") {
          res.status(404).json({ error: "Survey not found" });
          return;
        }

        const locationId = resolveSubmissionLocationId({
          requestLocationId: input.locationId,
          surveyLocationId: survey.locationId?.toString() ?? null,
        });

        if (locationId) {
          const location = await Location.findOne({
            _id: locationId,
            tenantId: tenant._id,
          });
          if (!location) {
            res.status(400).json({ error: "Invalid location for survey" });
            return;
          }
        }

        const { submission, reviewNudge } = await recordFeedback({
          tenantId: tenant._id,
          tenantName: tenant.name,
          surveyId: survey._id,
          locationId,
          customer: {
            name: input.name,
            email: input.email,
            phone: input.phone,
          },
          rating: extractRating(input.answers, survey),
          channel: input.channel,
          locale: input.locale,
          issueCategory: input.issueCategory,
          followUp: survey.followUp,
          answers: input.answers,
          incidentPolicy: "optional",
          expoPushClient,
        });

        res.status(201).json(
          submitSurveyResponseSchema.parse({
            submissionId: submission._id.toString(),
            message: "Thank you for your feedback",
            reviewNudge,
          }),
        );
      } catch (error) {
        if (error instanceof FeedbackIntakeValidationError) {
          res.status(400).json({ error: error.message });
          return;
        }
        throw error;
      }
    },
  );

  return router;
}

export function createCustomerRoutes(): {
  list: (req: Request, res: Response) => Promise<void>;
  exportCsv: (req: Request, res: Response) => Promise<void>;
} {
  return {
    async list(req, res) {
      const customers = await Customer.find({
        tenantId: req.tenant!.id,
      }).sort({ createdAt: -1 });

      const rows = await Promise.all(
        customers.map(async (customer) => {
          const location = customer.mostRecentLocationId
            ? await Location.findById(customer.mostRecentLocationId)
            : null;
          return customerSchema.parse({
            id: customer._id.toString(),
            name: customer.name ?? null,
            email: customer.email ?? null,
            phone: customer.phone ?? null,
            mostRecentLocation: location?.name ?? null,
            createdAt: customer.createdAt.toISOString(),
          });
        }),
      );

      res.json(rows);
    },

    async exportCsv(req, res) {
      const customers = await Customer.find({
        tenantId: req.tenant!.id,
      }).sort({ createdAt: -1 });

      const lines = ["Name,Email,Phone,Most Recent Location,Created At"];
      for (const customer of customers) {
        const location = customer.mostRecentLocationId
          ? await Location.findById(customer.mostRecentLocationId)
          : null;
        lines.push(
          [
            customer.name ?? "",
            customer.email ?? "",
            customer.phone ?? "",
            location?.name ?? "",
            customer.createdAt.toISOString(),
          ].join(","),
        );
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="customers.csv"',
      );
      res.send(lines.join("\n"));
    },
  };
}
