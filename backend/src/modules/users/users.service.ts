import { prisma } from "../../lib/prisma";
import { ResourceService } from "../resources/resourc.service";
import { SpaceObjectType } from "../../generated/prisma/enums";
import { generateMapObjects } from "../map/map.generator";

// function to create the user

export const createUser = async (id: string) => {
  // 3. Initialize Game Data in your Prisma DB
  var user = await prisma.user.upsert({
    where: { id: id },
    update: {},
    create: {
      id: id,
      flux: 1000,
    },
  });

  if (!user) {
    throw new Error("Failed to create user");
  }

  // Find existing objects to determine spawn
  const existingObjects = await prisma.spaceObject.findMany({
    select: { x: true, y: true },
  });
  const isFirstPlayer = existingObjects.length === 0;

  const newObjects = generateMapObjects(existingObjects, isFirstPlayer, id);

  // The very first object in the array is the player's new planet
  const playerPlanetData = newObjects.shift();

  if (!playerPlanetData) {
    throw new Error("Failed to generate player planet data");
  }

  const planet = await prisma.spaceObject.create({
    data: {
      type: SpaceObjectType.PLANET,
      name: playerPlanetData.name,
      titanium: playerPlanetData.titanium,
      silicate: playerPlanetData.silicate,
      isotope: playerPlanetData.isotope,
      x: playerPlanetData.x,
      y: playerPlanetData.y,
      planet: {
        create: {
          ownerId: id, // user ID
        },
      },
    },
  });

  if (!planet) {
    throw new Error("Failed to create planet");
  }

  // Bulk insert the remaining 9,999 objects
  if (newObjects.length > 0) {
    await prisma.spaceObject.createMany({
      data: newObjects,
    });
  }

  return user;
};

export const getUserState = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      planets: {
        include: {
          buildings: true,
          spaceObject: true,
        },
      },
    },
  });

  if (!user) return null;

  const planetsWithProduction = user.planets.map((planet) => {
    const { buildings, spaceObject, ...rest } = planet;
    
    // Calculate on-the-fly resources
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
      ...spaceObject, // spread SpaceObject fields
      titanium: newTitanium,
      silicate: newSilicate,
      isotope: newIsotope,
      production: productionRates,
    };
  });

  return {
    ...user,
    planets: planetsWithProduction,
  };
};
