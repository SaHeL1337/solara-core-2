import { Request, Response, NextFunction } from "express";
import gameConfig from "../config/game.json";

interface GameConfig {
  gameAdmins: string[];
}

const config = gameConfig as GameConfig;

/**
 * Middleware that checks if the authenticated user is a game admin.
 * Must be used AFTER requireAuth middleware.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = (req as any).auth?.userId;

  if (!userId || !config.gameAdmins.includes(userId)) {
    return res.status(403).json({ error: "Forbidden: admin access required" });
  }

  next();
};
