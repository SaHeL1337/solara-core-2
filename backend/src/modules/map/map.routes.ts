import { Router } from "express";
import * as mapController from "./map.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

// Used for fetching map chunks
router.get("/objects", mapController.getObjectsInBounds);

// Used for fleet targeting
router.get("/target", mapController.getTargetInfo);

// Used for fetching resources for a specific object
router.get("/objects/:id/resources", mapController.getSpaceObjectResources);

// Used for fetching scan reports for a specific object
router.get("/objects/:id/report", mapController.getSpaceObjectReport);

export default router;
