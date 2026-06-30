import type { NextFunction, Request, Response } from "express";
import type { AuthContext } from "../types.js";

export function requireAuth(getAuth: (req: Request) => AuthContext | null) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.auth = auth;
    next();
  };
}
