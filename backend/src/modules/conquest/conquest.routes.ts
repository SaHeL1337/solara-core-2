import { Router } from "express";
import { conquestController } from "./conquest.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/active", (req, res) => conquestController.getActiveConquests(req, res));
router.get("/status/:spaceObjectId", (req, res) => conquestController.getConquestStatus(req, res));
router.post("/defend/:spaceObjectId", (req, res) => conquestController.fireDefense(req, res));

export default router;
