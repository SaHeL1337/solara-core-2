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
      data: { id: "test", gold: 1020 },
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
    expect(updatedUser?.gold).toBe(1020);
  });
});
