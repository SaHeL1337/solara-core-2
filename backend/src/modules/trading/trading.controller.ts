import { Request, Response } from "express";
import * as tradingService from "./trading.service";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const getTradingState = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { planetId } = req.query;

    if (!planetId || typeof planetId !== "string") {
      return res.status(400).json({ error: "planetId query parameter is required" });
    }

    const state = await tradingService.getTradingState(userId, planetId);
    res.status(200).json(state);
  } catch (error: any) {
    console.error("[Trading] getTradingState error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const tradeForFlux = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { planetId, fluxAmount } = req.body;

    if (!planetId) {
      return res.status(400).json({ error: "planetId is required" });
    }
    if (!fluxAmount || fluxAmount <= 0) {
      return res.status(400).json({ error: "fluxAmount must be a positive number" });
    }

    const trade = await tradingService.tradeForFlux(
      userId,
      planetId,
      Math.floor(fluxAmount)
    );

    res.status(200).json({
      message: "Trade executed successfully",
      data: trade,
    });
  } catch (error: any) {
    console.error("[Trading] tradeForFlux error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const tradeMaxAllPlanets = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;

    const result = await tradingService.tradeMaxAllPlanets(userId);

    res.status(200).json({
      message: "Max trade across all planets executed successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("[Trading] tradeMaxAllPlanets error:", error);
    res.status(400).json({ error: error.message });
  }
};
