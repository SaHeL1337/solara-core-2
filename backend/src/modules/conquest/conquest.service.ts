import { prisma } from "../../lib/prisma";
import { FleetMovementStatus, SpaceObjectType } from "../../generated/prisma";
import gameConfig from "../../config/game.json";
import shipConfigJson from "../../config/ships.json";

export class ConquestService {
  async getActiveConquests(userId: string) {
    const conquests = await prisma.conquest.findMany({
      where: {
        isActive: true,
        OR: [
          { initiatorId: userId },
          { spaceObject: { planet: { ownerId: userId } } },
          { spaceObject: { incomingFleets: { some: { userId, status: FleetMovementStatus.HOLDING } } } }
        ]
      },
      include: {
        spaceObject: {
          include: {
            planet: {
              include: {
                owner: true
              }
            },
            wormhole: true
          }
        }
      }
    });

    return conquests.map(c => {
      const progress = c.conquestPointsRequired > 0
        ? Math.min(100, Math.round((c.conquestPoints / c.conquestPointsRequired) * 100))
        : 0;
      return {
        id: c.id,
        spaceObjectId: c.spaceObjectId,
        name: c.spaceObject.name,
        type: c.spaceObject.type.toLowerCase(),
        x: c.spaceObject.x,
        y: c.spaceObject.y,
        initiatorId: c.initiatorId,
        conquestPoints: c.conquestPoints,
        conquestPointsRequired: c.conquestPointsRequired,
        progress,
        startedAt: c.startedAt,
        ownerId: c.spaceObject.planet?.ownerId,
        ownerName: c.spaceObject.planet?.owner?.displayName || c.spaceObject.planet?.owner?.id || "SYSTEM",
        threatLevel: c.spaceObject.wormhole?.threatLevel
      };
    });
  }

  async getConquestStatus(spaceObjectId: string, userId: string) {
    const conquest = await prisma.conquest.findFirst({
      where: { spaceObjectId, isActive: true },
      include: {
        spaceObject: {
          include: {
            planet: {
              include: {
                buildings: true,
                owner: true
              }
            },
            wormhole: true
          }
        }
      }
    });

    if (!conquest) {
      return null;
    }

    // Get all holding fleets
    const holdingFleets = await prisma.fleetMovement.findMany({
      where: {
        targetId: spaceObjectId,
        status: FleetMovementStatus.HOLDING
      },
      include: {
        ships: true,
        user: true
      }
    });

    // Breakdown fleets by player and calculate population
    const fleetsBreakdown = holdingFleets.map(f => {
      let fleetPopulation = 0;
      const shipsBreakdown = f.ships.map(s => {
        const shipCfg = (shipConfigJson as any)[s.type];
        const populationCost = shipCfg?.cost?.population || 0;
        fleetPopulation += populationCost * s.count;
        return {
          type: s.type,
          count: s.count,
          population: populationCost
        };
      });

      return {
        fleetId: f.id,
        userId: f.userId,
        displayName: f.user.displayName || f.user.id,
        username: f.user.id,
        ships: shipsBreakdown,
        totalPopulation: fleetPopulation
      };
    });

    const totalPopulation = fleetsBreakdown.reduce((sum, f) => sum + f.totalPopulation, 0);

    // Estimate time remaining
    const conquestConfig = (gameConfig as any).conquest;
    const populationPerConquestPoint = conquestConfig.populationPerConquestPoint || 10;
    const minimumPopulation = conquestConfig.minimumPopulationForConquest || 10;
    
    let pointsPerMinute = 0;
    if (totalPopulation >= minimumPopulation) {
      pointsPerMinute = totalPopulation / populationPerConquestPoint;
    }

    const remainingPoints = Math.max(0, conquest.conquestPointsRequired - conquest.conquestPoints);
    const estimatedMinutesRemaining = pointsPerMinute > 0 
      ? remainingPoints / pointsPerMinute
      : -1; // Indicates infinite/no progress (will decay)

    const progress = conquest.conquestPointsRequired > 0
      ? Math.min(100, Math.round((conquest.conquestPoints / conquest.conquestPointsRequired) * 100))
      : 0;

    // Defender specific data (planetary defense building)
    const isDefender = conquest.spaceObject.planet?.ownerId === userId;
    let defenseData = undefined;

    if (isDefender && conquest.spaceObject.planet) {
      const pdBuilding = conquest.spaceObject.planet.buildings.find(b => b.type === "PLANETARY_DEFENSE");
      const pdLevel = pdBuilding?.level || 0;
      
      const cooldownSeconds = conquestConfig.defenseCooldownSeconds || 300;
      let cooldownRemainingSeconds = 0;
      if (conquest.lastDefenseAt) {
        const timeSinceLastDefense = Date.now() - new Date(conquest.lastDefenseAt).getTime();
        cooldownRemainingSeconds = Math.max(0, cooldownSeconds - Math.floor(timeSinceLastDefense / 1000));
      }

      defenseData = {
        hasBuilding: pdLevel > 0,
        level: pdLevel,
        cooldownRemainingSeconds,
        damagePerShot: pdLevel * 10,
        defenseCooldownSeconds: cooldownSeconds
      };
    }

    return {
      id: conquest.id,
      spaceObjectId: conquest.spaceObjectId,
      name: conquest.spaceObject.name,
      type: conquest.spaceObject.type.toLowerCase(),
      x: conquest.spaceObject.x,
      y: conquest.spaceObject.y,
      initiatorId: conquest.initiatorId,
      conquestPoints: conquest.conquestPoints,
      conquestPointsRequired: conquest.conquestPointsRequired,
      progress,
      startedAt: conquest.startedAt,
      totalHoldingPopulation: totalPopulation,
      estimatedMinutesRemaining,
      fleets: fleetsBreakdown,
      defense: defenseData,
      isClosed: conquest.spaceObject.wormhole?.isClosed || false,
      threatLevel: conquest.spaceObject.wormhole?.threatLevel
    };
  }

  async fireDefense(userId: string, spaceObjectId: string) {
    const conquest = await prisma.conquest.findFirst({
      where: { spaceObjectId, isActive: true },
      include: {
        spaceObject: {
          include: {
            planet: {
              include: {
                buildings: true
              }
            }
          }
        }
      }
    });

    if (!conquest) {
      throw new Error("Active conquest not found at this location");
    }

    const planet = conquest.spaceObject.planet;
    if (!planet || planet.ownerId !== userId) {
      throw new Error("Only the defending planet owner can fire orbital defenses");
    }

    const pdBuilding = planet.buildings.find(b => b.type === "PLANETARY_DEFENSE");
    const pdLevel = pdBuilding?.level || 0;

    if (pdLevel === 0) {
      throw new Error("Planetary Defense building is required to fire defenses");
    }

    const conquestConfig = (gameConfig as any).conquest;
    const cooldownSeconds = conquestConfig.defenseCooldownSeconds || 300;
    if (conquest.lastDefenseAt) {
      const timeSinceLastDefense = Date.now() - new Date(conquest.lastDefenseAt).getTime();
      const cooldownRemaining = cooldownSeconds - Math.floor(timeSinceLastDefense / 1000);
      if (cooldownRemaining > 0) {
        throw new Error(`Orbital defense is cooling down. Please wait ${cooldownRemaining} seconds.`);
      }
    }

    // Firing defense! Calculate damage
    let damageRemaining = pdLevel * 10;
    const totalDamageDealt = damageRemaining;

    // Get all hostile holding fleets (holding fleets owned by other players)
    const hostileFleets = await prisma.fleetMovement.findMany({
      where: {
        targetId: spaceObjectId,
        status: FleetMovementStatus.HOLDING,
        userId: { not: userId }
      },
      include: {
        ships: true
      }
    });

    if (hostileFleets.length === 0) {
      // Update cooldown anyway, since they fired into empty space
      await prisma.conquest.update({
        where: { id: conquest.id },
        data: { lastDefenseAt: new Date() }
      });
      return {
        damageDealt: 0,
        shipsDestroyed: [],
        message: "Orbital defense fired, but no hostile holding fleets were detected in orbit."
      };
    }

    // Build list of all individual ship entry instances to sort by population cost
    const shipList: Array<{
      fleetShipId: string;
      fleetMovementId: string;
      type: string;
      count: number;
      populationCost: number;
    }> = [];

    for (const fleet of hostileFleets) {
      for (const ship of fleet.ships) {
        if (ship.count > 0) {
          const shipCfg = (shipConfigJson as any)[ship.type];
          shipList.push({
            fleetShipId: ship.id,
            fleetMovementId: fleet.id,
            type: ship.type,
            count: ship.count,
            populationCost: shipCfg?.cost?.population || 1
          });
        }
      }
    }

    // Sort by population cost ascending (destroy smaller ships first)
    shipList.sort((a, b) => a.populationCost - b.populationCost);

    const destroyedBreakdown: Record<string, number> = {};
    const updatedShipCounts: Record<string, number> = {}; // fleetShipId -> newCount
    const fleetsToComplete: Set<string> = new Set();

    for (const shipEntry of shipList) {
      if (damageRemaining <= 0) break;

      const maxDestroyable = Math.floor(damageRemaining / shipEntry.populationCost);
      if (maxDestroyable <= 0) continue;

      const numDestroyed = Math.min(shipEntry.count, maxDestroyable);
      if (numDestroyed > 0) {
        damageRemaining -= numDestroyed * shipEntry.populationCost;
        
        destroyedBreakdown[shipEntry.type] = (destroyedBreakdown[shipEntry.type] || 0) + numDestroyed;
        updatedShipCounts[shipEntry.fleetShipId] = shipEntry.count - numDestroyed;

        // Keep track of which fleets might be completely wiped out
        const remainingInEntry = shipEntry.count - numDestroyed;
        if (remainingInEntry === 0) {
          // Check if all other ships in this fleet are also going to be 0 or are already 0
          const fleet = hostileFleets.find(f => f.id === shipEntry.fleetMovementId);
          if (fleet) {
            let totalRemainingInFleet = 0;
            for (const s of fleet.ships) {
              const currentCount = updatedShipCounts[s.id] !== undefined ? updatedShipCounts[s.id] : s.count;
              totalRemainingInFleet += currentCount;
            }
            if (totalRemainingInFleet === 0) {
              fleetsToComplete.add(fleet.id);
            }
          }
        }
      }
    }

    // Execute database updates inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update/delete ships
      for (const [fleetShipId, newCount] of Object.entries(updatedShipCounts)) {
        if (newCount === 0) {
          await tx.fleetShip.delete({
            where: { id: fleetShipId }
          });
        } else {
          await tx.fleetShip.update({
            where: { id: fleetShipId },
            data: { count: newCount }
          });
        }
      }

      // 2. Mark empty fleets as completed
      for (const fleetId of fleetsToComplete) {
        await tx.fleetMovement.update({
          where: { id: fleetId },
          data: { status: FleetMovementStatus.COMPLETED }
        });
      }

      // 3. Update conquest cooldown
      await tx.conquest.update({
        where: { id: conquest.id },
        data: { lastDefenseAt: new Date() }
      });
    });

    // Format output
    const shipsDestroyedList = Object.entries(destroyedBreakdown).map(([type, count]) => ({
      type,
      count
    }));

    return {
      damageDealt: totalDamageDealt - damageRemaining,
      shipsDestroyed: shipsDestroyedList,
      message: `Orbital defense successfully fired, dealing ${totalDamageDealt - damageRemaining} population worth of damage.`
    };
  }
}

export const conquestService = new ConquestService();
