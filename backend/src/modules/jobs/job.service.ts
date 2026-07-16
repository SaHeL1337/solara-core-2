import {
  QueueStatus,
  FleetMovementStatus,
  MissionType,
  SpaceObjectType,
} from "../../generated/prisma";
import { prisma } from "../../lib/prisma";
import { getBuildingConfig } from "../buildings/buildings.config.service";
import { getShipConfig } from "../ships/ships.config.service";
import { getBuildingLevel } from "../buildings/buildings.service";
import { createMessage } from "../messages/messages.service";
import { MessageCategory } from "../../generated/prisma";
import { ResourceService } from "../resources/resourc.service";
import gameConfig from "../../config/game.json";
import shipConfigJson from "../../config/ships.json";

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

  async processCompletedResearch() {
    try {
      const completedQueues = await prisma.researchQueue.findMany({
        where: {
          status: QueueStatus.BUILDING,
          finishedAt: {
            lte: new Date(),
          },
        },
      });

      for (const queueItem of completedQueues) {
        await prisma.$transaction(async (tx: any) => {
          const item = await tx.researchQueue.findUnique({ where: { id: queueItem.id } });
          if (!item || item.status !== QueueStatus.BUILDING) return;

          await tx.researchedNode.create({
            data: {
              userId: item.userId,
              nodeId: item.nodeId,
              level: 1,
            },
          });

          await tx.researchQueue.update({
            where: { id: queueItem.id },
            data: { status: QueueStatus.COMPLETED },
          });

          await tx.researchQueue.delete({ where: { id: queueItem.id } });
        });
      }
    } catch (error) {
      console.error("Error processing completed research:", error);
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
              
              // Upsert the scan report with failed = true
              await tx.scanReport.upsert({
                where: {
                  userId_planetId: {
                    userId: fleet.userId,
                    planetId: target.planet.id
                  }
                },
                update: {
                  data: { failed: true, losses },
                  createdAt: new Date()
                },
                create: {
                  userId: fleet.userId,
                  planetId: target.planet.id,
                  data: { failed: true, losses }
                }
              });
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
                ownerId: target.planet.ownerId,
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
      } else if (missionType === MissionType.CONQUER) {
        await this.handleConquerArrival(tx, fleet);
      } else if (missionType === MissionType.HOLD) {
        await this.handleHoldArrival(tx, fleet);
      } else if (missionType === MissionType.ATTACK) {
        await this.handleAttackArrival(tx, fleet);
      }

      // For HOLD and CONQUER (successful), the fleet stays as HOLDING — skip the return logic
      // Re-check fleet status since handlers may have changed it
      const updatedFleet = await tx.fleetMovement.findUnique({ where: { id } });
      if (updatedFleet && updatedFleet.status === FleetMovementStatus.HOLDING) {
        return; // Fleet is holding, don't set to returning
      }

      // Check if there are any ships left to return (colony ships may have been consumed)
      const remainingShips = await tx.fleetShip.findMany({
        where: { fleetMovementId: id, count: { gt: 0 } },
      });

      if (remainingShips.length === 0) {
        // No ships left — mark as completed directly
        await tx.fleetMovement.update({
          where: { id },
          data: { status: FleetMovementStatus.COMPLETED },
        });
      } else {
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
      }
    });
  }

  /**
   * Handle CONQUER mission arrival:
   * 1. Combat (50/50) against garrison
   * 2. If won: consume colony ship (planet), start conquest, fleet → HOLDING
   * 3. If lost: fleet returns home
   */
  private async handleConquerArrival(tx: any, fleet: any) {
    const { id, targetId, ships, userId } = fleet;

    if (!targetId) {
      console.log(`  Conquest mission ${id} target was destroyed before arrival.`);
      await createMessage({
        recipientId: userId,
        title: "Conquest Mission: Target Lost",
        body: JSON.stringify({
          type: "CONQUER_FAIL",
          message: "Your fleet arrived at the coordinates, but the target was no longer there.",
          targetX: fleet.targetX,
          targetY: fleet.targetY,
        }),
        category: MessageCategory.CONQUEST,
        tags: ["conquest", "system"],
      });
      return;
    }

    const target = await tx.spaceObject.findUnique({
      where: { id: targetId },
      include: {
        planet: { include: { owner: true, ships: true } },
        wormhole: true,
        conquest: true,
      },
    });

    if (!target) return;

    console.log(`  Executing CONQUER mission at ${target.name}`);

    const targetConquest = target.conquest;
    const isAlreadyConquering = targetConquest && targetConquest.isActive;

    if (isAlreadyConquering) {
      if (target.type === SpaceObjectType.WORMHOLE) {
        // Wormhole: switch to HOLDING directly, no combat needed
        console.log(`  Wormhole conquest already in progress. Converting fleet ${id} to HOLDING.`);
        await tx.fleetMovement.update({
          where: { id },
          data: { status: FleetMovementStatus.HOLDING },
        });

        await createMessage({
          recipientId: userId,
          title: `Fleet Holding: ${target.name}`,
          body: JSON.stringify({
            type: "FLEET_HOLDING",
            targetName: target.name,
            spaceObjectId: targetId,
            targetX: target.x,
            targetY: target.y,
          }),
          category: MessageCategory.CONQUEST,
          tags: ["conquest", "holding"],
        });
        return;
      } else if (target.type === SpaceObjectType.PLANET) {
        // Planet: check if it's the same initiator
        if (targetConquest.initiatorId === userId) {
          console.log(`  Planet conquest already in progress by same user. Converting fleet ${id} to HOLDING.`);
          await tx.fleetMovement.update({
            where: { id },
            data: { status: FleetMovementStatus.HOLDING },
          });

          await createMessage({
            recipientId: userId,
            title: `Fleet Holding: ${target.name}`,
            body: JSON.stringify({
              type: "FLEET_HOLDING",
              targetName: target.name,
              spaceObjectId: targetId,
              targetX: target.x,
              targetY: target.y,
            }),
            category: MessageCategory.CONQUEST,
            tags: ["conquest", "holding"],
          });
          return;
        }
      }
    }

    // Check if target has garrison (ships)
    const garrisonShips = target.planet?.ships || [];
    const hasGarrison = garrisonShips.some((s: any) => s.count > 0);

    // Combat resolution: if garrison exists, 50/50 random. If no garrison, auto-win.
    let combatWon = true;
    if (hasGarrison) {
      combatWon = Math.random() >= 0.5;
    }

    if (!combatWon) {
      console.log(`  Combat lost at ${target.name}. Fleet retreating.`);
      await createMessage({
        recipientId: userId,
        title: `Conquest Failed: ${target.name}`,
        body: JSON.stringify({
          type: "CONQUER_FAIL",
          message: "Your fleet was defeated in combat. All ships are returning home.",
          targetName: target.name,
          targetX: target.x,
          targetY: target.y,
        }),
        category: MessageCategory.CONQUEST,
        tags: ["conquest", "failed"],
      });
      return; // Fleet will be set to RETURNING by the caller
    }

    // === ATTACKER WON ===
    console.log(`  Combat won at ${target.name}. Starting conquest.`);

    // If there was an existing planet conquest by a different player, delete it and return their holding fleets
    if (target.type === SpaceObjectType.PLANET && targetConquest && targetConquest.isActive) {
      console.log(`  Overturning existing conquest on planet ${target.name} (initiator: ${targetConquest.initiatorId})`);
      
      // Delete old conquest record
      await tx.conquest.delete({
        where: { id: targetConquest.id },
      });

      // Send other player's holding fleets returning home
      const otherHoldingFleets = await tx.fleetMovement.findMany({
        where: {
          targetId,
          status: FleetMovementStatus.HOLDING,
          userId: { not: userId },
        },
      });

      for (const oldFleet of otherHoldingFleets) {
        const travelDuration = oldFleet.arrivalTime.getTime() - oldFleet.startTime.getTime();
        const returnArrivalTime = new Date(Date.now() + travelDuration);
        await tx.fleetMovement.update({
          where: { id: oldFleet.id },
          data: {
            status: FleetMovementStatus.RETURNING,
            returnArrivalTime,
          },
        });

        await createMessage({
          recipientId: oldFleet.userId,
          title: `Siege Overturned: ${target.name}`,
          body: JSON.stringify({
            type: "CONQUEST_BROKEN",
            message: `Another player (${userId.slice(0, 5)}) has won a combat at ${target.name} and initiated their own conquest. Your holding fleet has been recalled and is returning home.`,
            targetName: target.name,
            targetX: target.x,
            targetY: target.y,
          }),
          category: MessageCategory.CONQUEST,
          tags: ["conquest", "broken"],
        });
      }
    }

    // Destroy garrison ships on the planet
    if (target.planet) {
      await tx.planetShip.deleteMany({
        where: { planetId: target.planet.id },
      });
      console.log(`  Garrison ships destroyed at ${target.name}`);
    }

    // Consume colony ship (for planet conquests only)
    if (target.type === SpaceObjectType.PLANET) {
      const conquestCfg = (gameConfig as any).conquest;
      if (conquestCfg.colonyShipConsumed) {
        await tx.fleetShip.updateMany({
          where: { fleetMovementId: id, type: "COLONY_SHIP" },
          data: { count: 0 },
        });
        console.log(`  Colony ship consumed.`);
      }
    }

    // Calculate conquest points required
    const conquestConfig = (gameConfig as any).conquest;
    let pointsRequired = conquestConfig.conquestPointsRequired;
    if (target.type === SpaceObjectType.WORMHOLE && target.wormhole) {
      pointsRequired = target.wormhole.threatLevel * conquestConfig.conquestPointsRequired * (conquestConfig.wormholeConquestPointsMultiplier || 1);
    }

    // Create conquest record
    await tx.conquest.create({
      data: {
        spaceObjectId: targetId,
        initiatorId: userId,
        conquestPoints: 0,
        conquestPointsRequired: pointsRequired,
        lastTickAt: new Date(),
        startedAt: new Date(),
        isActive: true,
      },
    });

    // Set fleet to HOLDING
    await tx.fleetMovement.update({
      where: { id },
      data: { status: FleetMovementStatus.HOLDING },
    });

    // Destroy defender's ship queue (if planet)
    if (target.planet) {
      const deletedQueues = await tx.shipQueue.deleteMany({
        where: {
          planetId: target.planet.id,
          status: { in: [QueueStatus.PENDING, QueueStatus.BUILDING] },
        },
      });
      if (deletedQueues.count > 0) {
        console.log(`  Destroyed ${deletedQueues.count} ship queue items for defender.`);
      }
    }

    // Send messages
    await createMessage({
      recipientId: userId,
      title: `Conquest Initiated: ${target.name}`,
      body: JSON.stringify({
        type: "CONQUEST_STARTED",
        targetName: target.name,
        spaceObjectId: targetId,
        pointsRequired,
        targetX: target.x,
        targetY: target.y,
      }),
      category: MessageCategory.CONQUEST,
      tags: ["conquest", "started"],
    });

    // Notify defender (if owned planet, not SYSTEM)
    if (target.planet && target.planet.ownerId !== "SYSTEM") {
      await createMessage({
        recipientId: target.planet.ownerId,
        title: `Planet Under Siege: ${target.name}`,
        body: JSON.stringify({
          type: "PLANET_UNDER_SIEGE",
          targetName: target.name,
          spaceObjectId: targetId,
          planetId: target.planet.id,
          attackerId: userId,
          targetX: target.x,
          targetY: target.y,
        }),
        category: MessageCategory.CONQUEST,
        tags: ["conquest", "siege"],
      });
    }
  }

  /**
   * Handle HOLD mission arrival: fleet goes to HOLDING status
   */
  private async handleHoldArrival(tx: any, fleet: any) {
    const { id, targetId, userId } = fleet;

    if (!targetId) {
      console.log(`  Hold mission ${id} target was destroyed before arrival.`);
      return; // Will be set to RETURNING by caller
    }

    const target = await tx.spaceObject.findUnique({ where: { id: targetId } });
    if (!target) return;

    console.log(`  Fleet ${id} now holding at ${target.name}`);

    await tx.fleetMovement.update({
      where: { id },
      data: { status: FleetMovementStatus.HOLDING },
    });

    await createMessage({
      recipientId: userId,
      title: `Fleet Holding: ${target.name}`,
      body: JSON.stringify({
        type: "FLEET_HOLDING",
        targetName: target.name,
        spaceObjectId: targetId,
        targetX: target.x,
        targetY: target.y,
      }),
      category: MessageCategory.SYSTEM,
      tags: ["fleet", "holding"],
    });
  }

  /**
   * Handle ATTACK mission arrival (counter-siege):
   * If target has active conquest → 50/50 to break the siege
   * If no active conquest → fleet returns with message
   */
  private async handleAttackArrival(tx: any, fleet: any) {
    const { id, targetId, userId } = fleet;

    if (!targetId) {
      console.log(`  Attack mission ${id} target was destroyed before arrival.`);
      return;
    }

    const target = await tx.spaceObject.findUnique({
      where: { id: targetId },
      include: { conquest: { where: { isActive: true } } },
    });

    if (!target) return;

    const conquest = target.conquest;

    if (!conquest) {
      console.log(`  No active conquest at ${target.name}. Fleet returning.`);
      await createMessage({
        recipientId: userId,
        title: `Attack: No Hostile Presence`,
        body: JSON.stringify({
          type: "ATTACK_NO_TARGET",
          message: "Your fleet arrived but found no hostile presence to engage.",
          targetName: target.name,
          targetX: target.x,
          targetY: target.y,
        }),
        category: MessageCategory.ATTACK,
        tags: ["attack", "system"],
      });
      return; // Will be set to RETURNING by caller
    }

    // Counter-siege combat: 50/50
    const counterAttackWon = Math.random() >= 0.5;

    if (!counterAttackWon) {
      console.log(`  Counter-attack failed at ${target.name}. Fleet returning.`);
      await createMessage({
        recipientId: userId,
        title: `Counter-Attack Failed: ${target.name}`,
        body: JSON.stringify({
          type: "COUNTER_ATTACK_FAILED",
          message: "Your counter-attack was repelled. The siege continues.",
          targetName: target.name,
          targetX: target.x,
          targetY: target.y,
        }),
        category: MessageCategory.ATTACK,
        tags: ["attack", "failed"],
      });
      return; // Will be set to RETURNING by caller
    }

    // === COUNTER-ATTACK SUCCEEDED — Break the siege ===
    console.log(`  Counter-attack succeeded at ${target.name}! Siege broken.`);

    // Delete conquest record
    await tx.conquest.delete({ where: { id: conquest.id } });

    // Send all HOLDING fleets at this location back home
    const holdingFleets = await tx.fleetMovement.findMany({
      where: {
        targetId,
        status: FleetMovementStatus.HOLDING,
      },
    });

    for (const holdingFleet of holdingFleets) {
      const travelDuration = holdingFleet.arrivalTime.getTime() - holdingFleet.startTime.getTime();
      const returnArrivalTime = new Date(Date.now() + travelDuration);

      await tx.fleetMovement.update({
        where: { id: holdingFleet.id },
        data: {
          status: FleetMovementStatus.RETURNING,
          returnArrivalTime,
        },
      });

      // Notify each holding fleet owner
      if (holdingFleet.userId !== userId) {
        await createMessage({
          recipientId: holdingFleet.userId,
          title: `Siege Broken: ${target.name}`,
          body: JSON.stringify({
            type: "SIEGE_BROKEN",
            message: "The siege has been broken by a counter-attack. Your fleet is returning home.",
            targetName: target.name,
            targetX: target.x,
            targetY: target.y,
          }),
          category: MessageCategory.CONQUEST,
          tags: ["conquest", "broken"],
        });
      }
    }

    // Notify attacker (counter-attacker)
    await createMessage({
      recipientId: userId,
      title: `Siege Broken: ${target.name}`,
      body: JSON.stringify({
        type: "COUNTER_ATTACK_SUCCESS",
        message: "Your counter-attack was successful! The siege has been broken.",
        targetName: target.name,
        targetX: target.x,
        targetY: target.y,
      }),
      category: MessageCategory.CONQUEST,
      tags: ["conquest", "broken"],
    });

    // Notify conquest initiator
    await createMessage({
      recipientId: conquest.initiatorId,
      title: `Conquest Lost: ${target.name}`,
      body: JSON.stringify({
        type: "CONQUEST_BROKEN",
        message: "Your conquest has been broken by a counter-attack. All holding fleets are returning.",
        targetName: target.name,
        targetX: target.x,
        targetY: target.y,
      }),
      category: MessageCategory.CONQUEST,
      tags: ["conquest", "lost"],
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

  /**
   * Process conquest ticks: calculate conquest points for all active conquests
   */
  async processConquestTicks() {
    try {
      const conquestConfig = (gameConfig as any).conquest;
      const tickIntervalMs = conquestConfig.conquestTickIntervalMinutes * 60 * 1000;
      const now = new Date();

      // Find all active conquests that are due for a tick
      const activeConquests = await prisma.conquest.findMany({
        where: {
          isActive: true,
          lastTickAt: {
            lte: new Date(now.getTime() - tickIntervalMs),
          },
        },
        include: {
          spaceObject: {
            include: {
              planet: true,
              wormhole: true,
            },
          },
        },
      });

      for (const conquest of activeConquests) {
        await this.processConquestTick(conquest, now, conquestConfig);
      }
    } catch (error) {
      console.error("Error processing conquest ticks:", error);
    }
  }

  private async processConquestTick(conquest: any, now: Date, conquestConfig: any) {
    try {
      await prisma.$transaction(async (tx: any) => {
        // Re-fetch to ensure freshness
        const fresh = await tx.conquest.findUnique({ where: { id: conquest.id } });
        if (!fresh || !fresh.isActive) return;

        const minutesElapsed = (now.getTime() - fresh.lastTickAt.getTime()) / (1000 * 60);
        if (minutesElapsed < conquestConfig.conquestTickIntervalMinutes) return;

        // Find all HOLDING fleets at this location
        const holdingFleets = await tx.fleetMovement.findMany({
          where: {
            targetId: fresh.spaceObjectId,
            status: FleetMovementStatus.HOLDING,
          },
          include: { ships: true },
        });

        // Calculate total population from holding fleets
        let totalPopulation = 0;
        for (const fleet of holdingFleets) {
          for (const ship of fleet.ships) {
            const shipCfg = (shipConfigJson as any)[ship.type];
            if (shipCfg?.cost?.population) {
              totalPopulation += shipCfg.cost.population * ship.count;
            }
          }
        }

        let tickPoints = 0;
        if (totalPopulation >= conquestConfig.minimumPopulationForConquest) {
          tickPoints = (totalPopulation / conquestConfig.populationPerConquestPoint) * minutesElapsed;
        }

        let newPoints = fresh.conquestPoints;
        let isAbandoned = false;

        if (tickPoints === 0) {
          // Decay
          const decay = fresh.conquestPointsRequired * (conquestConfig.conquestDecayPercent / 100);
          newPoints = fresh.conquestPoints - decay;
          console.log(`  Conquest ${fresh.id}: decay -${decay.toFixed(1)}, now ${newPoints.toFixed(1)}/${fresh.conquestPointsRequired}`);
          if (newPoints < 0) {
            isAbandoned = true;
          }
        } else {
          newPoints += tickPoints;
          console.log(`  Conquest ${fresh.id}: +${tickPoints.toFixed(1)} points (${totalPopulation} pop), now ${newPoints.toFixed(1)}/${fresh.conquestPointsRequired}`);
        }

        if (isAbandoned) {
          console.log(`  Conquest ${fresh.id} abandoned due to negative points (siege points < 0).`);
          
          // 1. Delete conquest record
          await tx.conquest.delete({ where: { id: fresh.id } });

          // 2. Return holding fleets
          const spaceObjectName = conquest.spaceObject.name;
          const targetX = conquest.spaceObject.x;
          const targetY = conquest.spaceObject.y;

          const holdingFleets = await tx.fleetMovement.findMany({
            where: {
              targetId: fresh.spaceObjectId,
              status: FleetMovementStatus.HOLDING,
            },
          });

          for (const holdingFleet of holdingFleets) {
            const travelDuration = holdingFleet.arrivalTime.getTime() - holdingFleet.startTime.getTime();
            const returnArrivalTime = new Date(Date.now() + travelDuration);

            await tx.fleetMovement.update({
              where: { id: holdingFleet.id },
              data: {
                status: FleetMovementStatus.RETURNING,
                returnArrivalTime,
              },
            });

            await createMessage({
              recipientId: holdingFleet.userId,
              title: `Siege Collapsed: ${spaceObjectName}`,
              body: JSON.stringify({
                type: "CONQUEST_BROKEN",
                message: `The siege at ${spaceObjectName} has collapsed due to lack of active fleet presence and has been abandoned. Your fleet is returning home.`,
                targetName: spaceObjectName,
                targetX,
                targetY,
              }),
              category: MessageCategory.CONQUEST,
              tags: ["conquest", "abandoned"],
            });
          }
        } else if (newPoints >= fresh.conquestPointsRequired) {
          await this.completeConquest(tx, fresh, conquest.spaceObject);
        } else {
          await tx.conquest.update({
            where: { id: fresh.id },
            data: {
              conquestPoints: newPoints,
              lastTickAt: now,
            },
          });
        }
      });
    } catch (error) {
      console.error(`Error processing conquest tick for ${conquest.id}:`, error);
    }
  }

  private async completeConquest(tx: any, conquest: any, spaceObject: any) {
    console.log(`  === CONQUEST COMPLETE: ${spaceObject.name} ===`);

    const targetId = conquest.spaceObjectId;

    if (spaceObject.type === SpaceObjectType.PLANET && spaceObject.planet) {
      const previousOwnerId = spaceObject.planet.ownerId;

      // Transfer ownership
      await tx.planet.update({
        where: { id: spaceObject.planet.id },
        data: { ownerId: conquest.initiatorId },
      });

      console.log(`  Planet ${spaceObject.name} ownership transferred to ${conquest.initiatorId}`);

      // Destroy defender's in-transit fleets
      const transitFleets = await tx.fleetMovement.findMany({
        where: {
          originId: spaceObject.planet.id,
          status: { in: [FleetMovementStatus.EN_ROUTE, FleetMovementStatus.RETURNING] },
        },
        include: { ships: true },
      });

      for (const transitFleet of transitFleets) {
        // Delete fleet ships (destroyed)
        await tx.fleetShip.deleteMany({
          where: { fleetMovementId: transitFleet.id },
        });
        await tx.fleetMovement.update({
          where: { id: transitFleet.id },
          data: { status: FleetMovementStatus.COMPLETED },
        });
      }

      if (transitFleets.length > 0) {
        console.log(`  Destroyed ${transitFleets.length} in-transit fleets belonging to defender.`);
      }

      // Send conquest success message
      await createMessage({
        recipientId: conquest.initiatorId,
        title: `Planet Conquered: ${spaceObject.name}`,
        body: JSON.stringify({
          type: "CONQUEST_COMPLETE",
          targetName: spaceObject.name,
          spaceObjectId: targetId,
          planetId: spaceObject.planet.id,
          targetX: spaceObject.x,
          targetY: spaceObject.y,
        }),
        category: MessageCategory.CONQUEST,
        tags: ["conquest", "success"],
      });

      // Notify defender
      if (previousOwnerId !== "SYSTEM") {
        await createMessage({
          recipientId: previousOwnerId,
          title: `Planet Lost: ${spaceObject.name}`,
          body: JSON.stringify({
            type: "PLANET_LOST",
            targetName: spaceObject.name,
            planetId: spaceObject.planet.id,
            conqueredBy: conquest.initiatorId,
            targetX: spaceObject.x,
            targetY: spaceObject.y,
          }),
          category: MessageCategory.CONQUEST,
          tags: ["conquest", "lost"],
        });

        // Check if defender has any remaining planets
        const remainingPlanets = await tx.planet.count({
          where: { ownerId: previousOwnerId },
        });

        if (remainingPlanets === 0) {
          console.log(`  Player ${previousOwnerId} has been defeated!`);
          await tx.user.update({
            where: { id: previousOwnerId },
            data: { isDefeated: true, isSetupComplete: false },
          });

          await createMessage({
            recipientId: previousOwnerId,
            title: "Defeat: All Planets Lost",
            body: JSON.stringify({
              type: "DEFEATED",
              message: "You have lost all your planets. Set up a new command center to continue playing.",
            }),
            category: MessageCategory.CONQUEST,
            tags: ["conquest", "defeated"],
          });
        }
      }
    } else if (spaceObject.type === SpaceObjectType.WORMHOLE) {
      console.log(`  Wormhole ${spaceObject.name} is closing.`);

      console.log(`  Wormhole ${spaceObject.name} has been closed!`);

      await createMessage({
        recipientId: conquest.initiatorId,
        title: `Wormhole Closed: ${spaceObject.name}`,
        body: JSON.stringify({
          type: "WORMHOLE_CLOSED",
          targetName: spaceObject.name,
          spaceObjectId: targetId,
          targetX: spaceObject.x,
          targetY: spaceObject.y,
        }),
        category: MessageCategory.CONQUEST,
        tags: ["conquest", "wormhole"],
      });
    }

    // Return all HOLDING fleets at this location
    const holdingFleets = await tx.fleetMovement.findMany({
      where: {
        targetId,
        status: FleetMovementStatus.HOLDING,
      },
    });

    for (const holdingFleet of holdingFleets) {
      const travelDuration = holdingFleet.arrivalTime.getTime() - holdingFleet.startTime.getTime();
      const returnArrivalTime = new Date(Date.now() + travelDuration);

      await tx.fleetMovement.update({
        where: { id: holdingFleet.id },
        data: {
          status: FleetMovementStatus.RETURNING,
          returnArrivalTime,
        },
      });

      // Notify fleet owner (if not the initiator, they already got a message)
      if (holdingFleet.userId !== conquest.initiatorId) {
        await createMessage({
          recipientId: holdingFleet.userId,
          title: `Conquest Complete: ${spaceObject.name}`,
          body: JSON.stringify({
            type: "CONQUEST_COMPLETE_PARTICIPANT",
            targetName: spaceObject.name,
            spaceObjectId: targetId,
            message: "The conquest is complete. Your fleet is returning home.",
          }),
          category: MessageCategory.CONQUEST,
          tags: ["conquest", "complete"],
        });
      }
    }

    if (spaceObject.type === SpaceObjectType.WORMHOLE) {
      await tx.spaceObject.delete({
        where: { id: targetId },
      });
      console.log(`  Wormhole SpaceObject ${targetId} deleted successfully.`);
    } else {
      // Mark conquest as inactive
      await tx.conquest.update({
        where: { id: conquest.id },
        data: { isActive: false, conquestPoints: conquest.conquestPointsRequired },
      });
    }
  }
}

export const jobService = new JobService();
