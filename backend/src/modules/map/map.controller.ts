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
    const formattedObjects = spaceObjects.map((obj: any) => {
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
        titanium: obj.titanium,
        silicate: obj.silicate,
        isotope: obj.isotope,
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

export const getTargetInfo = async (req: Request, res: Response) => {
  try {
    const x = parseInt(req.query.x as string, 10);
    const y = parseInt(req.query.y as string, 10);
    const originPlanetId = req.query.originPlanetId as string;

    if (isNaN(x) || isNaN(y) || !originPlanetId) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const { targetObject: obj, distance } = await mapService.getTargetInfo(
      x,
      y,
      originPlanetId,
    );

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

    const formattedTarget = {
      id: obj.id,
      type: mappedType,
      name: obj.name,
      x: obj.x,
      y: obj.y,
      size: mappedType === "planet" ? 1.5 : 1,
      owner: (obj as any).planet?.owner?.id || undefined,
      distance: Number(distance.toFixed(2)),
      titanium: obj.titanium,
      silicate: obj.silicate,
      isotope: obj.isotope,
    };

    return res.status(200).json({
      message: "Target info fetched successfully",
      data: formattedTarget,
    });
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};

export const getSpaceObjectResources = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing space object ID" });
    }

    const resources = await mapService.getSpaceObjectResources(id);
    return res.status(200).json({
      message: "Resources fetched successfully",
      data: resources,
    });
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};

