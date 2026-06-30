import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import {
  customerSchema,
  submitSurveyRequestSchema,
  submitSurveyResponseSchema,
} from "@feedback-platform/shared";
import { Customer } from "../models/customer.js";
import { Location } from "../models/location.js";
import { Submission } from "../models/submission.js";
import { Survey } from "../models/survey.js";
import { Tenant } from "../models/tenant.js";

function extractRating(
  answers: Array<{ questionId: string; value: string | number }>,
  survey: { questions: Array<{ id: string; type: string }> },
) {
  const ratingQuestion = survey.questions.find(
    (question) => question.type === "rating",
  );
  if (!ratingQuestion) {
    return undefined;
  }
  const answer = answers.find(
    (item) => item.questionId === ratingQuestion.id,
  );
  return typeof answer?.value === "number" ? answer.value : undefined;
}

async function upsertCustomer(input: {
  tenantId: string;
  name?: string;
  email?: string;
  phone?: string;
  locationId?: string;
}) {
  const query = input.phone
    ? { tenantId: input.tenantId, phone: input.phone }
    : input.email
      ? { tenantId: input.tenantId, email: input.email }
      : null;

  let customer = query ? await Customer.findOne(query) : null;

  if (!customer) {
    customer = await Customer.create({
      tenantId: input.tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      mostRecentLocationId: input.locationId,
    });
    return customer;
  }

  if (input.name) customer.name = input.name;
  if (input.email) customer.email = input.email;
  if (input.phone) customer.phone = input.phone;
  if (input.locationId) customer.mostRecentLocationId = input.locationId;
  await customer.save();
  return customer;
}

export function createPublicSubmissionRoutes(): Router {
  const router = createRouter();

  router.post(
    "/surveys/:previewSlug/submit",
    async (req: Request, res: Response) => {
      const input = submitSurveyRequestSchema.parse(req.body);
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

      const customer = await upsertCustomer({
        tenantId: tenant._id.toString(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        locationId: survey.locationId?.toString(),
      });

      const submission = await Submission.create({
        tenantId: tenant._id,
        surveyId: survey._id,
        locationId: survey.locationId,
        customerId: customer._id,
        rating: extractRating(input.answers, survey),
        answers: input.answers,
      });

      res.status(201).json(
        submitSurveyResponseSchema.parse({
          submissionId: submission._id.toString(),
          message: "Thank you for your feedback",
        }),
      );
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
