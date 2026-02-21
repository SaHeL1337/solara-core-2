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
          startedAt: {
            // startedAt + duration <= now => now >= startedAt + duration
            // This requires a raw query or calculating in memory since Prisma doesn't
            // support `now() >= startedAt + durationSec * 1000` easily in pure Prisma API.
            // We can fetch all "BUILDING" items and filter them in TS, or use raw.
            // Given the polling nature, we'll fetch BUILDING items and filter.
            not: null,
          },
        },
      });

      const now = new Date();
      const readyToComplete = completedQueues.filter((q: any) => {
        if (!q.startedAt) return false;
        const endTime = new Date(q.startedAt.getTime() + q.durationSec * 1000);
        return now >= endTime;
      });

      for (const queueItem of readyToComplete) {
        await this.completeBuildingQueue(queueItem.id);
      }
    } catch (error) {
      console.error("Error processing completed buildings:", error);
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
