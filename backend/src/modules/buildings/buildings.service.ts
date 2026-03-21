import { prisma } from "../../lib/prisma";
import {
  getBuildingConfig,
  getCalcAvailableBuildings,
  CalculatedBuildingInfo,
} from "./buildings.config.service";

import { ResourceService } from "../resources/resourc.service";

export const calculateAvailableBuildings = async (
  planetId: string,
  currentBuildings?: any[],
  queue?: any[],
): Promise<Record<string, CalculatedBuildingInfo>> => {
  if (!currentBuildings) {
    currentBuildings = await prisma.planetBuilding.findMany({
      where: { planetId },
    });
  }
  if (!queue) {
    queue = await prisma.buildingQueue.findMany({
      where: { planetId, status: { in: ["PENDING", "BUILDING"] } },
    });
  }

  const currentLevelsMap = currentBuildings.reduce(
    (acc, b) => {
      acc[b.type] = b.level;
      return acc;
    },
    {} as Record<string, number>,
  );

  const inQueueCountMap = queue.reduce(
    (acc, q) => {
      acc[q.buildingType] = (acc[q.buildingType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return getCalcAvailableBuildings(currentLevelsMap, inQueueCountMap);
};

export const getBuildings = async (userId: string, planetId: string) => {
  // Verify planet ownership
  const planet = await prisma.planet.findUnique({
    where: { id: planetId },
  });

  if (!planet || planet.ownerId !== userId) {
    throw new Error("Planet not found or not owned by user");
  }

  // Fetch current buildings
  const currentBuildings = await prisma.planetBuilding.findMany({
    where: { planetId },
  });

  // Fetch active queue
  const queue = await prisma.buildingQueue.findMany({
    where: { planetId, status: { in: ["PENDING", "BUILDING"] } },
    orderBy: { position: "asc" },
  });

  // update planet resources
  await ResourceService.sync(planetId);

  // Combine available buildings with current level state using config service
  const available = await calculateAvailableBuildings(
    planetId,
    currentBuildings,
    queue,
  );

  return {
    available,
    current: currentBuildings,
    queue,
  };
};

export const addToQueue = async (
  userId: string,
  planetId: string,
  buildingType: string,
) => {
  // 1. Validate the queue limit (3 slots)
  const currentQueueCount = await prisma.buildingQueue.count({
    where: { planetId, status: { in: ["PENDING", "BUILDING"] } },
  });

  if (currentQueueCount >= 3) {
    throw new Error("Queue is full (max 3 buildings)");
  }

  // 2. Determine target level
  const existingBuilding = await prisma.planetBuilding.findUnique({
    where: { planetId_type: { planetId, type: buildingType } },
  });

  const itemsInQueue = await prisma.buildingQueue.count({
    where: { planetId, buildingType, status: { in: ["PENDING", "BUILDING"] } },
  });

  const currentLevel = existingBuilding?.level || 0;
  const targetLevel = currentLevel + itemsInQueue + 1;

  // 3. Game Math: Calculate costs and time (Scales with level) using config service
  const calcConfig = getBuildingConfig(buildingType, currentLevel, targetLevel);

  const costFlux = calcConfig.cost.flux;
  const costTitanium = calcConfig.cost.titanium;
  const costSilicate = calcConfig.cost.silicate;
  const costIsotope = calcConfig.cost.isotope;
  const durationSec = calcConfig.buildTimeInSeconds;

  if (calcConfig.maxLevel < targetLevel) {
    throw new Error("Max level reached");
  }

  //remove resources from the spaceObject if there is enough
  const planetObj = await prisma.planet.findUnique({
    where: { id: planetId },
    include: { spaceObject: true },
  });

  if (!planetObj || !planetObj.spaceObject) {
    throw new Error("Planet or SpaceObject not found");
  }

  const spaceObject = planetObj.spaceObject;

  if (spaceObject.titanium < costTitanium) {
    throw new Error("Not enough titanium");
  }

  if (spaceObject.silicate < costSilicate) {
    throw new Error("Not enough silicate");
  }

  if (spaceObject.isotope < costIsotope) {
    throw new Error("Not enough isotope");
  }

  const player = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!player) {
    throw new Error("Player not found");
  }

  //check if user has enough flux
  if (player.flux < costFlux) {
    throw new Error("Not enough flux");
  }

  await prisma.spaceObject.update({
    where: { id: planetId },
    data: {
      titanium: spaceObject.titanium - costTitanium,
      silicate: spaceObject.silicate - costSilicate,
      isotope: spaceObject.isotope - costIsotope,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      flux: player.flux - costFlux,
    },
  });

  // 4. Create the record
  const isFirstInQueue = currentQueueCount === 0;

  return await prisma.buildingQueue.create({
    data: {
      planetId,
      buildingType,
      targetLevel,
      costFlux,
      costTitanium,
      costSilicate,
      costIsotope,
      durationSec,
      position: currentQueueCount,
      status: isFirstInQueue ? "BUILDING" : "PENDING",
      ...(isFirstInQueue ? { startedAt: new Date() } : {}),
      finishedAt: new Date(Date.now() + durationSec * 1000),
    },
  });
};
