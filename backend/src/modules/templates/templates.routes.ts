import { Router } from "express";
import * as templatesController from "./templates.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", templatesController.getTemplates);
router.get("/config", templatesController.getConfig);
router.post("/", templatesController.createTemplate);
router.put("/:id", templatesController.updateTemplate);
router.delete("/:id", templatesController.deleteTemplate);
router.post("/simulate", templatesController.simulateTemplate);

export default router;
