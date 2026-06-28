import { Request, Response } from "express";
import * as tagsService from "./tags.service";

interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export const getTags = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const tags = await tagsService.getTags(userId);
    res.status(200).json({ data: tags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Tag name is required" });
    }

    const tag = await tagsService.createTag(userId, name, color);
    res.status(201).json({ message: "Tag created successfully", data: tag });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Tag ID is required" });
    }

    await tagsService.deleteTag(userId, id);
    res.status(200).json({ message: "Tag deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const assignTagToPlanet = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { planetId, tagId } = req.params;

    if (!planetId || !tagId) {
      return res.status(400).json({ error: "Planet ID and Tag ID are required" });
    }

    const result = await tagsService.assignTagToPlanet(userId, planetId, tagId);
    res.status(200).json({ message: "Tag assigned to planet successfully", data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const removeTagFromPlanet = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth.userId;
    const { planetId, tagId } = req.params;

    if (!planetId || !tagId) {
      return res.status(400).json({ error: "Planet ID and Tag ID are required" });
    }

    const result = await tagsService.removeTagFromPlanet(userId, planetId, tagId);
    res.status(200).json({ message: "Tag removed from planet successfully", data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
