import express from "express";
import { healthResponseSchema } from "@feedback-platform/shared";

const APP_VERSION = "1.0.0";

export function createApp() {
  const app = express();

  app.get("/api/health", (_req, res) => {
    const body = healthResponseSchema.parse({
      status: "ok",
      version: APP_VERSION,
    });
    res.json(body);
  });

  return app;
}
