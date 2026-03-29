import { Request, Response } from "express";
import { statisticsService } from "./statistics.service";

export class StatisticsController {
  async getMiningStatistics(req: Request, res: Response) {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await statisticsService.getMiningStatistics(userId);

      res.json({ data: stats });
    } catch (error: any) {
      console.error("Failed to fetch mining stats:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const statisticsController = new StatisticsController();
