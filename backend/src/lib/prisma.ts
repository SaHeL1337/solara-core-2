import { PrismaClient, Prisma } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Define the client options type strictly
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prismaOptions: Prisma.PrismaClientOptions = {
  // You can add logging here if you want to see SQL in your terminal
  log: ["query", "info", "warn", "error"],
  adapter,
};

const prismaClientSingleton = () => {
  // Pass the typed options
  return new PrismaClient(prismaOptions);
};

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
