import shipConfigJson from "../../config/ships.json";
import { evaluateFormula } from "../buildings/buildings.config.service";

export type ShipConfigItem = {
  name: string;
  description: string;
  cost: {
    titanium: number;
    silicate: number;
    isotope: number;
    population?: number;
  };
  requirements: Record<string, number>;
  buildTimeInSeconds: string;
  distancePerSecond: number;
  capacity: number;
  requiredTech?: string[];
};

export type CalculatedShipInfo = {
  name: string;
  description: string;
  cost: {
    titanium: number;
    silicate: number;
    isotope: number;
    population?: number;
  };
  requirements: Record<string, number>;
  buildTimeInSeconds: number;
  distancePerSecond: number;
  capacity: number;
  meetsRequirements: boolean;
  requiredTech?: string[];
  missingTech?: string[];
};

const shipConfig: Record<string, ShipConfigItem> = shipConfigJson as Record<
  string,
  ShipConfigItem
>;

const evaluateShipFormula = (
  formula: string | number,
  shipyardLevel: number,
): number => {
  if (typeof formula === "number") return formula;
  const jsFormula = formula.replace(/\^/g, "**");
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function("shipyardLevel", `return ${jsFormula};`)(
      shipyardLevel,
    );
    return isNaN(result) ? 0 : Math.floor(result);
  } catch (e) {
    console.error("Formula evaluation failed:", formula, e);
    return 0;
  }
};

export const getShipConfig = (
  shipType: string,
  shipyardLevel: number,
): CalculatedShipInfo => {
  const config = shipConfig[shipType];
  if (!config) {
    throw new Error(`Invalid ship type: ${shipType}`);
  }

  return {
    name: config.name,
    description: config.description,
    cost: config.cost,
    requirements: config.requirements,
    buildTimeInSeconds: Math.ceil(
      evaluateShipFormula(config.buildTimeInSeconds, shipyardLevel),
    ),
    distancePerSecond: config.distancePerSecond,
    capacity: config.capacity,
    meetsRequirements: true, // evaluated by caller
    requiredTech: config.requiredTech,
  };
};

export const getCalcAvailableShips = (
  shipyardLevel: number,
  researchedNodes: string[] = [],
): Record<string, CalculatedShipInfo> => {
  const availableShips: Record<string, CalculatedShipInfo> = {};

  for (const shipType of Object.keys(shipConfig)) {
    const config = getShipConfig(shipType, shipyardLevel);

    // Evaluate requirements
    let meetsRequirements = true;
    for (const [reqBuilding, reqLevel] of Object.entries(config.requirements)) {
      if (reqBuilding === "SHIPYARD" && shipyardLevel < reqLevel) {
        meetsRequirements = false;
        break;
      }
    }

    const missingTech = config.requiredTech?.filter(t => !researchedNodes.includes(t)) || [];
    if (missingTech.length > 0) {
      meetsRequirements = false;
    }

    config.meetsRequirements = meetsRequirements;
    config.missingTech = missingTech;
    availableShips[shipType] = config;
  }

  return availableShips;
};
