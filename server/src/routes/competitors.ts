import type { Request, Response } from "express";
import {
  competitorAnalyticsQuerySchema,
  competitorAnalyticsSchema,
  competitorRefreshResponseSchema,
  competitorSchema,
  createCompetitorRequestSchema,
  updateCompetitorRequestSchema,
} from "@feedback-platform/shared";
import type { GooglePlacesClient } from "../auth/googlePlaces.js";
import {
  createCompetitor,
  deleteCompetitor,
  getCompetitorAnalytics,
  listCompetitors,
  refreshCompetitors,
  updateCompetitor,
} from "../services/competitors.js";

function requireCompetitorAnalytics(req: Request, res: Response) {
  if (!req.tenant?.featureFlags.competitorAnalytics) {
    res.status(403).json({ error: "Competitor analytics not enabled" });
    return false;
  }
  return true;
}

export function createCompetitorRoutes(placesClient: GooglePlacesClient) {
  return {
    async list(req: Request, res: Response) {
      if (!requireCompetitorAnalytics(req, res)) return;
      const competitors = await listCompetitors(req.tenant!.id);
      res.json(competitors.map((row) => competitorSchema.parse(row)));
    },

    async create(req: Request, res: Response) {
      if (!requireCompetitorAnalytics(req, res)) return;
      const input = createCompetitorRequestSchema.parse(req.body);
      try {
        const competitor = await createCompetitor(
          req.tenant!.id,
          input,
          placesClient,
        );
        res.status(201).json(competitorSchema.parse(competitor));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Competitor create failed";
        res.status(502).json({ error: message });
      }
    },

    async update(req: Request, res: Response) {
      if (!requireCompetitorAnalytics(req, res)) return;
      const input = updateCompetitorRequestSchema.parse(req.body);
      try {
        const competitor = await updateCompetitor(
          req.tenant!.id,
          String(req.params.competitorId),
          input,
          placesClient,
        );
        if (!competitor) {
          res.status(404).json({ error: "Competitor not found" });
          return;
        }
        res.json(competitorSchema.parse(competitor));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Competitor update failed";
        res.status(502).json({ error: message });
      }
    },

    async remove(req: Request, res: Response) {
      if (!requireCompetitorAnalytics(req, res)) return;
      const deleted = await deleteCompetitor(
        req.tenant!.id,
        String(req.params.competitorId),
      );
      if (!deleted) {
        res.status(404).json({ error: "Competitor not found" });
        return;
      }
      res.status(204).send();
    },

    async refresh(req: Request, res: Response) {
      if (!requireCompetitorAnalytics(req, res)) return;
      try {
        const result = await refreshCompetitors({
          tenantId: req.tenant!.id,
          client: placesClient,
        });
        res.json(competitorRefreshResponseSchema.parse(result));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Competitor refresh failed";
        res.status(502).json({ error: message });
      }
    },

    async analytics(req: Request, res: Response) {
      if (!requireCompetitorAnalytics(req, res)) return;
      const query = competitorAnalyticsQuerySchema.parse(req.query);
      const competitorIds = query.competitorIds
        ? query.competitorIds.split(",").filter(Boolean)
        : undefined;

      const analytics = await getCompetitorAnalytics({
        tenantId: req.tenant!.id,
        tenantName: req.tenant!.name,
        competitorIds,
        search: query.search,
      });

      res.json(competitorAnalyticsSchema.parse(analytics));
    },
  };
}
