import { Request, Response } from "express";
import { TechtreeService } from "./techtree.service";

export class TechtreeController {
  static async getTechtree(req: Request, res: Response) {
    try {
      const userId = (req as any).auth.userId;
      const data = await TechtreeService.getTechtree(userId);
      res.json(data);
    } catch (error: any) {
      console.error("TECHTREE GET ERROR:", error);
      res.status(400).json({ error: error.message });
    }
  }

  static async startResearch(req: Request, res: Response) {
    try {
      const userId = (req as any).auth.userId;
      const { nodeId } = req.body;
      const result = await TechtreeService.startResearch(userId, nodeId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
