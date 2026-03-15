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
