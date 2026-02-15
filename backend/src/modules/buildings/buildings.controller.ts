import { Request, Response } from "express";
import * as buildingsService from "./buildings.service";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const queueBuilding = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { planetId, buildingType } = authReq.body;
    const userId = authReq.auth.userId;

    const queueItem = await buildingsService.addToQueue(
      userId,
      planetId,
      buildingType,
    );

    return res.status(201).json({
      message: "Building added to queue",
      data: queueItem,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
