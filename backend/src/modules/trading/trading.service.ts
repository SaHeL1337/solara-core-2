import { prisma } from "../../lib/prisma";
import { ResourceService } from "../resources/resourc.service";
import { evaluateFormula } from "../buildings/buildings.config.service";
import gameConfig from "../../config/game.json";

const tradingConfig = (gameConfig as any).trading;

/**
 * Get the current dynamic price multiplier based on 24h trade volume.
 * Formula: multiplier = 1 + (totalFluxLast24h / scaleFactor) ^ exponent
 */
export const getFluxPriceMultiplier = async (): Promise<number> => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.fluxTrade.aggregate({
    where: {
      createdAt: { gte: twentyFourHoursAgo },
    },
    _sum: {
      fluxGained: true,
    },
  });

  const totalFlux = result._sum.fluxGained || 0;
  const { fluxPriceScaleFactor, fluxPriceExponent } = tradingConfig;

  const multiplier =
    1 + Math.pow(totalFlux / fluxPriceScaleFactor, fluxPriceExponent);
  
  // Round to 2 decimal places
  return Math.round(multiplier * 100) / 100;
};

/**
 * Get the cost per 1 flux at the current multiplier.
 */
export const getCostPerFlux = (multiplier: number) => {
  const base = tradingConfig.fluxBaseRatio;
  return {
    titanium: Math.ceil(base.titanium * multiplier),
    silicate: Math.ceil(base.silicate * multiplier),
    isotope: Math.ceil(base.isotope * multiplier),
  };
};

/**
 * Get used trading capacity on a planet (from active trades).
 */
export const getUsedCapacity = async (planetId: string): Promise<number> => {
  const result = await prisma.fluxTrade.aggregate({
    where: {
      planetId,
      completesAt: { gt: new Date() },
    },
    _sum: {
      capacityUsed: true,
    },
  });

  return result._sum.capacityUsed || 0;
};

/**
 * Calculate total trading capacity from TRADING_HUB level.
 */
export const getTotalCapacity = (tradingHubLevel: number): number => {
  if (tradingHubLevel <= 0) return 0;
  return evaluateFormula(tradingConfig.tradingCapacityFormula, tradingHubLevel);
};

/**
 * Get predicted multiplier for the next 24 hours.
 */
export const getPredictedMultipliers = async (): Promise<{ hour: number; multiplier: number }[]> => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const trades = await prisma.fluxTrade.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: {
      fluxGained: true,
      createdAt: true,
    },
  });

  const predictions: { hour: number; multiplier: number }[] = [];
  const { fluxPriceScaleFactor, fluxPriceExponent } = tradingConfig;
  
  const nowMs = Date.now();

  for (let i = 0; i <= 24; i++) {
    // In i hours, the "24 hours ago" window shifts forward by i hours
    const shiftedWindowStart = new Date(nowMs - 24 * 60 * 60 * 1000 + i * 60 * 60 * 1000);
    
    // Sum trades that are still within the shifted window
    const validTradesSum = trades
      .filter((t) => t.createdAt >= shiftedWindowStart)
      .reduce((sum, t) => sum + t.fluxGained, 0);

    const multiplier = 1 + Math.pow(validTradesSum / fluxPriceScaleFactor, fluxPriceExponent);
    predictions.push({ hour: i, multiplier: Math.round(multiplier * 100) / 100 });
  }

  return predictions;
};

/**
 * Get hourly trade volume breakdown for the last 24 hours.
 */
export const get24hVolumeBreakdown = async (): Promise<
  { hour: string; fluxTraded: number }[]
> => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const trades = await prisma.fluxTrade.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: {
      fluxGained: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Create 24 hourly buckets
  const buckets: { hour: string; fluxTraded: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const bucketStart = new Date(Date.now() - i * 60 * 60 * 1000);
    bucketStart.setMinutes(0, 0, 0);
    const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);

    const hourLabel = bucketStart.toISOString().slice(11, 16); // "HH:MM"
    const fluxInBucket = trades
      .filter((t) => t.createdAt >= bucketStart && t.createdAt < bucketEnd)
      .reduce((sum, t) => sum + t.fluxGained, 0);

    buckets.push({ hour: hourLabel, fluxTraded: fluxInBucket });
  }

  return buckets;
};

/**
 * Get full trading state for a planet.
 */
export const getTradingState = async (userId: string, planetId: string) => {
  // Get planet with buildings
  const planet = await prisma.planet.findUnique({
    where: { id: planetId },
    include: {
      buildings: true,
      spaceObject: true,
    },
  });

  if (!planet || planet.ownerId !== userId) {
    throw new Error("Planet not found or not owned by you");
  }

  // Get TRADING_HUB level
  const tradingHub = planet.buildings.find((b) => b.type === "TRADING_HUB");
  const tradingHubLevel = tradingHub?.level || 0;

  const totalCapacity = getTotalCapacity(tradingHubLevel);
  const usedCapacity = await getUsedCapacity(planetId);
  const availableCapacity = Math.max(0, totalCapacity - usedCapacity);

  const multiplier = await getFluxPriceMultiplier();
  const costPerFlux = getCostPerFlux(multiplier);

  // Calculate planet resources (on-the-fly, same as getUserState)
  const now = new Date();
  const secondsElapsed = Math.max(
    0,
    (now.getTime() - planet.spaceObject!.updatedAt.getTime()) / 1000
  );
  const productionRates = ResourceService.getProductionRates(planet.buildings);

  const cap = planet.storageCapacity;
  const curTit = planet.spaceObject!.titanium;
  const curSil = planet.spaceObject!.silicate;
  const curIso = planet.spaceObject!.isotope;

  const titanium = curTit >= cap ? curTit : Math.min(curTit + (productionRates.titanium / 3600) * secondsElapsed, cap);
  const silicate = curSil >= cap ? curSil : Math.min(curSil + (productionRates.silicate / 3600) * secondsElapsed, cap);
  const isotope = curIso >= cap ? curIso : Math.min(curIso + (productionRates.isotope / 3600) * secondsElapsed, cap);

  // Max flux affordable by resources
  const maxByTitanium = costPerFlux.titanium > 0 ? Math.floor(titanium / costPerFlux.titanium) : Infinity;
  const maxBySilicate = costPerFlux.silicate > 0 ? Math.floor(silicate / costPerFlux.silicate) : Infinity;
  const maxByIsotope = costPerFlux.isotope > 0 ? Math.floor(isotope / costPerFlux.isotope) : Infinity;

  // Max flux affordable by capacity
  const capacityCostPerFlux = costPerFlux.titanium + costPerFlux.silicate + costPerFlux.isotope;
  const maxByCapacity = capacityCostPerFlux > 0 ? Math.floor(availableCapacity / capacityCostPerFlux) : 0;

  const maxFlux = Math.max(0, Math.min(maxByTitanium, maxBySilicate, maxByIsotope, maxByCapacity));

  // Calculate global max flux (all planets)
  const allPlanets = await prisma.planet.findMany({
    where: { ownerId: userId },
    include: { buildings: true, spaceObject: true },
  });

  let globalMaxFlux = 0;
  for (const p of allPlanets) {
    if (!p.spaceObject) continue;
    const thLevel = p.buildings.find(b => b.type === "TRADING_HUB")?.level || 0;
    if (thLevel <= 0) continue;
    
    const pTotalCap = getTotalCapacity(thLevel);
    const pUsedCap = await getUsedCapacity(p.id);
    const pAvailCap = Math.max(0, pTotalCap - pUsedCap);
    
    const pSecElapsed = Math.max(0, (now.getTime() - p.spaceObject.updatedAt.getTime()) / 1000);
    const pProd = ResourceService.getProductionRates(p.buildings);
    
    const pTit = p.spaceObject.titanium >= p.storageCapacity ? p.spaceObject.titanium : Math.min(p.spaceObject.titanium + (pProd.titanium / 3600) * pSecElapsed, p.storageCapacity);
    const pSil = p.spaceObject.silicate >= p.storageCapacity ? p.spaceObject.silicate : Math.min(p.spaceObject.silicate + (pProd.silicate / 3600) * pSecElapsed, p.storageCapacity);
    const pIso = p.spaceObject.isotope >= p.storageCapacity ? p.spaceObject.isotope : Math.min(p.spaceObject.isotope + (pProd.isotope / 3600) * pSecElapsed, p.storageCapacity);
    
    const pMaxTit = costPerFlux.titanium > 0 ? Math.floor(pTit / costPerFlux.titanium) : Infinity;
    const pMaxSil = costPerFlux.silicate > 0 ? Math.floor(pSil / costPerFlux.silicate) : Infinity;
    const pMaxIso = costPerFlux.isotope > 0 ? Math.floor(pIso / costPerFlux.isotope) : Infinity;
    const pMaxCap = capacityCostPerFlux > 0 ? Math.floor(pAvailCap / capacityCostPerFlux) : 0;
    
    globalMaxFlux += Math.max(0, Math.min(pMaxTit, pMaxSil, pMaxIso, pMaxCap));
  }

  // Active trades on this planet
  const activeTrades = await prisma.fluxTrade.findMany({
    where: {
      planetId,
      completesAt: { gt: new Date() },
    },
    orderBy: {
      completesAt: "asc",
    },
  });

  // 24h volume chart
  const hourlyVolume = await get24hVolumeBreakdown();

  return {
    tradingHubLevel,
    totalCapacity,
    usedCapacity,
    availableCapacity,
    multiplier,
    costPerFlux,
    maxFlux,
    planetResources: {
      titanium: Math.floor(titanium),
      silicate: Math.floor(silicate),
      isotope: Math.floor(isotope),
    },
    activeTrades,
    hourlyVolume,
    predictedMultipliers: await getPredictedMultipliers(),
    globalMaxFlux,
  };
};

/**
 * Execute a flux trade.
 */
export const tradeForFlux = async (
  userId: string,
  planetId: string,
  fluxAmount: number
) => {
  if (fluxAmount <= 0 || !Number.isInteger(fluxAmount)) {
    throw new Error("Flux amount must be a positive integer");
  }

  const multiplier = await getFluxPriceMultiplier();
  const costPerFlux = getCostPerFlux(multiplier);

  const titaniumCost = costPerFlux.titanium * fluxAmount;
  const silicateCost = costPerFlux.silicate * fluxAmount;
  const isotopeCost = costPerFlux.isotope * fluxAmount;
  const totalCapacityCost = titaniumCost + silicateCost + isotopeCost;

  const result = await prisma.$transaction(async (tx: any) => {
    // Sync planet resources first
    const planet = await ResourceService.sync(planetId, tx);
    
    if (!planet || planet.ownerId !== userId) {
      throw new Error("Planet not found or not owned by you");
    }

    // Check TRADING_HUB level
    const tradingHub = planet.buildings.find(
      (b: any) => b.type === "TRADING_HUB"
    );
    const tradingHubLevel = tradingHub?.level || 0;
    if (tradingHubLevel <= 0) {
      throw new Error("You need a Trading Hub to trade");
    }

    // Check capacity
    const totalCap = getTotalCapacity(tradingHubLevel);
    const usedCapResult = await tx.fluxTrade.aggregate({
      where: {
        planetId,
        completesAt: { gt: new Date() },
      },
      _sum: {
        capacityUsed: true,
      },
    });
    const usedCap = usedCapResult._sum.capacityUsed || 0;
    const availableCap = totalCap - usedCap;

    if (totalCapacityCost > availableCap) {
      throw new Error(
        `Not enough trading capacity. Need ${totalCapacityCost}, have ${availableCap}`
      );
    }

    // Check resources
    const so = planet.spaceObject;
    if (so.titanium < titaniumCost) {
      throw new Error(`Not enough titanium. Need ${titaniumCost}, have ${Math.floor(so.titanium)}`);
    }
    if (so.silicate < silicateCost) {
      throw new Error(`Not enough silicate. Need ${silicateCost}, have ${Math.floor(so.silicate)}`);
    }
    if (so.isotope < isotopeCost) {
      throw new Error(`Not enough isotope. Need ${isotopeCost}, have ${Math.floor(so.isotope)}`);
    }

    // Deduct resources from planet
    await tx.spaceObject.update({
      where: { id: planetId },
      data: {
        titanium: { decrement: titaniumCost },
        silicate: { decrement: silicateCost },
        isotope: { decrement: isotopeCost },
      },
    });

    // Add flux to user
    await tx.user.update({
      where: { id: userId },
      data: {
        flux: { increment: fluxAmount },
      },
    });

    // Create trade record
    const tradeDuration = tradingConfig.tradeDurationSeconds;
    const completesAt = new Date(Date.now() + tradeDuration * 1000);

    const trade = await tx.fluxTrade.create({
      data: {
        userId,
        planetId,
        titaniumSpent: titaniumCost,
        silicateSpent: silicateCost,
        isotopeSpent: isotopeCost,
        fluxGained: fluxAmount,
        multiplier,
        capacityUsed: totalCapacityCost,
        tradeDurationSec: tradeDuration,
        completesAt,
      },
    });

    return trade;
  });

  return result;
};

/**
 * Execute max flux trade across all user planets.
 */
export const tradeMaxAllPlanets = async (userId: string) => {
  const result = await prisma.$transaction(async (tx: any) => {
    const multiplier = await getFluxPriceMultiplier();
    const costPerFlux = getCostPerFlux(multiplier);
    const capacityCostPerFlux = costPerFlux.titanium + costPerFlux.silicate + costPerFlux.isotope;
    const tradeDuration = tradingConfig.tradeDurationSeconds;
    let totalFluxGained = 0;

    const allPlanets = await tx.planet.findMany({
      where: { ownerId: userId },
      include: { buildings: true, spaceObject: true },
    });

    for (const p of allPlanets) {
      if (!p.spaceObject) continue;
      const thLevel = p.buildings.find((b: any) => b.type === "TRADING_HUB")?.level || 0;
      if (thLevel <= 0) continue;
      
      // Sync resources in tx
      const syncedPlanet = await ResourceService.sync(p.id, tx);
      const so = syncedPlanet.spaceObject;
      
      const pTotalCap = getTotalCapacity(thLevel);
      const usedCapResult = await tx.fluxTrade.aggregate({
        where: { planetId: p.id, completesAt: { gt: new Date() } },
        _sum: { capacityUsed: true },
      });
      const pUsedCap = usedCapResult._sum.capacityUsed || 0;
      const pAvailCap = Math.max(0, pTotalCap - pUsedCap);
      
      const pMaxTit = costPerFlux.titanium > 0 ? Math.floor(so.titanium / costPerFlux.titanium) : Infinity;
      const pMaxSil = costPerFlux.silicate > 0 ? Math.floor(so.silicate / costPerFlux.silicate) : Infinity;
      const pMaxIso = costPerFlux.isotope > 0 ? Math.floor(so.isotope / costPerFlux.isotope) : Infinity;
      const pMaxCap = capacityCostPerFlux > 0 ? Math.floor(pAvailCap / capacityCostPerFlux) : 0;
      
      const pFluxAmount = Math.max(0, Math.min(pMaxTit, pMaxSil, pMaxIso, pMaxCap));
      
      if (pFluxAmount > 0) {
        const tCost = costPerFlux.titanium * pFluxAmount;
        const sCost = costPerFlux.silicate * pFluxAmount;
        const iCost = costPerFlux.isotope * pFluxAmount;
        const capCost = tCost + sCost + iCost;

        await tx.spaceObject.update({
          where: { id: p.id },
          data: {
            titanium: { decrement: tCost },
            silicate: { decrement: sCost },
            isotope: { decrement: iCost },
          },
        });

        await tx.fluxTrade.create({
          data: {
            userId,
            planetId: p.id,
            titaniumSpent: tCost,
            silicateSpent: sCost,
            isotopeSpent: iCost,
            fluxGained: pFluxAmount,
            multiplier,
            capacityUsed: capCost,
            tradeDurationSec: tradeDuration,
            completesAt: new Date(Date.now() + tradeDuration * 1000),
          },
        });

        totalFluxGained += pFluxAmount;
      }
    }

    if (totalFluxGained > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { flux: { increment: totalFluxGained } },
      });
    }

    return { totalFluxGained };
  });

  return result;
};
