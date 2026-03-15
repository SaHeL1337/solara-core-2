import { Request, Response } from "express";
import { getShips, queueShips } from "./ships.service";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const getShipsHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const planetId = req.query.planetId as string;

    if (!planetId) {
      return res.status(400).json({ error: "Planet ID is required" });
    }

    const data = await getShips(userId, planetId);
    res.json({ data });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const queueShipsHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { planetId, shipType, quantity } = req.body;

    if (!planetId || !shipType || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await queueShips(userId, planetId, shipType, quantity);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
