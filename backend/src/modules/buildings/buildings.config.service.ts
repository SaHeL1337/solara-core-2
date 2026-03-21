import availableBuildings from "../../config/buildings.json";

export interface BuildingCostInfo {
  titanium: number;
  silicate: number;
  isotope: number;
  flux: number;
  housing: number;
}

export interface CalculatedBuildingInfo {
  type: string;
  name: string;
  description: string;
  level: number;
  targetLevel: number;
  cost: BuildingCostInfo;
  maxLevel: number;
  production: number;
  productionIncrease: number;
  buildTimeInSeconds: number;
}

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

export const getBuildingConfig = (
  buildingType: string,
  currentLevel: number,
  targetLevel: number,
): Omit<CalculatedBuildingInfo, "level" | "targetLevel"> => {
  const config = (availableBuildings as Record<string, any>)[buildingType];
  if (!config) {
    throw new Error(`Building type ${buildingType} not found`);
  }

  return {
    type: buildingType,
    name: config.name,
    description: config.description,
    cost: {
      titanium: config.cost?.titanium
        ? evaluateFormula(config.cost.titanium, targetLevel)
        : 0,
      silicate: config.cost?.silicate
        ? evaluateFormula(config.cost.silicate, targetLevel)
        : 0,
      isotope: config.cost?.isotope
        ? evaluateFormula(config.cost.isotope, targetLevel)
        : 0,
      flux: config.cost?.flux
        ? evaluateFormula(config.cost.flux, targetLevel)
        : 0,
      housing: config.cost?.housing
        ? evaluateFormula(config.cost.housing, targetLevel)
        : 0,
    },
    maxLevel: config.maxLevel,
    production: evaluateFormula(config.production || 0, currentLevel),
    productionIncrease:
      evaluateFormula(config.production || 0, targetLevel) -
      evaluateFormula(config.production || 0, targetLevel - 1),
    buildTimeInSeconds: config.buildTimeInSeconds
      ? evaluateFormula(config.buildTimeInSeconds, targetLevel)
      : Math.max(60 * targetLevel, 60),
  };
};

export const getCalcAvailableBuildings = (
  currentLevelsMap: Record<string, number>,
  inQueueCountMap: Record<string, number>,
): Record<string, CalculatedBuildingInfo> => {
  const buildingsMap: Record<string, CalculatedBuildingInfo> = {};

  for (const type of Object.keys(availableBuildings)) {
    const currentLevel = currentLevelsMap[type] || 0;
    const itemsInQueue = inQueueCountMap[type] || 0;
    const targetLevel = currentLevel + itemsInQueue + 1;

    buildingsMap[type] = {
      ...getBuildingConfig(type, currentLevel, targetLevel),
      level: currentLevel,
      targetLevel,
    };
  }

  return buildingsMap;
};
