import type { NextFunction, Request, Response } from "express";

export function requireSuperAdmin(superAdminUserIds: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth?.userId;
    if (!userId || !superAdminUserIds.includes(userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
