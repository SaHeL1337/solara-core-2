import { prisma } from "../../lib/prisma";
import { getBuildingConfig } from "../buildings/buildings.config.service";

export class ResourceService {
  /**
   * Synchronizes planet resources based on time elapsed.
   * This should be called before ANY action that costs or checks resources.
   */
  static async sync(planetId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch planet with building levels and its space object
      const planet = await tx.planet.findUniqueOrThrow({
        where: { id: planetId },
        include: {
          buildings: true,
          spaceObject: true,
        },
      });

      if (!planet.spaceObject) return planet;

      const now = new Date();
      const secondsElapsed =
        (now.getTime() - planet.spaceObject.updatedAt.getTime()) / 1000;

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

      const currentTit = planet.spaceObject.titanium;
      const currentSil = planet.spaceObject.silicate;
      const currentIso = planet.spaceObject.isotope;
      const cap = planet.storageCapacity;

      const newTitanium = currentTit >= cap ? currentTit : Math.min(currentTit + titaniumRate * secondsElapsed, cap);
      const newSilicate = currentSil >= cap ? currentSil : Math.min(currentSil + silicateRate * secondsElapsed, cap);
      const newIsotope = currentIso >= cap ? currentIso : Math.min(currentIso + isotopeRate * secondsElapsed, cap);

      // 3. Update the space object
      const updatedSpaceObject = await tx.spaceObject.update({
        where: { id: planetId },
        data: {
          titanium: newTitanium,
          silicate: newSilicate,
          isotope: newIsotope,
          updatedAt: now,
        },
      });

      return {
        ...planet,
        spaceObject: updatedSpaceObject,
      };
    });
  }

  public static getProductionRates(buildings: any[]) {
    return {
      titanium: this.calculateRate(buildings, "TITANIUM_MINE") * 3600,
      silicate: this.calculateRate(buildings, "SILICATE_MINE") * 3600,
      isotope: this.calculateRate(buildings, "ISOTOPE_COLLECTOR") * 3600,
    };
  }

  private static calculateRate(buildings: any[], type: string): number {
    const level = buildings.find((b) => b.type === type)?.level || 0;
    if (level === 0) return 0;
    const config = getBuildingConfig(type, level, level);
    return config.production / 3600; // per second
  }
}
