import { prisma } from "../../lib/prisma";

// function to create the user

export const createUser = async (id: string) => {
  // 3. Initialize Game Data in your Prisma DB
  return await prisma.user.upsert({
    where: { id: id },
    update: {},
    create: {
      id: id,
      gold: 1000,
      wood: 1000,
    },
  });
};
