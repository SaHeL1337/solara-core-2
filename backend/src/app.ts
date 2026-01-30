import express from "express";
import { requireAuth } from "./middleware/auth";
import { prisma } from "./lib/prisma";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Public route
app.get("/api/health", (req, res) => {
  res.send("OK");
});

// Protected route: requireAuth will reject any request without a valid JWT
app.get("/api/game/state", requireAuth, (req, res) => {
  // req.auth contains the validated user information
  // @ts-ignore - Clerk adds auth to req but types might not be set up globally yet
  const userId = req.auth.userId;

  // Create a new user with a post
  const user = prisma.user.create({
    data: {
      gold: 50,
    },
  });

  // Fetch all users with their posts
  const allUsers = prisma.user.findMany({});

  res.json(JSON.stringify(allUsers, null, 2));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
