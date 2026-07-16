import express from "express";
import buildingsRoutes from "../src/modules/buildings/buildings.routes";
import usersRoutes from "../src/modules/users/users.routes";
import planetsRoutes from "../src/modules/planets/planets.routes";
import mapRoutes from "../src/modules/map/map.routes";
import shipsRoutes from "../src/modules/ships/ships.routes";
import fleetRoutes from "../src/modules/fleet/fleet.routes";
import messagesRoutes from "../src/modules/messages/messages.routes";
import statisticsRoutes from "../src/modules/statistics/statistics.routes";
import adminRoutes from "../src/modules/admin/admin.routes";
import tagsRoutes from "../src/modules/tags/tags.routes";
import templatesRoutes from "../src/modules/templates/templates.routes";
import tradingRoutes from "../src/modules/trading/trading.routes";
import techtreeRoutes from "../src/modules/techtree/techtree.routes";
import conquestRoutes from "../src/modules/conquest/conquest.routes";

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
app.use("/api/messages", messagesRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/trading", tradingRoutes);
app.use("/api/techtree", techtreeRoutes);
app.use("/api/conquest", conquestRoutes);

// Public route
app.get("/api/health", (req, res) => {
  res.send("OK");
});

export default app;
