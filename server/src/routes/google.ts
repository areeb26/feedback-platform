import type { Request, Response } from "express";
import {
  googleConnectCallbackRequestSchema,
  googleConnectStartRequestSchema,
  googleConnectStartResponseSchema,
  googleConnectionSchema,
  googleSyncResponseSchema,
} from "@feedback-platform/shared";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { GoogleConnection } from "../models/googleConnection.js";
import {
  syncGoogleReviews,
  toGoogleConnectionResponse,
} from "../services/googleReviews.js";
import {
  consumeOAuthState,
  createOAuthState,
} from "../services/googleOAuthState.js";

export function createGoogleRoutes(client: GoogleBusinessClient) {
  return {
    async status(req: Request, res: Response) {
      const connection = await GoogleConnection.findOne({
        tenantId: req.tenant!.id,
      });
      res.json(
        googleConnectionSchema.parse(toGoogleConnectionResponse(connection)),
      );
    },

    async connect(req: Request, res: Response) {
      const input = googleConnectStartRequestSchema.parse(req.body);
      const state = createOAuthState(req.tenant!.id);

      res.json(
        googleConnectStartResponseSchema.parse({
          authUrl: client.buildAuthUrl({
            redirectUri: input.redirectUri,
            state,
          }),
          state,
        }),
      );
    },

    async callback(req: Request, res: Response) {
      const input = googleConnectCallbackRequestSchema.parse(req.body);

      if (!consumeOAuthState(input.state, req.tenant!.id)) {
        res.status(400).json({ error: "Invalid OAuth state" });
        return;
      }

      try {
        const tokens = await client.exchangeCode({
          code: input.code,
          redirectUri: input.redirectUri,
        });

        const connection = await GoogleConnection.findOneAndUpdate(
          { tenantId: req.tenant!.id },
          {
            accountId: tokens.accountId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            status: "connected",
            errorMessage: undefined,
          },
          { upsert: true, new: true },
        );

        res.json(
          googleConnectionSchema.parse(toGoogleConnectionResponse(connection)),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "OAuth failed";
        await GoogleConnection.findOneAndUpdate(
          { tenantId: req.tenant!.id },
          {
            accountId: "error",
            accessToken: "error",
            refreshToken: "error",
            expiresAt: new Date(0),
            status: "error",
            errorMessage: message,
          },
          { upsert: true },
        );
        res.status(502).json({ error: message });
      }
    },

    async sync(req: Request, res: Response) {
      try {
        const result = await syncGoogleReviews({
          tenantId: req.tenant!.id,
          client,
        });
        res.json(googleSyncResponseSchema.parse(result));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Google sync failed";
        res.status(502).json({ error: message });
      }
    },
  };
}
