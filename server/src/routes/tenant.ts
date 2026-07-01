import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import {
  registerPushTokenRequestSchema,
  registerPushTokenResponseSchema,
  tenantProfileSchema,
} from "@feedback-platform/shared";
import type { AuthContext } from "../types.js";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { createNoopGoogleBusinessClient } from "../auth/googleBusiness.js";
import type { GooglePlacesClient } from "../auth/googlePlaces.js";
import { createNoopGooglePlacesClient } from "../auth/googlePlaces.js";
import type { OpenAiClient } from "../auth/openai.js";
import { createNoopOpenAiClient } from "../auth/openai.js";
import { PushToken } from "../models/pushToken.js";
import {
  createNoopExpoPushClient,
  type ExpoPushClient,
} from "../services/expoPush.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireTenantSlug } from "../middleware/requireTenantSlug.js";
import { resolveTenant } from "../middleware/resolveTenant.js";
import { createTenantSlugRoutes } from "./tenantSlug.js";

export function createTenantRoutes(
  getAuth: (req: Request) => AuthContext | null,
  googleClient: GoogleBusinessClient = createNoopGoogleBusinessClient(),
  placesClient: GooglePlacesClient = createNoopGooglePlacesClient(),
  openAiClient: OpenAiClient = createNoopOpenAiClient(),
  expoPushClient: ExpoPushClient = createNoopExpoPushClient(),
): Router {
  const router = createRouter();

  router.get(
    "/me",
    requireAuth(getAuth),
    resolveTenant,
    (req: Request, res: Response) => {
      const body = tenantProfileSchema.parse({
        slug: req.tenant!.slug,
        name: req.tenant!.name,
      });
      res.json(body);
    },
  );

  router.post(
    "/me/push-token",
    requireAuth(getAuth),
    resolveTenant,
    async (req: Request, res: Response) => {
      const input = registerPushTokenRequestSchema.parse(req.body);
      await PushToken.findOneAndUpdate(
        { userId: req.auth!.userId, tenantId: req.tenant!.id },
        { token: input.token, updatedAt: new Date() },
        { upsert: true, new: true },
      );
      res.json(registerPushTokenResponseSchema.parse({ ok: true }));
    },
  );

  router.get(
    "/by-slug/:slug",
    requireAuth(getAuth),
    requireTenantSlug("slug"),
    (req: Request, res: Response) => {
      const body = tenantProfileSchema.parse({
        slug: req.tenant!.slug,
        name: req.tenant!.name,
      });
      res.json(body);
    },
  );

  router.use(
    "/by-slug/:slug",
    createTenantSlugRoutes(
      getAuth,
      googleClient,
      placesClient,
      openAiClient,
      expoPushClient,
    ),
  );

  return router;
}
