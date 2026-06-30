import express, { type Request } from "express";
import { healthResponseSchema } from "@feedback-platform/shared";
import { defaultGetAuth, clerkMiddleware } from "./auth/clerk.js";
import { createAdminRoutes } from "./routes/admin.js";
import { createTenantRoutes } from "./routes/tenant.js";
import type { AuthContext } from "./types.js";

const APP_VERSION = "1.0.0";

export type AppOptions = {
  getAuth?: (req: Request) => AuthContext | null;
  superAdminUserIds?: string[];
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
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body = healthResponseSchema.parse({
      status: "ok",
      version: APP_VERSION,
    });
    res.json(body);
  });

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
  adminRouter.use(createAdminRoutes(getAuth, superAdminUserIds));
  app.use("/api/admin", adminRouter);

  return app;
}
