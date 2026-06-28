export interface SimTraceStep {
  step: number;
  type: string;
  description: string;
  housingLeft: number;
  storage: number;
}

export interface SimResult {
  valid: boolean;
  errors: string[];
  trace: SimTraceStep[];
  theoreticalRemainingHousing: number;
}

// Formula evaluator
const evaluateFormula = (formula: string | number, level: number): number => {
  if (typeof formula === "number") return formula;
  if (!formula) return 0;
  const jsFormula = formula.replace(/\^/g, "**");
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function("level", `return ${jsFormula};`)(level);
    return isNaN(result) ? 0 : Math.floor(result);
  } catch (e) {
    return 0;
  }
};

export const simulateTemplate = (
  buildings: string[],
  ships: Record<string, number>,
  buildingsConfig: Record<string, any>,
  shipsConfig: Record<string, any>
): SimResult => {
  const errors: string[] = [];
  const trace: SimTraceStep[] = [];

  let storageCapacity = 10000;
  let populationCapacity = 0;
  let currentPopulation = 0;
  let shipyardLevel = 0;

  const buildingLevels: Record<string, number> = {};

  // 1. Simulate Buildings sequence
  buildings.forEach((type, idx) => {
    const nextLevel = (buildingLevels[type] || 0) + 1;
    buildingLevels[type] = nextLevel;

    const config = buildingsConfig[type];
    if (!config) {
      errors.push(`Step ${idx + 1}: Invalid building type "${type}"`);
      return;
    }

    const costFormula = config.cost || {};
    const cost = {
      titanium: costFormula.titanium ? evaluateFormula(costFormula.titanium, nextLevel) : 0,
      silicate: costFormula.silicate ? evaluateFormula(costFormula.silicate, nextLevel) : 0,
      isotope: costFormula.isotope ? evaluateFormula(costFormula.isotope, nextLevel) : 0,
      population: costFormula.population ? evaluateFormula(costFormula.population, nextLevel) : 0,
    };

    // Verify storage limits
    const maxCost = Math.max(cost.titanium, cost.silicate, cost.isotope);
    if (maxCost > storageCapacity) {
      errors.push(
        `Step ${idx + 1}: ${config.name} L${nextLevel} cost (${maxCost.toLocaleString()} resources) exceeds storage capacity (${storageCapacity.toLocaleString()})`
      );
    }

    // Verify population housing limits
    if (currentPopulation + cost.population > populationCapacity) {
      errors.push(
        `Step ${idx + 1}: ${config.name} L${nextLevel} requires ${cost.population} workforce. Housing is full (${currentPopulation}/${populationCapacity})`
      );
    }

    // Apply building capacity changes
    if (type === "HOUSING_BLOCK" && config.production) {
      const cap = evaluateFormula(config.production, nextLevel);
      const prevCap = evaluateFormula(config.production, nextLevel - 1);
      populationCapacity += Math.max(0, cap - prevCap);
    }
    if (type === "STORAGE" && config.production) {
      const cap = evaluateFormula(config.production, nextLevel);
      const prevCap = evaluateFormula(config.production, nextLevel - 1);
      storageCapacity += Math.max(0, cap - prevCap);
    }
    if (type === "SHIPYARD") {
      shipyardLevel = nextLevel;
    }

    // Add workforce
    currentPopulation += cost.population;

    trace.push({
      step: idx + 1,
      type: `BUILD_${type}`,
      description: `Build ${config.name} Level ${nextLevel}`,
      housingLeft: populationCapacity - currentPopulation,
      storage: storageCapacity,
    });
  });

  // 2. Simulate Ships
  let totalShipPopulation = 0;
  Object.entries(ships).forEach(([shipType, count]) => {
    if (count <= 0) return;

    const meta = shipsConfig[shipType];
    if (!meta) {
      errors.push(`Invalid ship type: "${shipType}"`);
      return;
    }

    // Verify Shipyard requirement
    const reqShipyard = meta.requirements?.SHIPYARD || 0;
    if (shipyardLevel < reqShipyard) {
      errors.push(
        `Required shipyard level ${reqShipyard} for ${meta.name} but only level ${shipyardLevel} is built`
      );
    }

    const popCost = meta.cost?.population || 0;
    totalShipPopulation += count * popCost;
  });

  // Verify ship housing limits
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
