import { useEffect, useState, useCallback, useRef } from "react";
import { formatNumber } from "@/lib/utils";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";

type BuildingConfig = {
  name: string;
  description: string;
  level: number;
  targetLevel: number;
  cost: Record<string, number>;
  production: number;
  maxLevel: number;
  productionIncrease: number;
  buildTimeInSeconds: number;
};

type APIBuildingMapping = Record<string, BuildingConfig>;

const getFinishTimeString = (finishTimeMs: number) => {
  const finishDate = new Date(finishTimeMs);
  const now = new Date();
  const isSameDay =
    finishDate.getDate() === now.getDate() &&
    finishDate.getMonth() === now.getMonth() &&
    finishDate.getFullYear() === now.getFullYear();

  const timeStr = finishDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (!isSameDay) {
    const dateStr = finishDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return `${dateStr} ${timeStr}`;
  }
  return timeStr;
};

export default function Buildings() {
  const { selectedPlanet, refreshUser } = useGame();
  const [availableBuildings, setAvailableBuildings] =
    useState<APIBuildingMapping>({});
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [fetchTime, setFetchTime] = useState(Date.now());
  const prevPlanetId = useRef<string | null>(null);

  const fetchBuildings = useCallback(async () => {
    if (!selectedPlanet?.id) return;
    try {
      const { data } = await api.get(
        `/buildings/buildings?planetId=${selectedPlanet.id}`,
      );
      setAvailableBuildings(data.data.available);
      setQueue(data.data.queue);
      setFetchTime(Date.now());
      console.log(data.data);
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
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-12">
      {queue.length > 0 && (
        <div>
          <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-4">
            Construction Queue ({queue.length}/3)
          </h2>
          <div className="flex flex-col gap-4 mb-4">
            {/* Active Upgrade Block */}
            {queue.map((q, idx) => {
              const config = availableBuildings[q.buildingType];
              const buildingName = config ? config.name : q.buildingType;
              const isFirst = idx === 0;
              const imgPath = `/buildings/${q.buildingType.toLowerCase()}.png`;

              const totalDurationSoFar = queue
                .slice(0, idx + 1)
                .reduce((acc, curr) => acc + curr.durationSec, 0);

              const startBase =
                queue.length > 0 && queue[0].startedAt
                  ? new Date(queue[0].startedAt).getTime()
                  : now;

              const finishTimeMs = startBase + totalDurationSoFar * 1000;
              const finishTimeString = getFinishTimeString(finishTimeMs);
              let progress = 0;
              let timeRemaining = "";
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

              if (isFirst) {
                return (
                  <div
                    key={q.id || idx}
                    className="flex-1 bg-[#16181d] border-l-2 border-[#00E5FF] p-4 shadow-lg flex items-center gap-6"
                  >
                    <img
                      src={imgPath}
                      alt={buildingName}
                      className="w-16 h-16 object-cover border border-[#2a2e38]"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-lg font-bold text-white mb-1">
                            {buildingName}
                          </div>
                        </div>
                        <div className="px-2 py-1 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] uppercase tracking-widest font-bold">
                          LEVEL {q.targetLevel}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-[#00E5FF] font-mono">
                            {progress.toFixed(1)}%
                          </span>
                          <span className="text-[#e2e8f0] font-mono">
                            {timeRemaining}{" "}
                            {finishTimeString && (
                              <span className="text-[#64748b]">
                                ({finishTimeString})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#1e2028] overflow-hidden">
                          <div
                            className="h-full bg-[#00E5FF] transition-all duration-1000 ease-linear shadow-[0_0_10px_#00E5FF]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Waiting Queue Blocks
              return (
                <div
                  key={q.id || idx}
                  className="flex-1 bg-[#1a1d24] border border-[#2a2e38] p-4 flex items-center gap-6 opacity-70"
                >
                  <img
                    src={imgPath}
                    alt={buildingName}
                    className="w-16 h-16 object-cover border border-[#2a2e38]"
                  />
                  <div className="flex-1 flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-white mb-1">
                        {buildingName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="px-2 py-1 bg-[#2a2e38] text-[#94a3b8] text-[10px] uppercase tracking-widest font-bold">
                        LEVEL {q.targetLevel}
                      </div>
                      <div className="text-[#64748b] text-[10px] font-mono">
                        {timeRemaining} | {finishTimeString}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(availableBuildings).map(([type, config]) => {
            const status = getQueueStatus(type);
            const level = config.level;
            const buildTime = config.buildTimeInSeconds;

            // Determine if affordable and time until affordable
            const elapsedSec = (now - fetchTime) / 1000;
            let timeUntilAffordable = 0;
            const missingResources: Record<string, boolean> = {};

            Object.entries(config.cost).map(([resource, costValue]) => {
              if (costValue > 0) {
                const currentAmount = (selectedPlanet as any)[
                  resource
                ] as number;
                const productionPerHour = (selectedPlanet as any).production[
                  resource
                ] as number;
                const accrued = (productionPerHour / 3600) * elapsedSec;
                const projectedAmount = currentAmount + accrued;

                if (costValue > projectedAmount) {
                  missingResources[resource] = true;
                  if (productionPerHour > 0) {
                    const timeNeeded =
                      (costValue - projectedAmount) /
                      (productionPerHour / 3600);
                    if (timeNeeded > timeUntilAffordable) {
                      timeUntilAffordable = timeNeeded;
                    }
                  } else {
                    timeUntilAffordable = Infinity; // Will never afford
                  }
                }
              }
            });

            const isAffordable = Object.keys(missingResources).length === 0;

            return (
              <div
                key={type}
                className="bg-[#1a1d24] border border-[#2a2e38] p-6 flex flex-col transition-colors hover:border-[#3b4252]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-24 h-24 bg-[#00E5FF]/5 border border-[#00E5FF]/20 overflow-hidden shrink-0">
                    <img
                      src={`/buildings/${type.toLowerCase()}.png`}
                      alt={config.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#00E5FF] px-2 py-1">
                      <h3 className="text-lg font-bold text-white">
                        {config.name}
                      </h3>
                    </div>
                    <div className="text-[12px] text-right font-bold text-[#00E5FF] px-2 py-1">
                      Level {level}/{config.maxLevel}
                    </div>
                  </div>
                </div>

                {/* Costs & Time Panel */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {Object.entries(config.cost).map(([resource, costValue]) => {
                    if (resource === "housing") return;
                    if (costValue > 0) {
                      let Icon = null;
                      if (resource === "titanium") Icon = TitaniumIcon;
                      if (resource === "silicate") Icon = SilicateIcon;
                      if (resource === "isotope") Icon = IsotopeIcon;

                      return (
                        <div
                          key={resource}
                          title={`${resource.charAt(0).toUpperCase() + resource.slice(1)}`}
                          className="flex-1 bg-[#16181d] p-3 text-center min-w-[70px]"
                        >
                          <div className="text-[10px] text-[#64748b] uppercase font-bold tracking-widest mb-1 flex items-center justify-center gap-1">
                            {Icon && <Icon className="size-3" />}
                            {resource}
                          </div>
                          <div
                            className={`text-xs font-mono font-bold ${missingResources[resource] ? "text-red-400" : "text-[#e2e8f0]"}`}
                          >
                            {formatNumber(costValue)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  <div className="flex-1 bg-[#16181d] p-3 text-center min-w-[70px]">
                    <div className="text-[10px] text-[#64748b] uppercase font-bold tracking-widest mb-1">
                      Time
                    </div>
                    <div className="text-xs font-mono font-bold text-[#e2e8f0]">
                      {formatTime(buildTime)}
                    </div>
                  </div>
                  <div className="flex-1 bg-[#16181d] p-3 text-center min-w-[70px]">
                    <div className="text-[10px] text-[#64748b] uppercase font-bold tracking-widest mb-1">
                      Housing
                    </div>
                    <div className="text-xs font-mono font-bold text-[#e2e8f0]">
                      {config.cost.housing}
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <button
                    disabled={!isAffordable}
                    style={{ borderRadius: 0 }}
                    className={`w-full py-3 text-[8px] tracking-widest transition-all ${
                      status !== null
                        ? "bg-[#16181d] text-[#00E5FF] borderborder-[#00E5FF] cursor-not-allowed"
                        : isAffordable
                          ? "bg-[rgba(0,229,255,0.1)] text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                          : "bg-[#16181d] text-[#64748b] border border-[#00E5FF] cursor-not-allowed opacity-80"
                    }`}
                    onClick={() => handleUpgrade(type)}
                  >
                    {isAffordable
                      ? "Upgrade"
                      : timeUntilAffordable === Infinity
                        ? "INSUFFICIENT RESOURCES"
                        : `${formatTime(timeUntilAffordable)}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
