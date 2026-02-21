import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";

type BuildingConfig = {
  name: string;
  description: string;
  cost: Record<string, number>;
  production: number;
  buildTimeInSeconds: number;
};

type APIBuildingMapping = Record<string, BuildingConfig>;

export default function Buildings() {
  const { selectedPlanet } = useGame();
  const [availableBuildings, setAvailableBuildings] =
    useState<APIBuildingMapping>({});
  const [currentBuildings, setCurrentBuildings] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (!selectedPlanet) return;
      setIsLoading(true);
      try {
        const { data } = await api.get(
          `/buildings/buildings?planetId=${selectedPlanet.id}`,
        );
        setAvailableBuildings(data.data.available);
        setCurrentBuildings(data.data.current);
        setQueue(data.data.queue);
      } catch (err) {
        console.error("Failed to fetch buildings", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuildings();
  }, [selectedPlanet]);

  if (!selectedPlanet) {
    return (
      <div className="p-4 text-slate-300">
        Select a planet to view buildings.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-slate-300">Loading buildings...</div>;
  }

  const getBuildingLevel = (type: string) => {
    const building = currentBuildings.find((b) => b.type === type);
    return building ? building.level : 0;
  };

  const getQueueStatus = (type: string) => {
    const queued = queue.find((q) => q.buildingType === type);
    return queued ? queued.status : null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(availableBuildings).map(([type, config]) => {
        const level = getBuildingLevel(type);
        const status = getQueueStatus(type);

        // Calculate cost for next level
        const targetLevel = level + 1;
        const targetCosts: React.ReactNode[] = [];

        // Use config costs as base or calculate dynamically like backend depending on design
        Object.entries(config.cost).forEach(([resource, baseCost]) => {
          targetCosts.push(
            <span key={resource} className="capitalize">
              {Math.floor(baseCost * Math.pow(1.5, targetLevel - 1))} {resource}
            </span>,
          );
        });

        // Backend seems to calculate duration using: 60 * targetLevel
        const buildTime = 60 * targetLevel;

        return (
          <Card
            key={type}
            className="bg-slate-900 border-slate-800 text-slate-100 flex flex-col"
          >
            <CardHeader className="pb-2">
              <CardTitle>{config.name}</CardTitle>
              <CardDescription className="text-blue-400 font-semibold mb-1">
                Level {level}
              </CardDescription>
              <div className="text-xs text-slate-400 italic">
                {config.description}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm mb-4 bg-slate-950 p-3 rounded border border-slate-800">
                {config.production > 0 && (
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">Production</span>
                    <span className="text-emerald-400 font-medium">
                      +{config.production * targetLevel}/hr
                    </span>
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs">Build Time</span>
                  <span>{buildTime}s</span>
                </div>
              </div>

              <div className="flex flex-col text-sm mb-4 space-y-1">
                <span className="text-slate-500 text-xs text-center mb-1 border-b border-slate-800 pb-1">
                  Upgrade Cost (Lv {targetLevel})
                </span>
                <div className="flex justify-evenly text-amber-200/90 font-mono text-xs mt-1">
                  {targetCosts.length > 0 ? targetCosts : <span>Free</span>}
                </div>
              </div>

              <div className="mt-auto pt-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-all"
                  disabled={!!status}
                >
                  {status ? `Upgrading (${status})` : "Upgrade"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
