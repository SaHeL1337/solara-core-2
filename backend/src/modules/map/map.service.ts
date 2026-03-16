import { prisma } from "../../lib/prisma";

export const getObjectsInBounds = async (
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
) => {
  const spaceObjects = await prisma.spaceObject.findMany({
    where: {
      x: { gte: minX, lte: maxX },
      y: { gte: minY, lte: maxY },
    },
    include: {
      planet: {
        include: {
          owner: true,
        },
      },
    },
  });

  return spaceObjects;
};

export const getTargetInfo = async (
  targetX: number,
  targetY: number,
  originPlanetId: string,
) => {
  const targetObject = await prisma.spaceObject.findFirst({
    where: { x: targetX, y: targetY },
    include: {
      planet: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (!targetObject) {
    throw new Error("No object found at these coordinates");
  }

  const originPlanet = await prisma.planet.findUnique({
    where: { id: originPlanetId },
    include: {
      spaceObject: true,
    },
  });

  if (!originPlanet) {
    throw new Error("Origin planet not found");
  }

  const dx = targetObject.x - originPlanet.spaceObject.x;
  const dy = targetObject.y - originPlanet.spaceObject.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return { targetObject, distance };
};

