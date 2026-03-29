import { prisma } from "../../lib/prisma";
import { MessageCategory } from "../../generated/prisma";

export const createMessage = async (params: {
  recipientId: string;
  senderId?: string;
  title: string;
  body: string;
  category?: MessageCategory;
  tags?: string[];
}) => {
  return await prisma.message.create({
    data: {
      recipientId: params.recipientId,
      senderId: params.senderId || "0",
      title: params.title,
      body: params.body,
      category: params.category || "SYSTEM",
      tags: params.tags || [],
    },
  });
};

export const getMessages = async (userId: string, options: {
  isRead?: boolean;
  category?: MessageCategory;
  tag?: string;
  limit?: number;
  offset?: number;
} = {}) => {
  const where: any = { recipientId: userId };
  if (options.isRead !== undefined) where.isRead = options.isRead;
  if (options.category) where.category = options.category;
  if (options.tag) where.tags = { has: options.tag };

  return await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit || 50,
    skip: options.offset || 0,
  });
};

export const markAsRead = async (userId: string, messageId: string) => {
  return await prisma.message.updateMany({
    where: { id: messageId, recipientId: userId },
    data: { isRead: true },
  });
};

export const deleteMessage = async (userId: string, messageId: string) => {
  return await prisma.message.deleteMany({
    where: { id: messageId, recipientId: userId },
  });
};
