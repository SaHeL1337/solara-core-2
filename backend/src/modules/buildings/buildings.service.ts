import { prisma } from "../../lib/prisma";

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
