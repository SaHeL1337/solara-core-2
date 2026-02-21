import { prisma } from "../../lib/prisma";
import availableBuildings from "../../config/buildings.json";

export const evaluateFormula = (
  formula: string | number,
  level: number,
): number => {
  if (typeof formula === "number") return formula;
  const jsFormula = formula.replace(/\^/g, "**");
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function("level", `return ${jsFormula};`)(level);
    return isNaN(result) ? 0 : Math.floor(result);
  } catch (e) {
    console.error("Formula evaluation failed:", formula, e);
    return 0;
  }
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

  // Combine available buildings with current level state
  const buildingsMap = Object.entries(availableBuildings).reduce(
    (acc, [type, config]) => {
      const currentBuilding = currentBuildings.find((b) => b.type === type);
      const itemsInQueue = queue.filter((q) => q.buildingType === type).length;

      const currentLevel = currentBuilding?.level || 0;
      const targetLevel = currentLevel + itemsInQueue + 1;

      acc[type] = {
        ...config,
        type,
        level: currentLevel,
        targetLevel,
        cost: {
          titanium: config.cost.titanium
            ? evaluateFormula(config.cost.titanium, targetLevel)
            : 0,
          silicate: config.cost.silicate
            ? evaluateFormula(config.cost.silicate, targetLevel)
            : 0,
          isotope: config.cost.isotope
            ? evaluateFormula(config.cost.isotope, targetLevel)
            : 0,
          flux: (config.cost as any).flux
            ? evaluateFormula((config.cost as any).flux, targetLevel)
            : 0,
        },
        production: evaluateFormula(config.production, targetLevel),
        buildTimeInSeconds: evaluateFormula(
          config.buildTimeInSeconds,
          targetLevel,
        ),
      };

      return acc;
    },
    {} as Record<string, any>,
  );

  return {
    available: buildingsMap,
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

  const targetLevel = (existingBuilding?.level || 0) + itemsInQueue + 1;

  // 3. Game Math: Calculate costs and time (Scales with level) using buildings.json
  const config = (availableBuildings as any)[buildingType];
  if (!config) {
    throw new Error("Invalid building type");
  }

  const costFlux = (config.cost as any).flux
    ? evaluateFormula((config.cost as any).flux, targetLevel)
    : 0;
  const costTitanium = config.cost.titanium
    ? evaluateFormula(config.cost.titanium, targetLevel)
    : 0;
  const costSilicate = config.cost.silicate
    ? evaluateFormula(config.cost.silicate, targetLevel)
    : 0;
  const costIsotope = config.cost.isotope
    ? evaluateFormula(config.cost.isotope, targetLevel)
    : 0;
  const durationSec = config.buildTimeInSeconds
    ? evaluateFormula(config.buildTimeInSeconds, targetLevel)
    : 60 * targetLevel;

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
