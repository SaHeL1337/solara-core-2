import { Request, Response } from "express";
import * as planetsService from "./planets.service";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const getPlanetState = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.auth.userId;
  const planetId = authReq.params.planetId;
  const planet = await planetsService.getPlanetState(userId, planetId);
  if (!planet) {
    return res.status(404).json({ error: "Planet not found" });
  }
  res.status(200).json(planet);
};
