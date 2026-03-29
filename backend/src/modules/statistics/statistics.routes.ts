import { Router } from "express";
import { statisticsController } from "./statistics.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/mining", (req, res) => statisticsController.getMiningStatistics(req, res));

export default router;
