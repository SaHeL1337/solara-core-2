import { prisma } from "../../lib/prisma";

export const getPlanetState = async (userId: string, planetId: string) => {
  const planet = await prisma.planet.findUnique({
    where: { id: planetId, ownerId: userId },
    include: {
      buildings: true,
      spaceObject: true,
    },
  });

  if (!planet) return null;

  const { spaceObject, buildings, ...rest } = planet;
  return {
    ...rest,
    ...spaceObject,
    buildings,
  };
};
