import { Router } from "express";
import * as planetsController from "./planets.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.get("/:planetId", requireAuth, planetsController.getPlanetState);

export default router;
