import express, { type NextFunction, type Request, type Response } from "express";
import { healthResponseSchema } from "@feedback-platform/shared";
import { ZodError } from "zod";
import type { ClerkAdminClient } from "./auth/clerkAdmin.js";
import { createDefaultClerkAdminClient } from "./auth/clerkAdminClient.js";
import { defaultGetAuth, clerkMiddleware } from "./auth/clerk.js";
import { createAdminRoutes } from "./routes/admin.js";
import { createSurveyRoutes } from "./routes/surveys.js";
import { createPublicSubmissionRoutes } from "./routes/submissions.js";
import { createTenantRoutes } from "./routes/tenant.js";
import type { AuthContext } from "./types.js";

const APP_VERSION = "1.0.0";

export type AppOptions = {
  getAuth?: (req: Request) => AuthContext | null;
  superAdminUserIds?: string[];
  clerkClient?: ClerkAdminClient;
};

function parseSuperAdminIds(): string[] {
  return (process.env.SUPER_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function createApp(options: AppOptions = {}) {
  const getAuth = options.getAuth ?? defaultGetAuth;
  const superAdminUserIds = options.superAdminUserIds ?? parseSuperAdminIds();
  const clerkClient = resolveClerkClient(options);
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body = healthResponseSchema.parse({
      status: "ok",
      version: APP_VERSION,
    });
    res.json(body);
  });

  app.use("/api/public", createSurveyRoutes());
  app.use("/api/public", createPublicSubmissionRoutes());

  const tenantRouter = express.Router();
  if (!options.getAuth) {
    tenantRouter.use(clerkMiddleware());
  }
  tenantRouter.use(createTenantRoutes(getAuth));
  app.use("/api/tenant", tenantRouter);

  const adminRouter = express.Router();
  if (!options.getAuth) {
    adminRouter.use(clerkMiddleware());
  }
  adminRouter.use(createAdminRoutes(getAuth, superAdminUserIds, clerkClient));
  app.use("/api/admin", adminRouter);

  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.issues });
        return;
      }
      next(error);
    },
  );

  return app;
}

function resolveClerkClient(options: AppOptions): ClerkAdminClient {
  if (options.clerkClient) {
    return options.clerkClient;
  }
  if (options.getAuth) {
    return createNoopClerkClient();
  }
  if (process.env.CLERK_SECRET_KEY) {
    return createDefaultClerkAdminClient();
  }
  return createNoopClerkClient();
}

function createNoopClerkClient(): ClerkAdminClient {
  return {
    async createOrganization() {
      throw new Error("Clerk client not configured");
    },
    async inviteAdmin() {
      throw new Error("Clerk client not configured");
    },
  };
}
