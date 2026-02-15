import { prisma } from "../../lib/prisma";

// function to create the user

export const createUser = async (id: string) => {
  // 3. Initialize Game Data in your Prisma DB
  var user = await prisma.user.upsert({
    where: { id: id },
    update: {},
    create: {
      id: id,
      flux: 1000,
    },
  });

  if (!user) {
    throw new Error("Failed to create user");
  }

  var planet = await prisma.planet.create({
    data: {
      ownerId: id,
      name: "Planet " + id.substring(id.length - 5),
      titanium: 1000,
      silicate: 1000,
      isotope: 1000,
    },
  });

  if (!planet) {
    throw new Error("Failed to create planet");
  }

  return user;
};

export const getUserState = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      planets: true,
    },
  });
};
