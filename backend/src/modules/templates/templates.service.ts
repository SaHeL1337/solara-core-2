import { prisma } from "../../lib/prisma";
import { getBuildingConfig } from "../buildings/buildings.config.service";
import shipConfigJson from "../../config/ships.json";
import availableBuildings from "../../config/buildings.json";

export const getConfig = () => {
  return {
    buildings: availableBuildings,
    ships: shipConfigJson,
  };
};

export interface PredefinedTemplate {
  id: string;
  name: string;
  buildings: string[];
  ships: Record<string, number>;
  tagId: string | null;
  isPredefined: boolean;
}

const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    id: "predefined-basic-outpost",
    name: "Basic Outpost (Predefined)",
    buildings: [
      "TITANIUM_MINE",
      "SILICATE_MINE",
      "HOUSING_BLOCK",
      "TITANIUM_MINE",
      "ISOTOPE_COLLECTOR",
      "HOUSING_BLOCK",
      "SHIPYARD",
    ],
    ships: {
      MINER: 5,
      FIGHTER: 2,
    },
    tagId: null,
    isPredefined: true,
  },
  {
    id: "predefined-industrial-core",
    name: "Industrial Core (Predefined)",
    buildings: [
      "TITANIUM_MINE",
      "SILICATE_MINE",
      "HOUSING_BLOCK",
      "TITANIUM_MINE",
      "SILICATE_MINE",
      "STORAGE",
      "ISOTOPE_COLLECTOR",
      "HOUSING_BLOCK",
      "SHIPYARD",
      "STORAGE",
      "SHIPYARD",
      "TITANIUM_MINE",
    ],
    ships: {
      MINER: 20,
      FIGHTER: 5,
      SCANNER: 2,
    },
    tagId: null,
    isPredefined: true,
  },
];

// Helper simulation engine
export const simulateTemplate = (buildings: string[], ships: Record<string, number>) => {
  const errors: string[] = [];
  const trace: {
    step: number;
    type: string;
    description: string;
    housingLeft: number;
    storage: number;
  }[] = [];

  let storageCapacity = 10000;
  let populationCapacity = 0;
  let currentPopulation = 0;
  let shipyardLevel = 0;

  const buildingLevels: Record<string, number> = {};

  // 1. Simulate Buildings Step-by-Step
  buildings.forEach((type, idx) => {
    const nextLevel = (buildingLevels[type] || 0) + 1;
    buildingLevels[type] = nextLevel;

    try {
      const config = getBuildingConfig(type, nextLevel - 1, nextLevel);
      const { cost, productionIncrease } = config;

      // Check storage
      const maxCost = Math.max(cost.titanium, cost.silicate, cost.isotope);
      if (maxCost > storageCapacity) {
        errors.push(
          `Step ${idx + 1}: ${config.name} L${nextLevel} cost (${maxCost.toLocaleString()} resources) exceeds storage capacity (${storageCapacity.toLocaleString()})`
        );
      }

      // Check population
      if (currentPopulation + cost.population > populationCapacity) {
        errors.push(
          `Step ${idx + 1}: ${config.name} L${nextLevel} requires ${cost.population} workforce. Housing is full (${currentPopulation}/${populationCapacity})`
        );
      }

      // Apply upgrades
      if (type === "HOUSING_BLOCK") {
        populationCapacity += productionIncrease || 1000;
      }
      if (type === "STORAGE") {
        storageCapacity += productionIncrease || 50000;
      }
      if (type === "SHIPYARD") {
        shipyardLevel = nextLevel;
      }

      // Consume population
      currentPopulation += cost.population;

      trace.push({
        step: idx + 1,
        type: `BUILD_${type}`,
        description: `Built ${config.name} Level ${nextLevel}`,
        housingLeft: populationCapacity - currentPopulation,
        storage: storageCapacity,
      });
    } catch (e: any) {
      errors.push(`Step ${idx + 1}: Invalid building type "${type}"`);
    }
  });

  // 2. Simulate Ships Requirements & Housing
  let totalShipPopulation = 0;
  Object.entries(ships).forEach(([shipType, count]) => {
    if (count <= 0) return;

    const shipInfo = (shipConfigJson as Record<string, any>)[shipType];
    if (!shipInfo) {
      errors.push(`Invalid ship type: "${shipType}"`);
      return;
    }

    // Verify shipyard requirements
    const reqShipyard = shipInfo.requirements?.SHIPYARD || 0;
    if (shipyardLevel < reqShipyard) {
      errors.push(
        `Required shipyard level ${reqShipyard} for ${shipInfo.name} but only level ${shipyardLevel} is built`
      );
    }

    // Track population/housing cost
    const shipPopCost = shipInfo.cost?.population || 0;
    totalShipPopulation += count * shipPopCost;
  });

  if (currentPopulation + totalShipPopulation > populationCapacity) {
    errors.push(
      `Target ships require ${totalShipPopulation} housing, but only ${
        populationCapacity - currentPopulation
      } available`
    );
  }

  trace.push({
    step: buildings.length + 1,
    type: "SHIPS",
    description: `Construct target ships (${Object.entries(ships)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${type} x${count}`)
      .join(", ") || "None"})`,
    housingLeft: populationCapacity - currentPopulation - totalShipPopulation,
    storage: storageCapacity,
  });

  return {
    valid: errors.length === 0,
    errors,
    trace,
    theoreticalRemainingHousing: populationCapacity - currentPopulation - totalShipPopulation,
  };
};

export const getTemplates = async (userId: string) => {
  const customTemplates = await prisma.planetTemplate.findMany({
    where: { userId },
    include: { tag: true },
  });

  const parsedCustom = customTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    buildings: t.buildings as string[],
    ships: t.ships as Record<string, number>,
    tagId: t.tagId,
    tag: t.tag,
    isPredefined: false,
  }));

  return [...PREDEFINED_TEMPLATES, ...parsedCustom];
};

export const createTemplate = async (
  userId: string,
  name: string,
  buildings: string[],
  ships: Record<string, number>,
  tagId?: string | null
) => {
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    throw new Error("Template name must be between 1 and 50 characters");
  }

  // Validate the sequence using the simulation engine
  const sim = simulateTemplate(buildings, ships);
  if (!sim.valid) {
    throw new Error(`Invalid Template: ${sim.errors.join("; ")}`);
  }

  const cleanTagId = tagId || null;

  return await prisma.planetTemplate.create({
    data: {
      userId,
      name: trimmedName,
      buildings,
      ships,
      tagId: cleanTagId,
    },
    include: { tag: true },
  });
};

export const updateTemplate = async (
  userId: string,
  templateId: string,
  name: string,
  buildings: string[],
  ships: Record<string, number>,
  tagId?: string | null
) => {
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    throw new Error("Template name must be between 1 and 50 characters");
  }

  // Verify ownership
  const template = await prisma.planetTemplate.findFirst({
    where: { id: templateId, userId },
  });

  if (!template) {
    throw new Error("Template not found or not owned by user");
  }

  // Validate sequence
  const sim = simulateTemplate(buildings, ships);
  if (!sim.valid) {
    throw new Error(`Invalid Template: ${sim.errors.join("; ")}`);
  }

  const cleanTagId = tagId || null;

  return await prisma.planetTemplate.update({
    where: { id: templateId },
    data: {
      name: trimmedName,
      buildings,
      ships,
      tagId: cleanTagId,
    },
    include: { tag: true },
  });
};

export const deleteTemplate = async (userId: string, templateId: string) => {
  // Verify ownership
  const template = await prisma.planetTemplate.findFirst({
    where: { id: templateId, userId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  return await prisma.planetTemplate.delete({
    where: { id: templateId },
  });
};
