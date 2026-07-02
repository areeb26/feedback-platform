import type { Request, Response } from "express";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { getOverviewDashboard } from "../services/overview.js";

export function createOverviewRoutes(googleClient?: GoogleBusinessClient) {
  return {
    async get(req: Request, res: Response) {
      const dashboard = await getOverviewDashboard(
        req.tenant!.id,
        req.query,
        googleClient,
      );
      res.json(dashboard);
    },
  };
}
