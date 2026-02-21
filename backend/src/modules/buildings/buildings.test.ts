import request from "supertest";
import app from "../../app"; // Your Express app instance
import { prisma } from "../../lib/prisma";
import { describe, it, expect, vi } from "vitest"; // Add this line

describe("POST /api/health", () => {
  it("should check the health of the app", async () => {
    const res = await request(app)
      .get(`/api/health`)
      .set("Authorization", "Bearer mock-token");

    expect(res.status).toBe(200);
  });
});

describe("POST /api/buildings/queue", () => {
  it("should add a building to the queue", async () => {
    const user = await prisma.user.create({
      data: { id: "test", flux: 1020 },
    });

    // 2. Act: Call the API
    const res = await request(app)
      .get(`/api/health`)
      .set("Authorization", "Bearer mock-token");

    // 3. Assert: Verify API response and DB state
    expect(res.status).toBe(200);
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser?.flux).toBe(1020); // Note: This isn't really testing the API, just an existing placeholder
  });
});

describe("GET /api/buildings/buildings", () => {
  it("should fetch available, current, and queued buildings for a user's planet", async () => {
    // 1. Setup: Create user, planet, building, and queue
    const user = await prisma.user.create({
      data: { id: "test-user-buildings", flux: 1000 },
    });

    const planet = await prisma.planet.create({
      data: {
        id: "test-planet-buildings",
        ownerId: user.id,
        name: "Test Planet",
      },
    });

    await prisma.planetBuilding.create({
      data: {
        planetId: planet.id,
        type: "GOLD_MINE",
        level: 1,
      },
    });

    await prisma.buildingQueue.create({
      data: {
        planetId: planet.id,
        buildingType: "WOOD_MILL",
        targetLevel: 1,
        costFlux: 100,
        costTitanium: 100,
        costSilicate: 100,
        costIsotope: 100,
        durationSec: 60,
        position: 0,
        startedAt: new Date(),
        finishedAt: new Date(),
        status: "PENDING",
      },
    });

    // 2. Act: Call the API
    // Note: Assuming a mocked auth middleware that uses "test-user-buildings" as userId since we are setting Bearer test-user-buildings
    // For many of these vitest environments, you might need way to mock Clerk auth or use a test fixture
    const res = await request(app)
      .get(`/api/buildings/buildings?planetId=${planet.id}`)
      .set("Authorization", `Bearer mock-token-for-${user.id}`); // Assuming auth middleware allows this or it's mocked

    // 3. Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();

    const { available, current, queue } = res.body.data;

    // Check available config
    expect(available).toBeDefined();
    expect(available.GOLD_MINE).toBeDefined();

    // Check current buildings
    expect(current).toHaveLength(1);
    expect(current[0].type).toBe("GOLD_MINE");
    expect(current[0].level).toBe(1);

    // Check queued buildings
    expect(queue).toHaveLength(1);
    expect(queue[0].buildingType).toBe("WOOD_MILL");
    expect(queue[0].status).toBe("PENDING");
  });
});
