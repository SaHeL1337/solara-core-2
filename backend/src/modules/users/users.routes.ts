import { Router } from "express";
import * as usersController from "./users.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/create", usersController.createUser);

export default router;
