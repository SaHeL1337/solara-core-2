import { Router } from "express";
import * as messagesController from "./messages.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", messagesController.getMessages);
router.put("/:messageId/read", messagesController.markAsRead);
router.delete("/:messageId", messagesController.deleteMessage);

export default router;

