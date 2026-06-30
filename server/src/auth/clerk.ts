import { clerkMiddleware, getAuth as clerkGetAuth } from "@clerk/express";
import type { Request } from "express";
import type { AuthContext } from "../types.js";

export function defaultGetAuth(req: Request): AuthContext | null {
  const auth = clerkGetAuth(req);
  if (!auth.userId) {
    return null;
  }
  return {
    userId: auth.userId,
    orgId: auth.orgId ?? null,
  };
}

export { clerkMiddleware };
