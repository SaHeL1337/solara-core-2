import { prisma } from "../../lib/prisma";
import { ResourceService } from "../resources/resourc.service";
import { SpaceObjectType } from "../../generated/prisma/enums";

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

  var planet = await prisma.spaceObject.create({
    data: {
      type: SpaceObjectType.PLANET,
      name: "Planet " + id.substring(id.length - 5),
      titanium: 1000,
      silicate: 1000,
      isotope: 1000,
      planet: {
        create: {
          ownerId: id,
        },
      },
    },
  });

  if (!planet) {
    throw new Error("Failed to create planet");
  }

  return user;
};

export const getUserState = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      planets: {
        include: {
          buildings: true,
          spaceObject: true,
        },
      },
    },
  });

  if (!user) return null;

  const planetsWithProduction = user.planets.map((planet) => {
    const { buildings, spaceObject, ...rest } = planet;
    return {
      ...rest,
      ...spaceObject, // spread SpaceObject fields to match previous Planet shape
      production: ResourceService.getProductionRates(buildings),
    };
  });

  return {
    ...user,
    planets: planetsWithProduction,
  };
};
