import { Request, Response } from "express";
import { Webhook } from "svix";
import * as usersService from "./users.service";
import gameConfig from "../../config/game.json";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

interface GameConfig {
  gameAdmins: string[];
}

const config = gameConfig as GameConfig;

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
  let user = await usersService.getUserState(userId);

  if (!user) {
    // User has a Clerk account but no game data — set them up as a new player
    console.log(`[Users] Auto-creating game data for Clerk user: ${userId}`);
    try {
      await usersService.createUser(userId);
      user = await usersService.getUserState(userId);
    } catch (err) {
      console.error("[Users] Failed to auto-create user:", err);
      return res.status(500).json({ error: "Failed to initialize account" });
    }
  }

  if (!user) {
    return res.status(500).json({ error: "Failed to load user state" });
  }

  res.status(200).json(user);
};

export const isAdmin = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.auth.userId;
  const isAdmin = config.gameAdmins.includes(userId);
  res.status(200).json({ isAdmin });
};

