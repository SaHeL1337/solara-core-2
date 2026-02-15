import { Request, Response } from "express";
import { Webhook } from "svix";
import * as usersService from "./users.service";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const createUser = async (req: Request, res: Response) => {
  //only usable by the clerk api
  const payload = (req as any).rawBody;
  const headers = req.headers;
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: any;
  try {
    evt = wh.verify(payload, headers as any);
  } catch (err) {
    return res.status(400).json({ error: "Invalid signature" });
  }
  const { id, username, email_addresses } = evt.data;
  // 2. Handle 'user.created' event
  if (evt.type === "user.created") {
    try {
      await usersService.createUser(id);
    } catch (err) {
      console.error("Failed to create user:", err);
    }

    res.status(200).json({ success: true });
  }
};

export const getUserState = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.auth.userId;
  const user = await usersService.getUserState(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.status(200).json(user);
};
