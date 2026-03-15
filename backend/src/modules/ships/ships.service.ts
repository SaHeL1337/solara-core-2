import { prisma } from "../../lib/prisma";
import { getCalcAvailableShips, getShipConfig } from "./ships.config.service";
import { ResourceService } from "../resources/resourc.service";
import { QueueStatus } from "../../generated/prisma/enums";

export const getShips = async (userId: string, planetId: string) => {
  const planet = await prisma.planet.findUnique({
    where: { id: planetId },
  });

  if (!planet || planet.ownerId !== userId) {
    throw new Error("Planet not found or not owned by user");
  }

  const currentShips = await prisma.planetShip.findMany({
    where: { planetId },
  });

  const queue = await prisma.shipQueue.findMany({
    where: {
      planetId,
      status: { in: [QueueStatus.PENDING, QueueStatus.BUILDING] },
    },
    orderBy: { position: "asc" },
  });

  // Get shipyard level to calculate build times and requirements
  const shipyard = await prisma.planetBuilding.findUnique({
    where: { planetId_type: { planetId, type: "SHIPYARD" } },
  });
  const shipyardLevel = shipyard?.level || 0;

  await ResourceService.sync(planetId);

  const available = getCalcAvailableShips(shipyardLevel);

  return {
    available,
    current: currentShips, // Ships currently owned
    queue,
    shipyardLevel,
  };
};

export const queueShips = async (
  userId: string,
  planetId: string,
  shipType: string,
  quantity: number,
) => {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const shipyard = await prisma.planetBuilding.findUnique({
    where: { planetId_type: { planetId, type: "SHIPYARD" } },
  });
  const shipyardLevel = shipyard?.level || 0;

  const config = getShipConfig(shipType, shipyardLevel);

  // Requirement check
  let meetsRequirements = true;
  for (const [reqBuilding, reqLevel] of Object.entries(config.requirements)) {
    if (reqBuilding === "SHIPYARD" && shipyardLevel < reqLevel) {
      meetsRequirements = false;
      break;
    }
  }

  if (!meetsRequirements) {
    throw new Error("Requirements not met to build this ship");
  }

  const costTitanium = config.cost.titanium * quantity;
  const costSilicate = config.cost.silicate * quantity;
  const costIsotope = config.cost.isotope * quantity;
  const durationSec = config.buildTimeInSeconds;

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

  // Deduct resources
  await prisma.spaceObject.update({
    where: { id: planetId },
    data: {
      titanium: spaceObject.titanium - costTitanium,
      silicate: spaceObject.silicate - costSilicate,
      isotope: spaceObject.isotope - costIsotope,
    },
  });

  const currentQueueCount = await prisma.shipQueue.count({
    where: {
      planetId,
      status: { in: [QueueStatus.PENDING, QueueStatus.BUILDING] },
    },
  });

  const isFirstInQueue = currentQueueCount === 0;

  return await prisma.shipQueue.create({
    data: {
      planetId,
      shipType,
      quantity,
      costTitanium,
      costSilicate,
      costIsotope,
      durationSec,
      position: currentQueueCount,
      status: isFirstInQueue ? QueueStatus.BUILDING : QueueStatus.PENDING,
      ...(isFirstInQueue ? { startedAt: new Date() } : {}),
      completedCount: 0,
    },
  });
};
