import { Router } from "express";
import * as adminController from "./admin.controller";
import { requireAuth } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/admin";

const router = Router();

router.get("/users", requireAuth, requireAdmin, adminController.listUsers);
router.delete("/users/:userId", requireAuth, requireAdmin, adminController.deleteUser);

export default router;
