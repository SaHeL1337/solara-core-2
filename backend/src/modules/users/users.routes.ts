import { Router } from "express";
import * as usersController from "./users.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/create", usersController.createUser);
router.get("/state", requireAuth, usersController.getUserState);
router.get("/is-admin", requireAuth, usersController.isAdmin);

export default router;
