import { prisma } from "../../lib/prisma";

export const getTags = async (userId: string) => {
  return await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
};

export const createTag = async (userId: string, name: string, color?: string) => {
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 20) {
    throw new Error("Tag name must be between 1 and 20 characters");
  }

  const cleanColor = color?.trim() || "#00E5FF";

  try {
    return await prisma.tag.create({
      data: {
        userId,
        name: trimmedName,
        color: cleanColor,
        properties: {},
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("A tag with this name already exists");
    }
    throw error;
  }
};

export const deleteTag = async (userId: string, tagId: string) => {
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, userId },
  });

  if (!tag) {
    throw new Error("Tag not found");
  }

  return await prisma.tag.delete({
    where: { id: tagId },
  });
};

export const assignTagToPlanet = async (userId: string, planetId: string, tagId: string) => {
  // Check if planet exists and belongs to the user
  const planet = await prisma.planet.findFirst({
    where: { id: planetId, ownerId: userId },
  });

  if (!planet) {
    throw new Error("Planet not found or not owned by user");
  }

  // Check if tag exists and belongs to the user
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, userId },
  });

  if (!tag) {
    throw new Error("Tag not found");
  }

  // Connect the tag
  return await prisma.planet.update({
    where: { id: planetId },
    data: {
      tags: {
        connect: { id: tagId },
      },
    },
    include: {
      tags: true,
    },
  });
};

export const removeTagFromPlanet = async (userId: string, planetId: string, tagId: string) => {
  // Check if planet exists and belongs to the user
  const planet = await prisma.planet.findFirst({
    where: { id: planetId, ownerId: userId },
  });

  if (!planet) {
    throw new Error("Planet not found or not owned by user");
  }

  // Disconnect the tag
  return await prisma.planet.update({
    where: { id: planetId },
    data: {
      tags: {
        disconnect: { id: tagId },
      },
    },
    include: {
      tags: true,
    },
  });
};
