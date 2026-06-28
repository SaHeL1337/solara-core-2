import { prisma } from "../../lib/prisma";

/**
 * List all in-game users (excluding SYSTEM) with planet count.
 */
export const listAllUsers = async () => {
  const users = await prisma.user.findMany({
    where: {
      id: { not: "SYSTEM" },
    },
    include: {
      _count: {
        select: { planets: true },
      },
    },
    orderBy: { id: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    flux: u.flux,
    planetCount: u._count.planets,
    lastUpdate: u.lastUpdate,
  }));
};

/**
 * Fully delete a user and ALL associated data in the correct FK order.
 * This does NOT delete SYSTEM-owned objects generated alongside the user.
 */
export const deleteUser = async (userId: string) => {
  if (userId === "SYSTEM") {
    throw new Error("Cannot delete the SYSTEM user");
  }

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  // Get all planet IDs owned by this user
  const planets = await prisma.planet.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  const planetIds = planets.map((p) => p.id);

  // Get all fleet movement IDs for this user
  const fleetMovements = await prisma.fleetMovement.findMany({
    where: { userId },
    select: { id: true },
  });
  const fleetMovementIds = fleetMovements.map((f) => f.id);

  // Use a transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // 1. Delete fleet ships and resources for user's fleet movements
    if (fleetMovementIds.length > 0) {
      await tx.fleetShip.deleteMany({
        where: { fleetMovementId: { in: fleetMovementIds } },
      });
      await tx.fleetResource.deleteMany({
        where: { fleetMovementId: { in: fleetMovementIds } },
      });
    }

    // 2. Delete fleet movements
    await tx.fleetMovement.deleteMany({ where: { userId } });

    // 3. Delete planet-related data
    if (planetIds.length > 0) {
      await tx.shipQueue.deleteMany({
        where: { planetId: { in: planetIds } },
      });
      await tx.buildingQueue.deleteMany({
        where: { planetId: { in: planetIds } },
      });
      await tx.planetShip.deleteMany({
        where: { planetId: { in: planetIds } },
      });
      await tx.planetBuilding.deleteMany({
        where: { planetId: { in: planetIds } },
      });

      // 4. Delete scan reports (both owned by user AND referencing user's planets)
      await tx.scanReport.deleteMany({
        where: {
          OR: [
            { userId },
            { planetId: { in: planetIds } },
          ],
        },
      });

      // 5. Delete messages received by user
      await tx.message.deleteMany({ where: { recipientId: userId } });

      // 6. Delete planets
      await tx.planet.deleteMany({ where: { ownerId: userId } });

      // 7. Delete the space objects that backed those planets
      await tx.spaceObject.deleteMany({
        where: { id: { in: planetIds } },
      });
    } else {
      // Still delete scan reports and messages even if no planets
      await tx.scanReport.deleteMany({ where: { userId } });
      await tx.message.deleteMany({ where: { recipientId: userId } });
    }

    // 8. Delete the user record
    await tx.user.delete({ where: { id: userId } });
  });

  console.log(`[Admin] Deleted user ${userId} and all associated data`);
};
