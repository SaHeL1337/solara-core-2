import { Router } from "express";
import { TechtreeController } from "./techtree.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.get("/", requireAuth, TechtreeController.getTechtree);
router.post("/research", requireAuth, TechtreeController.startResearch);

export default router;
