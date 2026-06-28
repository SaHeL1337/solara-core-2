import { Request, Response } from "express";
import * as adminService from "./admin.service";

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await adminService.listAllUsers();
    res.status(200).json(users);
  } catch (err: any) {
    console.error("[Admin] Failed to list users:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    await adminService.deleteUser(userId);
    res.status(200).json({ success: true, message: `User ${userId} deleted` });
  } catch (err: any) {
    console.error("[Admin] Failed to delete user:", err);
    if (err.message === "User not found") {
      return res.status(404).json({ error: "User not found" });
    }
    if (err.message === "Cannot delete the SYSTEM user") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to delete user" });
  }
};
