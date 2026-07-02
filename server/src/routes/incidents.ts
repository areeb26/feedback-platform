import type { Request, Response } from "express";
import {
  createIncidentRequestSchema,
  updateIncidentRequestSchema,
} from "@feedback-platform/shared";
import { Survey } from "../models/survey.js";
import { Tenant } from "../models/tenant.js";
import {
  createNoopExpoPushClient,
  type ExpoPushClient,
} from "../services/expoPush.js";
import {
  getForTenant,
  listForTenant,
  updateForTenant,
} from "../services/incidents.js";
import { formatCsvField } from "../services/reviews.js";
import {
  IncidentRequiredError,
  recordFeedback,
} from "../services/submissionIntake.js";

export function createIncidentRoutes(
  expoPushClient: ExpoPushClient = createNoopExpoPushClient(),
) {
  return {
    async list(req: Request, res: Response) {
      const rows = await listForTenant(req.tenant!.id);
      res.json(rows);
    },

    async create(req: Request, res: Response) {
      const input = createIncidentRequestSchema.parse(req.body);
      const survey = await Survey.findOne({
        _id: input.surveyId,
        tenantId: req.tenant!.id,
      });
      if (!survey) {
        res.status(404).json({ error: "Survey not found" });
        return;
      }

      const tenant = await Tenant.findById(req.tenant!.id);
      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      try {
        const { incident } = await recordFeedback({
          tenantId: tenant._id,
          tenantName: tenant.name,
          surveyId: survey._id,
          locationId: survey.locationId,
          customer: {
            name: input.name,
            email: input.email,
            phone: input.phone,
          },
          rating: input.rating,
          channel: input.channel,
          locale: input.locale,
          issueCategory: input.issueCategory,
          followUp: survey.followUp,
          answers: [
            {
              questionId: survey.questions[0]?.id ?? "q1",
              value: input.rating,
            },
          ],
          incidentPolicy: "required",
          expoPushClient,
        });

        if (!incident) {
          res.status(400).json({
            error: "Rating above incident threshold; no incident created",
          });
          return;
        }

        const row = await getForTenant(
          req.tenant!.id,
          incident._id.toString(),
        );
        res.status(201).json(row);
      } catch (error) {
        if (error instanceof IncidentRequiredError) {
          res.status(400).json({ error: error.message });
          return;
        }
        throw error;
      }
    },

    async update(req: Request, res: Response) {
      const input = updateIncidentRequestSchema.parse(req.body);
      const row = await updateForTenant(
        req.tenant!.id,
        String(req.params.incidentId),
        input,
      );
      if (!row) {
        res.status(404).json({ error: "Incident not found" });
        return;
      }
      res.json(row);
    },

    async get(req: Request, res: Response) {
      const row = await getForTenant(
        req.tenant!.id,
        String(req.params.incidentId),
      );
      if (!row) {
        res.status(404).json({ error: "Incident not found" });
        return;
      }
      res.json(row);
    },

    async exportCsv(req: Request, res: Response) {
      const rows = await listForTenant(req.tenant!.id);
      const lines = [
        "Code,Status,Rating,Survey,Location,Channel,Issue Category,Customer Email,Created At",
      ];
      for (const incident of rows) {
        lines.push(
          [
            formatCsvField(incident.code),
            formatCsvField(incident.status),
            formatCsvField(incident.rating),
            formatCsvField(incident.surveyName),
            formatCsvField(incident.locationName),
            formatCsvField(incident.channel),
            formatCsvField(incident.issueCategory),
            formatCsvField(incident.customerEmail),
            formatCsvField(incident.createdAt),
          ].join(","),
        );
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="incidents.csv"',
      );
      res.send(lines.join("\n"));
    },
  };
}
