import { Router } from "express";
import * as tradingController from "./trading.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", tradingController.getTradingState);
router.post("/flux", tradingController.tradeForFlux);
router.post("/flux/max-all", tradingController.tradeMaxAllPlanets);

export default router;
