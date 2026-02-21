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

export const getBuildings = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { planetId } = authReq.query;
    const userId = authReq.auth.userId;

    if (!planetId) {
      return res.status(400).json({ error: "Planet ID is required" });
    }

    const buildings = await buildingsService.getBuildings(
      userId,
      planetId as string,
    );

    return res.status(200).json({
      message: "Buildings fetched successfully",
      data: buildings,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
