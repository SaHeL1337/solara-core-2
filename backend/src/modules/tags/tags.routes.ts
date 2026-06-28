import { Router } from "express";
import * as tagsController from "./tags.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", tagsController.getTags);
router.post("/", tagsController.createTag);
router.delete("/:id", tagsController.deleteTag);
router.post("/planets/:planetId/tags/:tagId", tagsController.assignTagToPlanet);
router.delete("/planets/:planetId/tags/:tagId", tagsController.removeTagFromPlanet);

export default router;
