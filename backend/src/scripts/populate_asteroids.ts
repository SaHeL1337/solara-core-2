import { prisma } from "../lib/prisma";

async function main() {
  const asteroids = await (prisma as any).spaceObject.findMany({
    where: {
      type: "ASTEROID",
      titanium: 0,
      silicate: 0,
      isotope: 0,
    },
  });

  console.log(`Found ${asteroids.length} empty asteroids to update.`);

  for (const asteroid of asteroids) {
    await (prisma as any).spaceObject.update({
      where: { id: asteroid.id },
      data: {
        titanium: Math.floor(Math.random() * 2000) + 500,
        silicate: Math.floor(Math.random() * 1500) + 300,
        isotope: Math.floor(Math.random() * 800) + 100,
      },
    });
  }

  console.log("Finished updating asteroids.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });
