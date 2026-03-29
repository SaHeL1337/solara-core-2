import { Request, Response } from "express";
import * as messagesService from "./messages.service";
import { MessageCategory } from "../../generated/prisma";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const getMessages = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const { isRead, category, tag, limit, offset } = req.query;

  const messages = await messagesService.getMessages(userId, {
    isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
    category: category as MessageCategory,
    tag: tag as string,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });

  res.status(200).json(messages);
};

export const markAsRead = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const messageId = req.params.messageId;

  await messagesService.markAsRead(userId, messageId);
  res.status(200).json({ success: true });
};

export const deleteMessage = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).auth.userId;
  const messageId = req.params.messageId;

  await messagesService.deleteMessage(userId, messageId);
  res.status(200).json({ success: true });
};
