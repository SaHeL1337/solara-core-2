import { Router } from "express";
import * as mapController from "./map.controller";

const router = Router();

// Used for fetching map chunks
router.get("/objects", mapController.getObjectsInBounds);

export default router;
