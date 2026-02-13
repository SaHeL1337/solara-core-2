import { Router } from "express";
import * as buildingsController from "./buildings.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/queue", requireAuth, buildingsController.queueBuilding);

export default router;
