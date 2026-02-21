import { Router } from "express";
import * as buildingsController from "./buildings.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/queue", requireAuth, buildingsController.queueBuilding);
router.get("/buildings", requireAuth, buildingsController.getBuildings);

export default router;
