import { prisma } from "../../lib/prisma";
import techtreeConfig from "../../config/techtree.json";

export class TechtreeService {
  static async getTechtree(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        researchedNodes: true,
        researchQueue: true,
      },
    });
    if (!user) throw new Error("User not found");

    const playerClass = user.playerClass || "Commander";

    return {
      nodes: techtreeConfig,
      researched: user.researchedNodes.map((r: any) => r.nodeId),
      queue: user.researchQueue.map((q: any) => ({
        id: q.id,
        nodeId: q.nodeId,
        status: q.status,
        durationSec: q.durationSec,
        startedAt: q.startedAt,
        finishedAt: q.finishedAt,
      })),
      playerClass,
    };
  }

  static async startResearch(userId: string, nodeId: string) {
    const node = (techtreeConfig as any)[nodeId];
    if (!node) throw new Error("Invalid node ID");

    return await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { researchedNodes: true, researchQueue: true },
      });
      if (!user) throw new Error("User not found");

      if (node.classes && node.classes.length > 0) {
        if (!user.playerClass || !node.classes.includes(user.playerClass)) {
          throw new Error("Class requirement not met");
        }
      }

      for (const req of node.requirements || []) {
        if (!user.researchedNodes.find((r: any) => r.nodeId === req)) {
          throw new Error(`Requirement not met: ${req}`);
        }
      }

      if (user.researchedNodes.find((r: any) => r.nodeId === nodeId)) {
        throw new Error("Already researched");
      }
      if (user.researchQueue.length > 0) {
        throw new Error("Only one research can be active at a time");
      }

      if (user.flux < node.costFlux) {
        throw new Error("Not enough flux");
      }

      await tx.user.update({
        where: { id: userId },
        data: { flux: { decrement: node.costFlux } },
      });

      const now = new Date();
      const finishedAt = new Date(now.getTime() + node.buildTimeInSeconds * 1000);

      const queueItem = await tx.researchQueue.create({
        data: {
          userId,
          nodeId,
          status: "BUILDING",
          costFlux: node.costFlux,
          durationSec: node.buildTimeInSeconds,
          startedAt: now,
          finishedAt,
        },
      });

      return queueItem;
    });
  }
}
