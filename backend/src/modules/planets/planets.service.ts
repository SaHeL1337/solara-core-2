import { prisma } from "../../lib/prisma";

export const getPlanetState = async (userId: string, planetId: string) => {
  return await prisma.planet.findUnique({
    where: { id: planetId, ownerId: userId },
    include: {
      buildings: true,
    },
  });
};
