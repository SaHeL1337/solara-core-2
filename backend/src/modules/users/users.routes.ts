import { Router } from "express";
import * as usersController from "./users.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/create", usersController.createUser);
router.get("/state", requireAuth, usersController.getUserState);

export default router;
