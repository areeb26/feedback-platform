import type { Request, Response } from "express";
import { getIncidentAnalyticsDashboard } from "../services/incidentAnalytics.js";

export function createIncidentAnalyticsRoutes() {
  return {
    async get(req: Request, res: Response) {
      const dashboard = await getIncidentAnalyticsDashboard(
        req.tenant!.id,
        req.query,
      );
      res.json(dashboard);
    },
  };
}
