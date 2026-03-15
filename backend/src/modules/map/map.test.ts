import request from "supertest";
import app from "../../app";
import { prisma } from "../../lib/prisma";
import { describe, it, expect, vi } from "vitest";

describe("GET /api/map/objects", () => {
  it("should fetch space objects within the given bounding box", async () => {
    // 1. Setup: Create some space objects with specific coordinates
    await prisma.spaceObject.create({
      data: {
        type: "PLANET",
        name: "Test Planet 1",
        x: 10,
        y: 10,
      },
    });

    await prisma.spaceObject.create({
      data: {
        type: "ASTEROID",
        name: "Test Asteroid 1",
        x: 50,
        y: 50,
      },
    });

    await prisma.spaceObject.create({
      data: {
        type: "BLACK_HOLE",
        name: "Test Anomaly 1",
        x: 200,
        y: 200,
      },
    });

    // 2. Act: Query only the bounding box covering (0,0) to (100,100)
    const res = await request(app)
      .get(`/api/map/objects?minX=0&maxX=100&minY=0&maxY=100`)
      .set("Authorization", "Bearer mock-token");

    // 3. Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();

    const objects = res.body.data;

    // We expect the planet and asteroid only
    expect(objects.length).toBe(2);

    // Check mapping transformations
    const types = objects.map((o: any) => o.type).sort();
    expect(types).toEqual(["asteroid", "planet"]);
  });
});
