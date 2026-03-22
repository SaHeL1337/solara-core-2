import { prisma } from "../../lib/prisma";
import { ResourceService } from "../resources/resourc.service";

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
  
  const now = new Date();
  const secondsElapsed = Math.max(0, (now.getTime() - spaceObject!.updatedAt.getTime()) / 1000);
  const productionRates = ResourceService.getProductionRates(buildings);
  
  const cap = planet.storageCapacity;
  const currentTit = spaceObject!.titanium;
  const currentSil = spaceObject!.silicate;
  const currentIso = spaceObject!.isotope;

  const newTitanium = currentTit >= cap ? currentTit : Math.min(currentTit + (productionRates.titanium / 3600) * secondsElapsed, cap);
  const newSilicate = currentSil >= cap ? currentSil : Math.min(currentSil + (productionRates.silicate / 3600) * secondsElapsed, cap);
  const newIsotope = currentIso >= cap ? currentIso : Math.min(currentIso + (productionRates.isotope / 3600) * secondsElapsed, cap);

  return {
    ...rest,
    ...spaceObject,
    buildings,
    titanium: newTitanium,
    silicate: newSilicate,
    isotope: newIsotope,
    production: productionRates,
  };
};

