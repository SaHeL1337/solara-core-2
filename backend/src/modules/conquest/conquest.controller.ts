import { Request, Response } from "express";
import { conquestService } from "./conquest.service";

export class ConquestController {
  async getActiveConquests(req: Request, res: Response) {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const activeConquests = await conquestService.getActiveConquests(userId);
      res.json({ data: activeConquests });
    } catch (error: any) {
      console.error("Failed to fetch active conquests:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async getConquestStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { spaceObjectId } = req.params;
      if (!spaceObjectId) {
        return res.status(400).json({ error: "Missing spaceObjectId parameter" });
      }

      const status = await conquestService.getConquestStatus(spaceObjectId, userId);
      if (!status) {
        return res.status(404).json({ error: "No active conquest found at this location" });
      }

      res.json({ data: status });
    } catch (error: any) {
      console.error("Failed to fetch conquest status:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async fireDefense(req: Request, res: Response) {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { spaceObjectId } = req.params;
      if (!spaceObjectId) {
        return res.status(400).json({ error: "Missing spaceObjectId parameter" });
      }

      const result = await conquestService.fireDefense(userId, spaceObjectId);
      res.json({
        message: "Orbital defense fired successfully",
        data: result
      });
    } catch (error: any) {
      console.error("Failed to fire orbital defense:", error);
      res.status(400).json({ error: error.message });
    }
  }
}

export const conquestController = new ConquestController();
