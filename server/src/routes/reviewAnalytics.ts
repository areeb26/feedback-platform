import type { Request, Response } from "express";
import { getReviewAnalyticsDashboard } from "../services/reviewAnalytics.js";

export function createReviewAnalyticsRoutes() {
  return {
    async get(req: Request, res: Response) {
      const dashboard = await getReviewAnalyticsDashboard(
        req.tenant!.id,
        req.query,
      );
      res.json(dashboard);
    },
  };
}
