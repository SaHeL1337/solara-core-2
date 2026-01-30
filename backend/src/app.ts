import express from "express";
import { requireAuth } from "./middleware/auth";
import { prisma } from "./lib/prisma";
import { Webhook } from "svix";

const app = express();
const port = process.env.PORT || 3000;

app.use(
  express.json({
    verify: (req, res, buf) => {
      (req as any).rawBody = buf.toString();
    },
  }),
);

// Public route
app.get("/api/health", (req, res) => {
  res.send("OK");
});

// Protected route: requireAuth will reject any request without a valid JWT
app.get("/api/game/state", requireAuth, async (req, res) => {
  try {
    // Fetch all users
    const allUsers = await prisma.user.findMany();

    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching game state:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.post("/api/webhooks/clerk", async (req, res) => {
  const payload = (req as any).rawBody;
  const headers = req.headers;

  // 1. Verify the webhook signature (using your Webhook Signing Secret)
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: any;
  try {
    evt = wh.verify(payload, headers as any);
  } catch (err) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  // 2. Handle 'user.created' event
  if (evt.type === "user.created") {
    const { id, username, email_addresses } = evt.data;

    // 3. Initialize Game Data in your Prisma DB
    await prisma.user.upsert({
      where: { id: id },
      update: {},
      create: {
        id: id, // Use the Clerk ID as your primary key
        gold: 1000,
      },
    });
  }

  res.status(200).json({ success: true });
});
