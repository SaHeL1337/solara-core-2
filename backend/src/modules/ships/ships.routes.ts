import { Router } from "express";
import { getShipsHandler, queueShipsHandler } from "./ships.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/ships", getShipsHandler);

router.post("/queue", queueShipsHandler);

export default router;
