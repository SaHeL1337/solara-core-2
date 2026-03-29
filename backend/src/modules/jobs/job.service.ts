import {
  QueueStatus,
  FleetMovementStatus,
  MissionType,
} from "../../generated/prisma";
import { prisma } from "../../lib/prisma";
import { getBuildingConfig } from "../buildings/buildings.config.service";
import { getShipConfig } from "../ships/ships.config.service";
import { getBuildingLevel } from "../buildings/buildings.service";
import { createMessage } from "../messages/messages.service";
import { MessageCategory } from "../../generated/prisma";
import { ResourceService } from "../resources/resourc.service";

export class JobService {
  async processCompletedBuildings() {
    try {
      // Find buildings that are 'BUILDING' and whose duration has passed
      // We process them one by one to handle any subsequent queued items properly.
      const completedQueues = await prisma.buildingQueue.findMany({
        where: {
          status: QueueStatus.BUILDING,
          finishedAt: {
            lte: new Date(),
          },
        },
      });

      for (const queueItem of completedQueues) {
        await this.completeBuildingQueue(queueItem.id);
      }
    } catch (error) {
      console.error("Error processing completed buildings:", error);
    }
  }

  async processCompletedShips() {
    try {
      // For ships, we process sequentially, one ship at a time based on durationSec.
      // So if quantity is 5, and 1 has finished, we need to increment completedCount and planetShip count.
      const buildingShipQueues = await prisma.shipQueue.findMany({
        where: {
          status: QueueStatus.BUILDING,
          startedAt: {
            not: null,
          },
        },
      });

      for (const queueItem of buildingShipQueues) {
        await this.checkShipQueueProgress(queueItem.id);
      }
    } catch (error) {
      console.error("Error processing running ships:", error);
    }
  }

  private async checkShipQueueProgress(queueId: string) {
    try {
      await prisma.$transaction(async (tx: any) => {
        const queueItem = await tx.shipQueue.findUnique({
          where: { id: queueId },
        });

        if (
          !queueItem ||
          queueItem.status !== QueueStatus.BUILDING ||
          !queueItem.startedAt
        ) {
          return;
        }

        const now = Date.now();
        const start = queueItem.startedAt.getTime();
        const elapsedSec = Math.floor((now - start) / 1000);

        if (elapsedSec >= queueItem.durationSec) {
          // A ship has finished!
          // Calculate how many ships finished (in case of long intervals)
          const shipsFinished = Math.floor(elapsedSec / queueItem.durationSec);

          let actualFinished = Math.min(
            shipsFinished,
            queueItem.quantity - queueItem.completedCount,
          );
          if (actualFinished <= 0) return;

          // 1. Upsert PlanetShip
          await tx.planetShip.upsert({
            where: {
              planetId_type: {
                planetId: queueItem.planetId,
                type: queueItem.shipType,
              },
            },
            update: {
              count: { increment: actualFinished },
            },
            create: {
              planetId: queueItem.planetId,
              type: queueItem.shipType,
              count: actualFinished,
            },
          });

          const newCompletedCount = queueItem.completedCount + actualFinished;

          if (newCompletedCount >= queueItem.quantity) {
            // Whole queue item is done
            await tx.shipQueue.update({
              where: { id: queueId },
              data: {
                status: QueueStatus.COMPLETED,
                completedCount: newCompletedCount,
              },
            });

            // Start next pending
            const nextPending = await tx.shipQueue.findFirst({
              where: {
                planetId: queueItem.planetId,
                status: QueueStatus.PENDING,
              },
              orderBy: {
                position: "asc",
              },
            });

            if (nextPending) {
              // start exactly when the last individual ship finished to avoid losing time
              const exactCompletionTime = new Date(
                start + actualFinished * queueItem.durationSec * 1000,
              );
              await tx.shipQueue.update({
                where: { id: nextPending.id },
                data: {
                  status: QueueStatus.BUILDING,
                  startedAt: exactCompletionTime,
                },
              });
            }
          } else {
            // Still building the remaining items in this queue batch
            const exactCompletionTimeForThese = new Date(
              start + actualFinished * queueItem.durationSec * 1000,
            );
            await tx.shipQueue.update({
              where: { id: queueId },
              data: {
                completedCount: newCompletedCount,
                startedAt: exactCompletionTimeForThese,
              },
            });
          }
        }
      });
    } catch (error) {
      console.error(`Transaction failed for ship queue ${queueId}:`, error);
    }
  }

  async processFleetMovements() {
    try {
      // 1. Process EN_ROUTE fleets that have arrived at their target
      const arrivingFleets = await (prisma as any).fleetMovement.findMany({
        where: {
          status: FleetMovementStatus.EN_ROUTE,
          arrivalTime: { lte: new Date() },
        },
        include: { ships: true, origin: true, target: true },
      });

      for (const fleet of arrivingFleets) {
        await this.handleFleetArrivalAtTarget(fleet);
      }

      // 2. Process RETURNING fleets that have arrived back home
      const returningFleets = await (prisma as any).fleetMovement.findMany({
        where: {
          status: FleetMovementStatus.RETURNING,
          returnArrivalTime: { lte: new Date() },
        },
        include: { ships: true, resources: true },
      });

      for (const fleet of returningFleets) {
        await this.handleFleetArrivalAtHome(fleet);
      }
    } catch (error) {
      console.error("Error processing fleet movements:", error);
    }
  }

  private async completeBuildingQueue(queueId: string) {
    try {
      // Use a transaction to ensure atomic updates
      await prisma.$transaction(async (tx: any) => {
        // 1. Fetch the queue item to ensure it's still BUILDING
        const queueItem = await tx.buildingQueue.findUnique({
          where: { id: queueId },
        });

        if (!queueItem || queueItem.status !== QueueStatus.BUILDING) {
          return; // Already processed
        }

        // 2. Mark this item as COMPLETED
        await tx.buildingQueue.update({
          where: { id: queueId },
          data: { status: QueueStatus.COMPLETED },
        });

        // 3. Upsert the PlanetBuilding level
        await tx.planetBuilding.upsert({
          where: {
            planetId_type: {
              planetId: queueItem.planetId,
              type: queueItem.buildingType,
            },
          },
          update: {
            level: queueItem.targetLevel,
          },
          create: {
            planetId: queueItem.planetId,
            type: queueItem.buildingType,
            level: queueItem.targetLevel,
          },
        });

        // 4. Update Population and Capacity if HOUSING_BLOCK
        if (queueItem.buildingType === "HOUSING_BLOCK") {
          const config = getBuildingConfig(
            "HOUSING_BLOCK",
            queueItem.targetLevel - 1,
            queueItem.targetLevel,
          );
          const capacityIncrease = config.productionIncrease || 0;
          if (capacityIncrease > 0) {
            await tx.planet.update({
              where: { id: queueItem.planetId },
              data: {
                populationCapacity: { increment: capacityIncrease },
                population: { increment: capacityIncrease },
              },
            });
          }
        }

        // 5. Update Storage Capacity if STORAGE
        if (queueItem.buildingType === "STORAGE") {
          const config = getBuildingConfig(
            "STORAGE",
            queueItem.targetLevel - 1,
            queueItem.targetLevel,
          );
          const capacityIncrease = config.productionIncrease || 0;
          if (capacityIncrease > 0) {
            await tx.planet.update({
              where: { id: queueItem.planetId },
              data: {
                storageCapacity: { increment: capacityIncrease },
              },
            });
          }
        }
      });
      console.log(`Successfully processed completion for queue ${queueId}`);
    } catch (error) {
      console.error(`Transaction failed for queue ${queueId}:`, error);
    }
  }

  private async handleFleetArrivalAtTarget(fleet: any) {
    console.log(
      `Fleet ${fleet.id} arrived at target ${fleet.targetId} (Mission: ${fleet.missionType})`,
    );

    await prisma.$transaction(async (tx: any) => {
      const { id, missionType, targetId, ships } = fleet;

      if (missionType === MissionType.MINE) {
        if (!targetId) {
          console.log(
            `  Mission ${id} target was destroyed before arrival. Skipping mining.`,
          );
          await createMessage({
            recipientId: fleet.userId,
            title: "Mining Mission: Target Lost",
            body: JSON.stringify({
              type: "MINE_FAIL",
              message:
                "Your fleet arrived at the coordinates, but the asteroid was no longer there.",
              targetX: fleet.targetX,
              targetY: fleet.targetY,
            }),
            category: MessageCategory.MINING,
            tags: ["mining", "system"],
          });
        } else {
          const target = await tx.spaceObject.findUnique({
            where: { id: targetId },
          });
          if (target) {
            console.log(`  Executing mining mission at ${target.name}`);

            let totalCapacity = 0;
            for (const ship of ships) {
              const config = getShipConfig(ship.type, 0);
              totalCapacity += config.capacity * ship.count;
            }

            const amountToMine = totalCapacity;
            console.log(
              `  Total mining capacity: ${totalCapacity}, Target resources: Ti:${(target as any).titanium}, Si:${(target as any).silicate}, Is:${(target as any).isotope}`,
            );

            const resources = ["titanium", "silicate", "isotope"];
            let remainingToMine = amountToMine;
            const collected: Record<string, number> = {
              titanium: 0,
              silicate: 0,
              isotope: 0,
            };

            const shuffledResources = [...resources].sort(
              () => Math.random() - 0.5,
            );
            // Distribute amountToMine across resources that are available
            for (const res of shuffledResources) {
              const available = (target as any)[res];
              const taken = Math.min(available, remainingToMine);
              collected[res] = taken;
              remainingToMine -= taken;
            }

            console.log(`  Fleet ${id} mined:`, collected);

            await tx.spaceObject.update({
              where: { id: targetId },
              data: {
                titanium: { decrement: collected.titanium },
                silicate: { decrement: collected.silicate },
                isotope: { decrement: collected.isotope },
              },
            });

            const updatedTarget = await tx.spaceObject.findUnique({
              where: { id: targetId },
            });
            let isDestroyed = false;
            let remainingResources = 0;

            if (updatedTarget) {
              remainingResources =
                updatedTarget.titanium +
                updatedTarget.silicate +
                updatedTarget.isotope;
              if (
                remainingResources <= 0 &&
                updatedTarget.type === "ASTEROID"
              ) {
                console.log(
                  `  Asteroid ${target.name} depleted and destroyed.`,
                );
                await tx.spaceObject.delete({ where: { id: targetId } });
                isDestroyed = true;
                remainingResources = 0;
              }
            } else {
              isDestroyed = true;
            }

            for (const [type, amount] of Object.entries(collected)) {
              if (amount > 0) {
                console.log(
                  `  Creating FleetResource: ${type.toUpperCase()} x ${amount}`,
                );
                await (tx as any).fleetResource.create({
                  data: {
                    fleetMovementId: id,
                    type: type.toUpperCase(),
                    amount,
                  },
                });
              }
            }

            // Create Mining Report Message
            await createMessage({
              recipientId: fleet.userId,
              title: `Mining Report: ${target.name}`,
              body: JSON.stringify({
                type: "MINE_REPORT",
                targetName: target.name,
                collected,
                remainingResources,
                capacity: totalCapacity,
                isDepleted: isDestroyed,
                targetX: target.x !== undefined ? target.x : fleet.targetX,
                targetY: target.y !== undefined ? target.y : fleet.targetY,
              }),
              category: MessageCategory.MINING,
              tags: ["mining", "system"],
            });
          }
        }
      } else if (missionType === MissionType.SCAN) {
        if (!targetId) {
          console.log(`  Mission ${id} target was destroyed before arrival. Skipping scan.`);
          await createMessage({
            recipientId: fleet.userId,
            title: "Fleet Log: Ghost Signal",
            body: JSON.stringify({
              type: "SCAN_FAIL",
              message: "Your scanners arrived at the coordinates, but found only empty space.",
            }),
            category: MessageCategory.REPORT,
            tags: ["scan", "system"],
          });
        } else {
          const target = await tx.spaceObject.findUnique({
            where: { id: targetId },
            include: {
              planet: {
                include: {
                  buildings: true,
                  ships: true,
                }
              }
            }
          });

          if (target && target.type === "PLANET" && target.planet) {
            console.log(`  Executing SCAN mission at ${target.name}`);

            const attackerScannersCount = ships.find((s: any) => s.type === "SCANNER")?.count || 0;
            const defenderScannersCount = target.planet.ships.find((s: any) => s.type === "SCANNER")?.count || 0;

            let reportData: any = null;
            let losses = 0;

            if (attackerScannersCount < defenderScannersCount) {
              // Attacker loses all scanners, sees nothing
              losses = attackerScannersCount;
            } else {
              // Attacker wins/draws. Losses formula
              const damage = defenderScannersCount * 2 - attackerScannersCount;
              losses = Math.max(0, Math.floor(damage));
              losses = Math.min(attackerScannersCount, losses);

              // Gather report data
              const outgoingFleets = await tx.fleetMovement.findMany({
                where: { originId: targetId, status: { not: "COMPLETED" } },
                include: { target: true, ships: true }
              });

              reportData = {
                resources: {
                  titanium: target.titanium,
                  silicate: target.silicate,
                  isotope: target.isotope,
                },
                buildings: target.planet.buildings.map((b: any) => ({
                  type: b.type,
                  level: b.level
                })),
                shipsOnPlanet: target.planet.ships.map((s: any) => ({
                  type: s.type,
                  count: s.count
                })),
                shipsAway: outgoingFleets.map((f: any) => ({
                  missionType: f.missionType,
                  targetName: f.target?.name || "Unknown",
                  ships: f.ships.map((s: any) => ({ type: s.type, count: s.count }))
                })),
                ownerId: target.planet.ownerId
              };

              // Upsert the scan report
              await tx.scanReport.upsert({
                where: {
                  userId_planetId: {
                    userId: fleet.userId,
                    planetId: target.planet.id
                  }
                },
                update: {
                  data: reportData,
                  createdAt: new Date()
                },
                create: {
                  userId: fleet.userId,
                  planetId: target.planet.id,
                  data: reportData
                }
              });
            }

            // Deduct lost scanners from fleet
            if (losses > 0) {
              await tx.fleetMovement.update({
                where: { id: fleet.id },
                data: {
                  ships: {
                    updateMany: {
                      where: { fleetMovementId: fleet.id, type: "SCANNER" },
                      data: { count: { decrement: losses } }
                    }
                  }
                }
              });
            }

            // Create appropriate player message
            const title = reportData ? `Scan Report: ${target.name}` : `Scan Failed: ${target.name}`;
            await createMessage({
              recipientId: fleet.userId,
              title,
              body: JSON.stringify({
                type: reportData ? "SCAN_SUCCESS" : "SCAN_FAIL",
                targetName: target.name,
                targetId: target.planet.id,
                losses,
                reportData
              }),
              category: MessageCategory.REPORT,
              tags: ["scan", "report"],
            });
          }
        }
      }

      const travelDuration =
        fleet.arrivalTime.getTime() - fleet.startTime.getTime();
      const returnArrivalTime = new Date(Date.now() + travelDuration);

      await tx.fleetMovement.update({
        where: { id },
        data: {
          status: FleetMovementStatus.RETURNING,
          returnArrivalTime,
        },
      });
    });
  }

  private async handleFleetArrivalAtHome(fleet: any) {
    console.log(`Fleet ${fleet.id} arrived back at home ${fleet.originId}`);
    await prisma.$transaction(async (tx: any) => {
      const { originId, ships, resources } = fleet;

      if (!originId) {
        console.log(
          `  Fleet ${fleet.id} has no origin! Ships and resources lost.`,
        );
        return;
      }

      // 0. Sync planet resources first to ensure current state is up to date
      await ResourceService.sync(originId, tx);

      // 1. Return ships to planet
      for (const ship of ships) {
        await tx.planetShip.upsert({
          where: { planetId_type: { planetId: originId, type: ship.type } },
          update: { count: { increment: ship.count } },
          create: { planetId: originId, type: ship.type, count: ship.count },
        });
      }

      // 2. Add resources to planet (respect storage capacity)
      const planet = await tx.planet.findUnique({
        where: { id: originId },
        include: { spaceObject: true },
      });

      if (planet) {
        const capacity = planet.storageCapacity;
        const addition: Record<string, number> = {
          titanium: 0,
          silicate: 0,
          isotope: 0,
        };

        const currentRes: Record<string, number> = {
          titanium: planet.spaceObject.titanium,
          silicate: planet.spaceObject.silicate,
          isotope: planet.spaceObject.isotope,
        };

        for (const res of resources) {
          const type = res.type.toLowerCase();
          const current = currentRes[type] || 0;
          const available = Math.max(0, capacity - current);
          const amount = Math.min(res.amount, available);
          addition[type] += amount;
          currentRes[type] += amount;
        }

        console.log(
          `  Returned resources to ${planet.name}: titanium:${addition.titanium}, silicate:${addition.silicate}, isotope:${addition.isotope}`,
        );

        await tx.spaceObject.update({
          where: { id: planet.id },
          data: {
            titanium: { increment: addition.titanium },
            silicate: { increment: addition.silicate },
            isotope: { increment: addition.isotope },
            updatedAt: new Date(),
          },
        });
      }

      // 3. Mark as COMPLETED (or delete)
      await (tx as any).fleetMovement.update({
        where: { id: fleet.id },
        data: { status: FleetMovementStatus.COMPLETED },
      });
      console.log(`  Fleet mission ${fleet.id} COMPLETED.`);
    });
  }
}

export const jobService = new JobService();
