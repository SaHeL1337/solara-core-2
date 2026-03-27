import { Request, Response } from "express";
import { fleetService } from "./fleet.service";

export class FleetController {
  async dispatch(req: Request, res: Response) {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { originId, targetId, missionType, ships } = req.body;

      if (!originId || !targetId || !missionType || !ships) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const movement = await fleetService.dispatchFleet(
        userId,
        originId,
        targetId,
        missionType,
        ships
      );

      res.status(201).json({
        message: "Fleet dispatched successfully",
        data: movement
      });
    } catch (error: any) {
      console.error("Fleet dispatch failed:", error);
      res.status(400).json({ error: error.message });
    }
  }

  async getMovements(req: Request, res: Response) {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const movements = await fleetService.getMovementsForUser(userId);

      res.json({ data: movements });
    } catch (error: any) {
      console.error("Failed to fetch fleet movements:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const fleetController = new FleetController();
