import { Router } from "express";
import { fleetController } from "./fleet.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/dispatch", (req, res) => fleetController.dispatch(req, res));
router.get("/movements", (req, res) => fleetController.getMovements(req, res));

export default router;
