import { Router } from "express";
import * as mapController from "./map.controller";

const router = Router();

// Used for fetching map chunks
router.get("/objects", mapController.getObjectsInBounds);

// Used for fleet targeting
router.get("/target", mapController.getTargetInfo);

export default router;
