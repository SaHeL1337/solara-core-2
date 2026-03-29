import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  Timer,
  Target,
  Pickaxe,
  Map as MapIcon,
  ArrowRight,
  RotateCcw,
  Package,
  Ship,
} from "lucide-react";
import { DashboardStats } from "./DashboardStats";

type FleetMovement = {
  id: string;
  missionType: "ATTACK" | "MINE" | "EXPLORE";
  status: "EN_ROUTE" | "RETURNING";
  startTime: string;
  arrivalTime: string;
  returnArrivalTime?: string;
  origin?: { id: string; name: string; x: number; y: number } | null;
  target?: { id: string; name: string; x: number; y: number } | null;
  ships: { type: string; count: number }[];
  resources: { type: string; amount: number }[];
};

export default function Dashboard() {
  const [movements, setMovements] = useState<FleetMovement[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    try {
      const { data } = await api.get("/fleet/movements");
      setMovements(data.data);
    } catch (err) {
      console.error("Failed to fetch movements", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();
    const interval = setInterval(fetchMovements, 5000);
    return () => clearInterval(interval);
  }, [fetchMovements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-[#00E5FF] animate-pulse font-bold tracking-widest uppercase">
          Initializing Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide uppercase">
            Strategic Overview
          </h1>
          <p className="text-[#94a3b8] text-xs mt-1 uppercase tracking-wider font-bold">
            Active Fleet Operations & Movement
          </p>
        </div>
      </div>

      <div className="grid gap-4 pt-2">
        {movements.length === 0 ? (
          <div className="bg-[#1a1d24] border border-dashed border-[#2a2e38] p-12 flex flex-col items-center justify-center opacity-50 text-center">
            <Timer className="w-8 h-8 text-[#64748b] mb-3" />
            <div className="text-[#94a3b8] text-xs font-bold tracking-widest uppercase">
              No active fleet movements detected
            </div>
          </div>
        ) : (
          movements.map((fleet) => (
            <FleetCard
              key={fleet.id}
              fleet={fleet}
              isExpanded={expandedId === fleet.id}
              toggleExpand={() =>
                setExpandedId(expandedId === fleet.id ? null : fleet.id)
              }
            />
          ))
        )}
      </div>

      <DashboardStats />
    </div>
  );
}

function FleetCard({
  fleet,
  isExpanded,
  toggleExpand,
}: {
  fleet: FleetMovement;
  isExpanded: boolean;
  toggleExpand: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      let targetTime = 0;
      if (fleet.status === "EN_ROUTE") {
        targetTime = new Date(fleet.arrivalTime).getTime();
      } else if (fleet.returnArrivalTime) {
        targetTime = new Date(fleet.returnArrivalTime).getTime();
      }

      if (targetTime === 0) {
        setTimeLeft(0);
        return;
      }

      const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(diff);
    };

    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, [fleet]);

  const missionIcon = {
    ATTACK: <Target className="w-4 h-4 text-red-400" />,
    MINE: <Pickaxe className="w-4 h-4 text-[#00E5FF]" />,
    EXPLORE: <MapIcon className="w-4 h-4 text-indigo-400" />,
  }[fleet.missionType];

  const totalShips = fleet.ships.reduce((a, b) => a + b.count, 0);

  return (
    <div
      className={`bg-[#1a1d24] border transition-all ${isExpanded ? "border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.1)]" : "border-[#2a2e38] hover:border-[#3b4252]"}`}
    >
      <div
        className="p-4 cursor-pointer flex items-center gap-4 select-none"
        onClick={toggleExpand}
      >
        <div
          className={`w-10 h-10 shrink-0 flex items-center justify-center bg-[#16181d] border border-[#2a2e38] ${fleet.status === "RETURNING" ? "text-amber-400 border-amber-500/30" : "text-[#00E5FF] border-[#00E5FF]/30"}`}
        >
          {fleet.status === "EN_ROUTE" ? (
            <ArrowRight className="w-5 h-5" />
          ) : (
            <RotateCcw className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
              Mission
            </div>
            <div className="flex items-center gap-2">
              {missionIcon}
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {fleet.missionType}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
              Route
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-[#e2e8f0]">
              <span className="truncate max-w-[120px]">
                {fleet.origin?.name || "Unknown"}
              </span>
              <ChevronRight className="w-3 h-3 text-[#64748b]" />
              <span className="truncate max-w-[120px]">
                {fleet.target?.name || "Destroyed"}
              </span>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
              Fleet Size
            </div>
            <div className="text-xs font-mono text-[#e2e8f0]">
              {formatNumber(totalShips)} Ships
            </div>
          </div>

          <div>
            <div className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
              Arrival
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#00E5FF]">
              <Timer className="w-3 h-3" />
              <span>
                {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-[#64748b]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[#64748b]" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#2a2e38] bg-[#16181d]/50 animate-in slide-in-from-top-1 duration-200">
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Ship className="w-3 h-3 text-[#00E5FF]" />
                <span className="text-[10px] font-bold text-[#00E5FF] tracking-widest uppercase">
                  Composition
                </span>
              </div>
              <div className="grid gap-2">
                {fleet.ships.map((s) => (
                  <div
                    key={s.type}
                    className="flex justify-between items-center bg-[#1a1d24] border border-[#2a2e38] p-2 px-3"
                  >
                    <span className="text-[10px] font-bold text-[#e2e8f0] uppercase tracking-wider">
                      {s.type}
                    </span>
                    <span className="text-xs font-mono text-[#00E5FF]">
                      {formatNumber(s.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
                  Cargo
                </span>
              </div>
              <div className="grid gap-2">
                {fleet.resources.length === 0 ? (
                  <div className="text-[10px] text-[#64748b] font-bold uppercase italic py-2">
                    Hold is empty
                  </div>
                ) : (
                  fleet.resources.map((r) => (
                    <div
                      key={r.type}
                      className="flex justify-between items-center bg-[#1a1d24] border border-[#2a2e38] p-2 px-3"
                    >
                      <span className="text-[10px] font-bold text-[#e2e8f0] uppercase tracking-wider">
                        {r.type}
                      </span>
                      <span className="text-xs font-mono text-amber-400">
                        {formatNumber(r.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2a2e38] flex justify-between items-center text-[9px] text-[#64748b] font-bold uppercase tracking-widest">
            <div className="flex gap-4">
              <span>
                Origin:{" "}
                <span className="text-[#94a3b8]">
                  {fleet.origin
                    ? `${fleet.origin.x},${fleet.origin.y}`
                    : "Unknown"}
                </span>
              </span>
              <span>
                Target:{" "}
                <span className="text-[#94a3b8]">
                  {fleet.target
                    ? `${fleet.target.x},${fleet.target.y}`
                    : "Destroyed"}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
