import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import {
  createLocationRequestSchema,
  locationSchema,
  tenantShellSchema,
  updateLocationRequestSchema,
} from "@feedback-platform/shared";
import type { AuthContext } from "../types.js";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { createNoopGoogleBusinessClient } from "../auth/googleBusiness.js";
import type { GooglePlacesClient } from "../auth/googlePlaces.js";
import { createNoopGooglePlacesClient } from "../auth/googlePlaces.js";
import { attachTenantFromSlug } from "../middleware/attachTenantFromSlug.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { Location } from "../models/location.js";
import {
  createTenantSurveyRoutes,
} from "./surveys.js";
import { createCustomerRoutes } from "./submissions.js";
import { createIncidentRoutes } from "./incidents.js";
import { createOverviewRoutes } from "./overview.js";
import { createIncidentAnalyticsRoutes } from "./incidentAnalytics.js";
import { createReviewRoutes } from "./reviews.js";
import { createReviewAnalyticsRoutes } from "./reviewAnalytics.js";
import { createGoogleRoutes } from "./google.js";
import { createListingRoutes } from "./listings.js";
import { createCompetitorRoutes } from "./competitors.js";
import { createAutoReplyRuleRoutes } from "./autoReplyRules.js";
import type { OpenAiClient } from "../auth/openai.js";
import { createNoopOpenAiClient } from "../auth/openai.js";

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
  googleClient: GoogleBusinessClient = createNoopGoogleBusinessClient(),
  placesClient: GooglePlacesClient = createNoopGooglePlacesClient(),
  openAiClient: OpenAiClient = createNoopOpenAiClient(),
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
        featureFlags: req.tenant!.featureFlags,
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

  const customerRoutes = createCustomerRoutes();
  router.get("/customers", ...guard, customerRoutes.list);
  router.get("/customers/export", ...guard, customerRoutes.exportCsv);

  const incidentRoutes = createIncidentRoutes();
  router.get("/incidents", ...guard, incidentRoutes.list);
  router.post("/incidents", ...guard, incidentRoutes.create);
  router.patch("/incidents/:incidentId", ...guard, incidentRoutes.update);

  const overviewRoutes = createOverviewRoutes(googleClient);
  router.get("/overview", ...guard, overviewRoutes.get);

  const incidentAnalyticsRoutes = createIncidentAnalyticsRoutes();
  router.get(
    "/analytics/incidents",
    ...guard,
    incidentAnalyticsRoutes.get,
  );

  const reviewRoutes = createReviewRoutes(googleClient, openAiClient);
  router.get("/reviews", ...guard, reviewRoutes.list);
  router.post("/reviews/import", ...guard, reviewRoutes.importCsv);
  router.post("/reviews/generate-replies", ...guard, reviewRoutes.generateReplies);
  router.patch("/reviews/:reviewId/reply", ...guard, reviewRoutes.reply);
  router.get("/reviews/export", ...guard, reviewRoutes.exportCsv);

  const autoReplyRuleRoutes = createAutoReplyRuleRoutes();
  router.get("/auto-reply-rules", ...guard, autoReplyRuleRoutes.list);
  router.post("/auto-reply-rules", ...guard, autoReplyRuleRoutes.create);
  router.patch(
    "/auto-reply-rules/:ruleId",
    ...guard,
    autoReplyRuleRoutes.update,
  );
  router.delete(
    "/auto-reply-rules/:ruleId",
    ...guard,
    autoReplyRuleRoutes.remove,
  );

  const reviewAnalyticsRoutes = createReviewAnalyticsRoutes();
  router.get(
    "/analytics/reviews",
    ...guard,
    reviewAnalyticsRoutes.get,
  );

  const googleRoutes = createGoogleRoutes(googleClient);
  router.get("/google/status", ...guard, googleRoutes.status);
  router.post("/google/connect", ...guard, googleRoutes.connect);
  router.post("/google/callback", ...guard, googleRoutes.callback);
  router.post("/google/sync", ...guard, googleRoutes.sync);

  const listingRoutes = createListingRoutes(googleClient);
  router.get("/listings", ...guard, listingRoutes.list);
  router.post("/listings/sync", ...guard, listingRoutes.sync);

  const competitorRoutes = createCompetitorRoutes(placesClient);
  router.get("/competitors", ...guard, competitorRoutes.list);
  router.post("/competitors", ...guard, competitorRoutes.create);
  router.patch(
    "/competitors/:competitorId",
    ...guard,
    competitorRoutes.update,
  );
  router.delete(
    "/competitors/:competitorId",
    ...guard,
    competitorRoutes.remove,
  );
  router.post("/competitors/refresh", ...guard, competitorRoutes.refresh);
  router.get(
    "/analytics/competitors",
    ...guard,
    competitorRoutes.analytics,
  );

  return router;
}
