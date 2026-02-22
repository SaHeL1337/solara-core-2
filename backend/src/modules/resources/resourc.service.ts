import { prisma } from "../../lib/prisma";
import { getBuildingConfig } from "../buildings/buildings.config.service";

export class ResourceService {
  /**
   * Synchronizes planet resources based on time elapsed.
   * This should be called before ANY action that costs or checks resources.
   */
  static async sync(planetId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch planet with building levels
      const planet = await tx.planet.findUniqueOrThrow({
        where: { id: planetId },
        include: { buildings: true },
      });

      const now = new Date();
      const secondsElapsed =
        (now.getTime() - planet.updatedAt.getTime()) / 1000;

      if (secondsElapsed <= 0) return planet;

      // 2. Calculate production rates (Resources per second)
      const titaniumRate = this.calculateRate(
        planet.buildings,
        "TITANIUM_MINE",
      );
      const silicateRate = this.calculateRate(
        planet.buildings,
        "SILICATE_MINE",
      );
      const isotopeRate = this.calculateRate(
        planet.buildings,
        "ISOTOPE_COLLECTOR",
      );

      // 3. Update the planet
      return await tx.planet.update({
        where: { id: planetId },
        data: {
          titanium: { increment: titaniumRate * secondsElapsed },
          silicate: { increment: silicateRate * secondsElapsed },
          isotope: { increment: isotopeRate * secondsElapsed },
          updatedAt: now,
        },
      });
    });
  }

  private static calculateRate(buildings: any[], type: string): number {
    const level = buildings.find((b) => b.type === type)?.level || 0;
    if (level === 0) return 0;
    const config = getBuildingConfig(type, level, level);
    return config.production / 3600; // per second
  }
}
