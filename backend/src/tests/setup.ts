import { prisma } from "../lib/prisma"; // Your Prisma singleton
import { beforeAll, beforeEach } from "vitest";

// Clear all tables to ensure test isolation
const resetDb = async () => {
  const transactions = [
    prisma.buildingQueue.deleteMany(),
    prisma.planetBuilding.deleteMany(),
    prisma.planet.deleteMany(),
    prisma.spaceObject.deleteMany(),
    prisma.user.deleteMany(),
  ];
  await prisma.$transaction(transactions);
};

beforeEach(async () => {
  await resetDb();
});
