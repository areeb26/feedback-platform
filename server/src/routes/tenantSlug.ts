import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import {
  createLocationRequestSchema,
  locationSchema,
  tenantShellSchema,
  updateLocationRequestSchema,
} from "@feedback-platform/shared";
import type { AuthContext } from "../types.js";
import { attachTenantFromSlug } from "../middleware/attachTenantFromSlug.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { Location } from "../models/location.js";
import {
  createTenantSurveyRoutes,
} from "./surveys.js";

function toLocationResponse(location: {
  _id: { toString(): string };
  name: string;
  address?: string | null;
  labels?: string[] | null;
}) {
  return locationSchema.parse({
    id: location._id.toString(),
    name: location.name,
    address: location.address ?? null,
    labels: location.labels ?? [],
  });
}

export function createTenantSlugRoutes(
  getAuth: (req: Request) => AuthContext | null,
): Router {
  const router = createRouter({ mergeParams: true });
  const guard = [requireAuth(getAuth), attachTenantFromSlug];

  router.get("/shell", ...guard, (req: Request, res: Response) => {
    res.json(
      tenantShellSchema.parse({
        slug: req.tenant!.slug,
        name: req.tenant!.name,
        logoUrl: req.tenant!.logoUrl,
        primaryColor: req.tenant!.primaryColor,
      }),
    );
  });

  router.get("/locations", ...guard, async (_req: Request, res: Response) => {
    const locations = await Location.find({ tenantId: _req.tenant!.id }).sort({
      name: 1,
    });
    res.json(locations.map(toLocationResponse));
  });

  router.post("/locations", ...guard, async (req: Request, res: Response) => {
    const input = createLocationRequestSchema.parse(req.body);
    const location = await Location.create({
      tenantId: req.tenant!.id,
      name: input.name,
      address: input.address,
      labels: input.labels ?? [],
    });
    res.status(201).json(toLocationResponse(location));
  });

  router.patch(
    "/locations/:locationId",
    ...guard,
    async (req: Request, res: Response) => {
      const input = updateLocationRequestSchema.parse(req.body);
      const location = await Location.findOne({
        _id: req.params.locationId,
        tenantId: req.tenant!.id,
      });
      if (!location) {
        res.status(404).json({ error: "Location not found" });
        return;
      }

      if (input.name !== undefined) location.name = input.name;
      if (input.address !== undefined) location.address = input.address;
      if (input.labels !== undefined) location.labels = input.labels;

      await location.save();
      res.json(toLocationResponse(location));
    },
  );

  const surveyRoutes = createTenantSurveyRoutes();

  router.get("/surveys", ...guard, surveyRoutes.list);
  router.post("/surveys", ...guard, surveyRoutes.create);
  router.patch("/surveys/:surveyId", ...guard, surveyRoutes.update);
  router.delete("/surveys/:surveyId", ...guard, surveyRoutes.remove);

  return router;
}
