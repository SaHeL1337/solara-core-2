import { QueueStatus } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

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

        // 4. Find the next pending item for this planet (by position)
        const nextPending = await tx.buildingQueue.findFirst({
          where: {
            planetId: queueItem.planetId,
            status: QueueStatus.PENDING,
          },
          orderBy: {
            position: "asc",
          },
        });

        if (nextPending) {
          // If there is a next pending item, start it now.
          // The startedAt is set to the exact completion time of the previous building
          // to ensure no time is lost between queues.
          const newStartTime = new Date(
            queueItem.startedAt!.getTime() + queueItem.durationSec * 1000,
          );

          await tx.buildingQueue.update({
            where: { id: nextPending.id },
            data: {
              status: QueueStatus.BUILDING,
              startedAt: newStartTime,
            },
          });
        }
      });
      console.log(`Successfully processed completion for queue ${queueId}`);
    } catch (error) {
      console.error(`Transaction failed for queue ${queueId}:`, error);
    }
  }
}

export const jobService = new JobService();
