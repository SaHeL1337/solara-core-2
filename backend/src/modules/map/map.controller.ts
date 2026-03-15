import { Request, Response } from "express";
import * as mapService from "./map.service";
import { SpaceObjectType } from "../../generated/prisma/enums";

export const getObjectsInBounds = async (req: Request, res: Response) => {
  try {
    const minX = parseInt(req.query.minX as string, 10);
    const maxX = parseInt(req.query.maxX as string, 10);
    const minY = parseInt(req.query.minY as string, 10);
    const maxY = parseInt(req.query.maxY as string, 10);

    if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY)) {
      return res.status(400).json({ error: "Invalid coordinate bounds" });
    }

    const spaceObjects = await mapService.getObjectsInBounds(
      minX,
      maxX,
      minY,
      maxY,
    );

    // Map database enum types to frontend Map object types expected
    const formattedObjects = spaceObjects.map((obj) => {
      let mappedType = "planet";
      switch (obj.type) {
        case SpaceObjectType.PLANET:
          mappedType = "planet";
          break;
        case SpaceObjectType.ASTEROID:
          mappedType = "asteroid";
          break;
        case SpaceObjectType.BLACK_HOLE:
          mappedType = "anomaly";
          break;
      }

      return {
        id: obj.id,
        type: mappedType,
        name: obj.name,
        x: obj.x,
        y: obj.y,
        size: mappedType === "planet" ? 1.5 : 1,
        owner: (obj as any).planet?.owner?.id || undefined,
      };
    });

    return res.status(200).json({
      message: "Map objects fetched successfully",
      data: formattedObjects,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
