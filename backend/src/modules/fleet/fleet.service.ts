import { prisma } from "../../lib/prisma";
import { MissionType, FleetMovementStatus, SpaceObjectType } from "../../generated/prisma";
import { getShipConfig } from "../ships/ships.config.service";
import { getBuildingLevel } from "../buildings/buildings.service";

export class FleetService {
  async dispatchFleet(
    userId: string,
    originId: string,
    targetId: string,
    missionType: MissionType,
    ships: Record<string, number>
  ) {
    return await (prisma as any).$transaction(async (tx: any) => {
      // 1. Validate origin (must be a planet owned by user)
      const originPlanet = await tx.planet.findFirst({
        where: { id: originId, ownerId: userId },
        include: { spaceObject: true }
      });

      if (!originPlanet) {
        throw new Error("Origin planet not found or not owned by user");
      }

      // 2. Validate target
      const targetObject = await tx.spaceObject.findUnique({
        where: { id: targetId }
      });

      if (!targetObject) {
        throw new Error("Target space object not found");
      }

      // 2b. Validate CONQUER mission requirements
      if (missionType === MissionType.CONQUER) {
        if (targetObject.type !== SpaceObjectType.PLANET) {
          throw new Error("Conquest missions can only target planets");
        }
        const targetPlanet = await tx.planet.findUnique({
          where: { id: targetId }
        });
        if (targetPlanet && targetPlanet.ownerId === userId) {
          throw new Error("You cannot conquer your own planet");
        }
        const hasColonyShip = Object.entries(ships).some(
          ([type, qty]) => type === "COLONY_SHIP" && (qty as number) > 0
        );
        if (!hasColonyShip) {
          throw new Error("Conquest missions require at least one Colony Ship");
        }
      }

      // 3. Deduct ships and calculate fleet speed
      let totalCapacity = 0;
      let minSpeed = Infinity;
      
      const shipyardLevel = await getBuildingLevel(originId, "SHIPYARD");

      for (const [shipType, quantity] of Object.entries(ships)) {
        if (quantity <= 0) continue;

        const planetShip = await tx.planetShip.findUnique({
          where: { planetId_type: { planetId: originId, type: shipType } }
        });

        if (!planetShip || planetShip.count < quantity) {
          throw new Error(`Not enough ships of type ${shipType}`);
        }

        // Deduct ships
        await tx.planetShip.update({
          where: { id: planetShip.id },
          data: { count: { decrement: quantity } }
        });

        // Get ship config for speed and capacity
        const config = getShipConfig(shipType, shipyardLevel);
        totalCapacity += config.capacity * quantity;
        if (config.distancePerSecond < minSpeed) {
          minSpeed = config.distancePerSecond;
        }
      }

      if (minSpeed === Infinity) {
        throw new Error("No ships selected for dispatch");
      }

      // 4. Calculate travel time
      const dx = targetObject.x - originPlanet.spaceObject.x;
      const dy = targetObject.y - originPlanet.spaceObject.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const travelTimeSec = Math.ceil(distance / minSpeed);

      const startTime = new Date();
      const arrivalTime = new Date(startTime.getTime() + travelTimeSec * 1000);

      // 5. Create FleetMovement
      const movement = await (tx as any).fleetMovement.create({
        data: {
          userId,
          originId,
          targetId,
          targetX: targetObject.x,
          targetY: targetObject.y,
          missionType,
          status: FleetMovementStatus.EN_ROUTE,
          startTime,
          arrivalTime,
          ships: {
            create: Object.entries(ships)
              .filter(([_, qty]) => qty > 0)
              .map(([type, count]) => ({ type, count }))
          }
        },
        include: {
          ships: true
        }
      });

      return movement;
    });
  }

  async getMovementsForUser(userId: string) {
    return await (prisma as any).fleetMovement.findMany({
      where: {
        userId,
        status: { in: [FleetMovementStatus.EN_ROUTE, FleetMovementStatus.RETURNING] }
      },
      include: {
        origin: true,
        target: true,
        ships: true,
        resources: true
      },
      orderBy: { arrivalTime: "asc" }
    });
  }
}

export const fleetService = new FleetService();
