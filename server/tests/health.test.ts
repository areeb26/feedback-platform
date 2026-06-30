import request from "supertest";
import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "@feedback-platform/shared";
import { createApp } from "../src/app.js";

describe("GET /api/health", () => {
  it("returns ok status and version", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: "ok",
      version: "1.0.0",
    });
  });
});
