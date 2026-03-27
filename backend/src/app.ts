import express from "express";
import buildingsRoutes from "../src/modules/buildings/buildings.routes";
import usersRoutes from "../src/modules/users/users.routes";
import planetsRoutes from "../src/modules/planets/planets.routes";
import mapRoutes from "../src/modules/map/map.routes";
import shipsRoutes from "../src/modules/ships/ships.routes";
import fleetRoutes from "../src/modules/fleet/fleet.routes";

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      (req as any).rawBody = buf.toString();
    },
  }),
);

app.use("/api/buildings", buildingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/planets", planetsRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/ships", shipsRoutes);
app.use("/api/fleet", fleetRoutes);

// Public route
app.get("/api/health", (req, res) => {
  res.send("OK");
});

export default app;
