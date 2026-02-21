import { prisma } from "../../lib/prisma";
import availableBuildings from "../../config/buildings.json";

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

  // calculate cost per building per level (replace "level" in building cost function with current building level)

  return {
    available: availableBuildings,
    current: currentBuildings,
    queue,
    production,
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

  // Logic: Check existing level + items already in queue for this type
  const itemsInQueue = await prisma.buildingQueue.count({
    where: { planetId, buildingType, status: { in: ["PENDING", "BUILDING"] } },
  });

  const targetLevel = (existingBuilding?.level || 0) + itemsInQueue + 1;

  // 3. Game Math: Calculate costs and time (Scales with level)
  const costFlux = Math.floor(100 * Math.pow(1.5, targetLevel - 1));
  const costTitanium = Math.floor(100 * Math.pow(1.5, targetLevel - 1));
  const costSilicate = Math.floor(100 * Math.pow(1.5, targetLevel - 1));
  const costIsotope = Math.floor(100 * Math.pow(1.5, targetLevel - 1));
  const durationSec = 60 * targetLevel;

  // 4. Create the record
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
      status: "PENDING", // Pulse worker will promote this later
    },
  });
};
