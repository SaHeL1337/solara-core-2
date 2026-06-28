import { Request, Response } from "express";
import * as templatesService from "./templates.service";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const templates = await templatesService.getTemplates(userId);
    res.status(200).json({ data: templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getConfig = async (req: Request, res: Response) => {
  try {
    const config = templatesService.getConfig();
    res.status(200).json({ data: config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { name, buildings, ships, tagId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Template name is required" });
    }
    if (!Array.isArray(buildings)) {
      return res.status(400).json({ error: "Buildings sequence must be an array" });
    }
    if (!ships || typeof ships !== "object") {
      return res.status(400).json({ error: "Ships must be an object map of target amounts" });
    }

    const template = await templatesService.createTemplate(userId, name, buildings, ships, tagId);
    res.status(201).json({ message: "Template created successfully", data: template });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { id } = req.params;
    const { name, buildings, ships, tagId } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Template ID is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "Template name is required" });
    }
    if (!Array.isArray(buildings)) {
      return res.status(400).json({ error: "Buildings sequence must be an array" });
    }
    if (!ships || typeof ships !== "object") {
      return res.status(400).json({ error: "Ships must be an object map of target amounts" });
    }

    const template = await templatesService.updateTemplate(userId, id, name, buildings, ships, tagId);
    res.status(200).json({ message: "Template updated successfully", data: template });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Template ID is required" });
    }

    await templatesService.deleteTemplate(userId, id);
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const simulateTemplate = async (req: Request, res: Response) => {
  try {
    const { buildings, ships } = req.body;

    if (!Array.isArray(buildings) || !ships) {
      return res.status(400).json({ error: "Buildings array and ships map are required" });
    }

    const result = templatesService.simulateTemplate(buildings, ships);
    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
