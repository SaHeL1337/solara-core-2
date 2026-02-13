import { prisma } from "../lib/prisma"; // Your Prisma singleton
import { beforeAll, beforeEach } from "vitest";

// Clear all tables to ensure test isolation
const resetDb = async () => {
  const transactions = [prisma.user.deleteMany()];
  await prisma.$transaction(transactions);
};

beforeEach(async () => {
  console.log("Resetting Database");
  await resetDb();
});
