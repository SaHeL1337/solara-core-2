import { useState } from "react";
import { formatNumber } from "@/lib/utils";
import { Planet } from "@/context/GameContext";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";
import { Swords, Shield, Lock } from "lucide-react";

type ShipConfig = {
  name: string;
  description: string;
  cost: Record<string, number>;
  requirements: Record<string, number>;
  buildTimeInSeconds: number;
  offense: number;
  offenseType: "FIGHTER" | "BATTLESHIP";
  defVsFighter: number;
  defVsBattleship: number;
  allowedClasses: string[] | null;
  meetsRequirements: boolean;
  missingTech?: string[];
};

type ShipListProps = {
  selectedPlanet: Planet;
  availableShips: Record<string, ShipConfig>;
  currentShips?: any[];
  onQueueShips: (type: string, quantity: number) => void;
  isQueueing: boolean;
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

export default function ShipList({
  selectedPlanet,
  availableShips,
  currentShips = [],
  onQueueShips,
  isQueueing,
}: ShipListProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleQuantityChange = (type: string, val: string) => {
    const num = parseInt(val, 10);
    setQuantities((prev) => ({
      ...prev,
      [type]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const getShipCount = (type: string) => {
    const ship = currentShips.find((s) => s.type === type);
    return ship ? ship.count : 0;
  };

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(availableShips).map(([type, config]) => {
          const qty = quantities[type] || 1;
          const populationCost = config.cost.population || 0;
          const maxQty = Math.min(
            Math.floor(selectedPlanet.titanium / config.cost.titanium),
            Math.floor(selectedPlanet.silicate / config.cost.silicate),
            Math.floor(selectedPlanet.isotope / config.cost.isotope),
            ...(populationCost > 0
              ? [Math.floor(selectedPlanet.population / populationCost)]
              : []),
          );

          const buildTime = config.buildTimeInSeconds;
          const meetsReqs = config.meetsRequirements;
          const currentCount = getShipCount(type);
          const isAffordable = meetsReqs && maxQty >= qty;

          const isClassLocked = config.allowedClasses && !meetsReqs && !config.missingTech?.length && Object.entries(config.requirements).every(([reqType, reqLvl]) => {
            if (reqType === "SHIPYARD") return true; // assuming shipyard level checked separately
            return true;
          });

          return (
            <div
              key={type}
              className={`bg-[#1a1d24] border border-[#2a2e38] p-5 flex flex-col transition-colors hover:border-[#3b4252] ${
                !meetsReqs ? "opacity-75" : ""
              }`}
            >
              {/* Header: Title + Image + Owned count */}
              <div className="flex justify-between items-start mb-3 gap-3">
                <div className="w-20 h-20 bg-[#00E5FF]/5 border border-[#00E5FF]/20 overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={`/ships/${type.toLowerCase()}.png`}
                    alt={config.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback icon if image doesn't exist
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <Swords className="w-8 h-8 text-[#00E5FF]/40 absolute pointer-events-none" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <h3 className="text-base font-bold text-white truncate">
                    {config.name}
                  </h3>
                  {config.allowedClasses && (
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 text-[10px] uppercase font-bold tracking-wider mt-1">
                      <Lock className="w-2.5 h-2.5" />
                      {config.allowedClasses.join(", ")}
                    </div>
                  )}
                  <div className="text-xl font-bold text-[#00E5FF] font-mono mt-1">
                    {formatNumber(currentCount)}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#94a3b8] mb-3 leading-relaxed line-clamp-2">
                {config.description}
              </p>

              {/* Combat Specs Badge */}
              <div className="bg-[#16181d] border border-[#1e2028] p-2 mb-3 text-xs font-mono">
                <div className="flex justify-between items-center text-[#e2e8f0]">
                  <span className="text-[#64748b] font-bold uppercase tracking-wider text-[10px]">Offense</span>
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <Swords className="w-3 h-3" />
                    {config.offense} ({config.offenseType})
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#e2e8f0] mt-1">
                  <span className="text-[#64748b] font-bold uppercase tracking-wider text-[10px]">Def vs Fighter / B.Ship</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {config.defVsFighter} / {config.defVsBattleship}
                  </span>
                </div>
              </div>

              {!meetsReqs && (
                <div className="text-[10px] text-orange-400 mb-3 bg-orange-950/30 p-2 font-mono uppercase tracking-widest border border-orange-900">
                  <span className="block mb-1 font-bold">Requirements:</span>
                  {[
                    ...Object.entries(config.requirements).map(([reqType, reqLvl]) => `${reqType} LV ${reqLvl}`),
                    ...(config.missingTech || []).map(t => `TECH: ${t.replace(/_/g, " ")}`),
                    ...(config.allowedClasses ? [`CLASS: ${config.allowedClasses.join(", ")}`] : [])
                  ].join(", ")}
                </div>
              )}

              {/* Costs & Time Panel */}
              <div className="flex flex-wrap gap-1 mb-1 mt-auto">
                {Object.entries(config.cost).map(([resource, costValue]) => {
                  if (resource === "population") return null;
                  if (costValue > 0) {
                    let Icon = null;
                    if (resource === "titanium") Icon = TitaniumIcon;
                    if (resource === "silicate") Icon = SilicateIcon;
                    if (resource === "isotope") Icon = IsotopeIcon;

                    const totalCost = costValue * qty;
                    const canAffordResource = (selectedPlanet as any)[resource] >= totalCost;

                    return (
                      <div
                        key={resource}
                        title={`${resource.charAt(0).toUpperCase() + resource.slice(1)}`}
                        className="flex-1 bg-[#16181d] p-2 text-center min-w-[60px]"
                      >
                        <div className="text-[10px] text-[#64748b] uppercase font-bold tracking-widest mb-1 flex items-center justify-center gap-1">
                          {Icon && <Icon className="size-3" />}
                        </div>
                        <div
                          className={`text-xs font-mono font-bold ${
                            !canAffordResource ? "text-red-400" : "text-[#e2e8f0]"
                          }`}
                        >
                          {formatNumber(totalCost)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                <div className="flex-1 bg-[#16181d] p-2 text-center min-w-[60px]">
                  <div className="text-[10px] text-[#64748b] uppercase font-bold tracking-widest mb-1">
                    Time
                  </div>
                  <div className="text-xs font-mono font-bold text-[#e2e8f0]">
                    {formatTime(buildTime * qty)}
                  </div>
                </div>
                {(config.cost.population || 0) > 0 && (
                  <div className="flex-1 bg-[#16181d] p-2 text-center min-w-[60px]">
                    <div className="text-[10px] text-[#64748b] uppercase font-bold tracking-widest mb-1">
                      Pop
                    </div>
                    <div
                      className={`text-xs font-mono font-bold ${selectedPlanet.population < (config.cost.population || 0) * qty ? "text-red-400" : "text-[#e2e8f0]"}`}
                    >
                      {formatNumber((config.cost.population || 0) * qty)}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-auto">
                <input
                  type="number"
                  min="1"
                  className="bg-[#16181d] border border-[#2a2e38] px-3 py-1.5 text-center text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00E5FF] transition-colors col-span-2 text-sm"
                  value={quantities[type] || ""}
                  placeholder="1"
                  onChange={(e) => handleQuantityChange(type, e.target.value)}
                  disabled={!meetsReqs || isQueueing}
                />

                <button
                  disabled={!meetsReqs || isQueueing}
                  className="bg-[#1a1d24] text-[#94a3b8] border border-[#2a2e38] hover:border-[#00E5FF] hover:text-[#00E5FF] transition-colors py-2 text-xs uppercase font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleQuantityChange(type, maxQty.toString())}
                >
                  Max ({formatNumber(maxQty)})
                </button>

                <button
                  disabled={!isAffordable || isQueueing || qty < 1}
                  className={`py-2 text-xs font-bold tracking-widest uppercase transition-all ${
                    isAffordable && qty >= 1
                      ? "bg-[rgba(0,229,255,0.1)] text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                      : "bg-[#16181d] text-[#64748b] border border-[#00E5FF]/50 cursor-not-allowed opacity-80"
                  }`}
                  onClick={() => onQueueShips(type, qty)}
                >
                  Build
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
