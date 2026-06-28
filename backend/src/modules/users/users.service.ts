import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { ResourceService } from "../resources/resourc.service";
import { SpaceObjectType } from "../../generated/prisma";
import { generateMapObjects } from "../map/map.generator";
import gameConfig from "../../config/game.json";

export const createUser = async (id: string) => {
  // Ensure we have a SYSTEM user for NPC planets
  const systemUser = await prisma.user.upsert({
    where: { id: "SYSTEM" },
    update: {},
    create: {
      id: "SYSTEM",
      flux: 0,
    },
  });

  // 1. Initialize the new Player User
  var user = await prisma.user.upsert({
    where: { id: id },
    update: {},
    create: {
      id: id,
      flux: gameConfig.newPlayerSetup.flux,
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

  const newObjectsRaw = generateMapObjects(existingObjects, isFirstPlayer, id);

  // Separate the player planet
  const playerPlanetDataRaw = newObjectsRaw.shift();
  if (!playerPlanetDataRaw) {
    throw new Error("Failed to generate player planet data");
  }

  // Helper to process objects into lists for batch insertion
  const spaceObjectsToCreate: any[] = [];
  const planetsToCreate: any[] = [];
  const planetBuildingsToCreate: any[] = [];
  const planetShipsToCreate: any[] = [];

  // Function to process a raw object (from generator) into database-ready chunks
  const processObject = (raw: any, ownerId: string) => {
    const objectId = randomUUID();
    spaceObjectsToCreate.push({
      id: objectId,
      type: raw.type,
      name: raw.name,
      titanium: raw.titanium,
      silicate: raw.silicate,
      isotope: raw.isotope,
      x: raw.x,
      y: raw.y,
    });

    if (raw.type === SpaceObjectType.PLANET) {
      planetsToCreate.push({
        id: objectId,
        ownerId: ownerId,
        population: 500,
        populationCapacity: 1000,
        storageCapacity: 10000,
      });

      if (raw.buildings) {
        raw.buildings.forEach((b: any) => {
          planetBuildingsToCreate.push({
            planetId: objectId,
            type: b.type,
            level: b.level,
          });
        });
      }

      if (raw.ships) {
        raw.ships.forEach((s: any) => {
          planetShipsToCreate.push({
            planetId: objectId,
            type: s.type,
            count: s.count,
          });
        });
      }
    }
  };

  // Process player planet first
  processObject(playerPlanetDataRaw, id);

  // Process the rest as SYSTEM-owned
  newObjectsRaw.forEach((raw) => processObject(raw, "SYSTEM"));

  // Now bulk insert everything in order
  console.log(`Creating ${spaceObjectsToCreate.length} objects...`);
  await prisma.spaceObject.createMany({ data: spaceObjectsToCreate });
  
  console.log(`Creating ${planetsToCreate.length} planets...`);
  await prisma.planet.createMany({ data: planetsToCreate });

  console.log(`Creating ${planetBuildingsToCreate.length} buildings...`);
  await prisma.planetBuilding.createMany({ data: planetBuildingsToCreate });

  console.log(`Creating ${planetShipsToCreate.length} ships...`);
  await prisma.planetShip.createMany({ data: planetShipsToCreate });

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
      sovereignty: planet.sovereignty,
      sovereigntyUpdatedAt: planet.sovereigntyUpdatedAt,
    };
  });

  return {
    ...user,
    planets: planetsWithProduction,
    isSetupComplete: user.isSetupComplete,
    isDefeated: user.isDefeated,
    displayName: user.displayName,
    playerClass: user.playerClass,
  };
};

export const completePlayerSetup = async (
  userId: string,
  displayName: string,
  playerClass: string,
) => {
  const validClasses = (gameConfig as any).playerClasses || [];
  if (!validClasses.includes(playerClass)) {
    throw new Error(`Invalid player class. Choose from: ${validClasses.join(", ")}`);
  }

  if (!displayName || displayName.trim().length < 2 || displayName.trim().length > 24) {
    throw new Error("Display name must be between 2 and 24 characters");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { planets: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // If the user is defeated and has no planets, give them a fresh start
  if (user.isDefeated || user.planets.length === 0) {
    await resetDefeatedPlayer(userId);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: displayName.trim(),
      playerClass,
      isSetupComplete: true,
      isDefeated: false,
    },
  });

  return { success: true };
};

export const resetDefeatedPlayer = async (userId: string) => {
  // Reset flux
  await prisma.user.update({
    where: { id: userId },
    data: {
      flux: gameConfig.newPlayerSetup.flux,
    },
  });

  // Find existing objects to determine spawn location
  const existingObjects = await prisma.spaceObject.findMany({
    select: { x: true, y: true },
  });

  const newObjectsRaw = generateMapObjects(existingObjects, false, userId);

  // Separate the player planet
  const playerPlanetDataRaw = newObjectsRaw.shift();
  if (!playerPlanetDataRaw) {
    throw new Error("Failed to generate player planet data");
  }

  const { randomUUID } = await import("crypto");

  const spaceObjectsToCreate: any[] = [];
  const planetsToCreate: any[] = [];
  const planetBuildingsToCreate: any[] = [];
  const planetShipsToCreate: any[] = [];

  const processObject = (raw: any, ownerId: string) => {
    const objectId = randomUUID();
    spaceObjectsToCreate.push({
      id: objectId,
      type: raw.type,
      name: raw.name,
      titanium: raw.titanium,
      silicate: raw.silicate,
      isotope: raw.isotope,
      x: raw.x,
      y: raw.y,
    });

    if (raw.type === SpaceObjectType.PLANET) {
      planetsToCreate.push({
        id: objectId,
        ownerId: ownerId,
        population: 500,
        populationCapacity: 1000,
        storageCapacity: 10000,
        sovereignty: 100,
      });

      if (raw.buildings) {
        raw.buildings.forEach((b: any) => {
          planetBuildingsToCreate.push({
            planetId: objectId,
            type: b.type,
            level: b.level,
          });
        });
      }

      if (raw.ships) {
        raw.ships.forEach((s: any) => {
          planetShipsToCreate.push({
            planetId: objectId,
            type: s.type,
            count: s.count,
          });
        });
      }
    }
  };

  // Process player planet
  processObject(playerPlanetDataRaw, userId);

  // Process surrounding NPC objects
  newObjectsRaw.forEach((raw) => processObject(raw, "SYSTEM"));

  await prisma.spaceObject.createMany({ data: spaceObjectsToCreate });
  await prisma.planet.createMany({ data: planetsToCreate });
  await prisma.planetBuilding.createMany({ data: planetBuildingsToCreate });
  await prisma.planetShip.createMany({ data: planetShipsToCreate });

  console.log(`[Users] Reset defeated player ${userId} with new planet and surroundings`);
};
