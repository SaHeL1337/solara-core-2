import { useEffect, useState, useCallback, useRef } from "react";
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
  level: number;
  targetLevel: number;
  cost: Record<string, number>;
  production: number;
  buildTimeInSeconds: number;
};

type APIBuildingMapping = Record<string, BuildingConfig>;

export default function Buildings() {
  const { selectedPlanet, refreshUser } = useGame();
  const [availableBuildings, setAvailableBuildings] =
    useState<APIBuildingMapping>({});
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const prevPlanetId = useRef<string | null>(null);

  const fetchBuildings = useCallback(async () => {
    if (!selectedPlanet?.id) return;
    try {
      const { data } = await api.get(
        `/buildings/buildings?planetId=${selectedPlanet.id}`,
      );
      setAvailableBuildings(data.data.available);
      setQueue(data.data.queue);
    } catch (err) {
      console.error("Failed to fetch buildings", err);
    }
  }, [selectedPlanet?.id]);

  useEffect(() => {
    const loadData = async () => {
      // Only show the loading screen if we actually changed planets
      if (prevPlanetId.current !== selectedPlanet?.id) {
        setIsLoading(true);
        setAvailableBuildings({});
      }

      await fetchBuildings();

      setIsLoading(false);
      if (selectedPlanet?.id) {
        prevPlanetId.current = selectedPlanet.id;
      }
    };
    if (selectedPlanet) {
      loadData();
    }
  }, [selectedPlanet?.id, fetchBuildings]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (queue.length > 0 && queue[0].startedAt) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [queue]);

  useEffect(() => {
    if (queue.length > 0 && queue[0].startedAt) {
      const q = queue[0];
      const start = new Date(q.startedAt).getTime();
      const elapsedSec = Math.floor((now - start) / 1000);

      if (
        elapsedSec === q.durationSec ||
        (elapsedSec > q.durationSec && elapsedSec % 5 === 0)
      ) {
        fetchBuildings();
        refreshUser();
      }
    }
  }, [now, queue, fetchBuildings, refreshUser]);

  const handleUpgrade = async (type: string) => {
    if (!selectedPlanet) return;
    try {
      await api.post("/buildings/queue", {
        planetId: selectedPlanet.id,
        buildingType: type,
      });
      await fetchBuildings();
      await refreshUser();
    } catch (err) {
      console.error("Failed to queue building upgrade", err);
    }
  };

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

  const getQueueStatus = (type: string) => {
    const queued = queue.find((q) => q.buildingType === type);
    return queued ? queued.status : null;
  };

  return (
    <div className="space-y-8">
      {queue.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">
            Construction Queue ({queue.length}/3)
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queue.map((q, idx) => {
              const config = availableBuildings[q.buildingType];
              const buildingName = config ? config.name : q.buildingType;
              const isFirst = idx === 0;

              // Calculate progress for the active building
              let progress = 0;
              let timeRemaining = "";
              if (isFirst && q.startedAt) {
                const start = new Date(q.startedAt).getTime();
                const elapsedSec = Math.floor((now - start) / 1000);
                const totalSec = q.durationSec;
                progress = Math.min(
                  100,
                  Math.max(0, (elapsedSec / totalSec) * 100),
                );

                const remSec = Math.max(0, totalSec - elapsedSec);
                const m = Math.floor(remSec / 60);
                const s = remSec % 60;
                timeRemaining = `${m}m ${s}s`;
              }

              return (
                <Card
                  key={q.id || idx}
                  className={`bg-slate-800 border-slate-700 text-slate-200 ${
                    isFirst ? "md:col-span-2 lg:col-span-3" : ""
                  }`}
                >
                  <CardContent className="p-4 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-slate-100">
                          {buildingName}
                        </div>
                        <div className="text-sm text-slate-400">
                          Upgrade to Level {q.targetLevel}
                        </div>
                      </div>
                      <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700 text-amber-400">
                        {isFirst ? q.status : "WAITING"}
                      </div>
                    </div>

                    {isFirst && q.startedAt && (
                      <div className="mt-2 text-xs">
                        <div className="flex justify-between text-slate-400 mb-1 font-mono">
                          <span>{progress.toFixed(1)}%</span>
                          <span>{timeRemaining}</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-700 overflow-hidden">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-4">
          Available Buildings
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(availableBuildings).map(([type, config]) => {
            const status = getQueueStatus(type);

            const level = config.level;
            const targetLevel = config.targetLevel;
            const targetCosts: React.ReactNode[] = [];

            // Cost is already evaluated dynamically for the target level by the backend
            Object.entries(config.cost).forEach(([resource, costValue]) => {
              if (costValue > 0) {
                targetCosts.push(
                  <span key={resource} className="capitalize">
                    {costValue} {resource}
                  </span>,
                );
              }
            });

            const buildTime = config.buildTimeInSeconds;

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
                        <span className="text-slate-500 text-xs">
                          Production
                        </span>
                        <span className="text-emerald-400 font-medium">
                          +{config.production}/hr
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
                      onClick={() => handleUpgrade(type)}
                    >
                      {status ? `Upgrading (${status})` : "Upgrade"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
