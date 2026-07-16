import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ShieldAlert,
  ArrowLeft,
  Crown,
  Users,
  Compass,
  Target,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";
import { useGame } from "@/context/GameContext";

interface ShipQty {
  type: string;
  count: number;
  population: number;
}

interface FleetBreakdown {
  fleetId: string;
  userId: string;
  displayName: string;
  username: string;
  ships: ShipQty[];
  totalPopulation: number;
}

interface DefenseInfo {
  hasBuilding: boolean;
  level: number;
  cooldownRemainingSeconds: number;
  damagePerShot: number;
  defenseCooldownSeconds: number;
}

interface ConquestDetails {
  id: string;
  spaceObjectId: string;
  name: string;
  type: string;
  x: number;
  y: number;
  initiatorId: string;
  conquestPoints: number;
  conquestPointsRequired: number;
  progress: number;
  startedAt: string;
  totalHoldingPopulation: number;
  estimatedMinutesRemaining: number;
  fleets: FleetBreakdown[];
  defense?: DefenseInfo;
  isClosed: boolean;
  threatLevel?: number;
}

export default function ConquestOverview() {
  const { spaceObjectId } = useParams<{ spaceObjectId: string }>();
  const navigate = useNavigate();
  useGame();
  
  const [data, setData] = useState<ConquestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiring, setIsFiring] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastDefenseResult, setLastDefenseResult] = useState<any>(null);

  const accumulatedFleets = useMemo(() => {
    if (!data?.fleets) return [];
    
    const grouped: Record<string, {
      userId: string;
      username: string;
      displayName: string;
      totalPopulation: number;
      ships: Record<string, { type: string; count: number; population: number }>;
    }> = {};

    for (const fleet of data.fleets) {
      if (!grouped[fleet.userId]) {
        grouped[fleet.userId] = {
          userId: fleet.userId,
          username: fleet.username,
          displayName: fleet.displayName,
          totalPopulation: 0,
          ships: {},
        };
      }
      
      const group = grouped[fleet.userId];
      group.totalPopulation += fleet.totalPopulation;
      
      for (const ship of fleet.ships) {
        if (!group.ships[ship.type]) {
          group.ships[ship.type] = {
            type: ship.type,
            count: 0,
            population: ship.population,
          };
        }
        group.ships[ship.type].count += ship.count;
      }
    }

    return Object.values(grouped).map((g) => ({
      userId: g.userId,
      username: g.username,
      displayName: g.displayName,
      totalPopulation: g.totalPopulation,
      ships: Object.values(g.ships),
    }));
  }, [data?.fleets]);

  const fetchStatus = async () => {
    try {
      const res = await api.get(`/conquest/status/${spaceObjectId}`);
      setData(res.data.data);
      if (res.data.data?.defense?.cooldownRemainingSeconds) {
        setCooldown(res.data.data.defense.cooldownRemainingSeconds);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load siege details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [spaceObjectId]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleFireDefense = async () => {
    if (isFiring || cooldown > 0) return;
    setIsFiring(true);
    try {
      const res = await api.post(`/conquest/${spaceObjectId}/defend`);
      setLastDefenseResult(res.data.data);
      toast.success(res.data.data.message || "Orbital defense fired!");
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to fire orbital defense");
    } finally {
      setIsFiring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-[calc(100vh-120px)]">
        <div className="text-amber-400 animate-pulse font-bold tracking-widest uppercase flex flex-col items-center gap-3">
          <ShieldAlert className="w-8 h-8 animate-spin" />
          Mapping Orbital Hostilities...
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Format estimated time
  const formatETA = (minutes: number) => {
    if (minutes === -1) return "Decaying (Siege Population too low)";
    if (minutes === 0) return "Imminent";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.ceil(minutes % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} mins`;
  };

  const isDefender = data.defense !== undefined;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1d24]/60 border border-[#2a2e38] p-4 lg:p-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-linear-to-r from-amber-500/20 via-amber-500 to-amber-500/20"></div>
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-[#16181d] border border-[#2a2e38] text-[#94a3b8] hover:text-white hover:border-[#3b4252] transition-all rounded"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-mono text-white tracking-widest font-bold">
                SIEGE CONTROL: {data.name}
              </h1>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#64748b] font-mono">
              <Link
                to={`/map?x=${data.x}&y=${data.y}`}
                className="flex items-center gap-1 text-[#00E5FF] hover:underline"
              >
                <Compass className="w-3.5 h-3.5" />
                Loc: [{data.x}, {data.y}]
              </Link>
              <span className="capitalize">
                Type: {data.type}
              </span>
              {data.threatLevel && (
                <span className="text-purple-400">
                  Threat Level: {data.threatLevel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conquest Progress Card (Full Width) */}
      <div className="bg-[#1a1d24]/60 border border-[#2a2e38] p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-amber-500/20 via-amber-500 to-amber-500/20"></div>
        
        <div className="flex items-center gap-2 mb-4 border-b border-[#2a2e38]/60 pb-3">
          <Crown className="w-5 h-5 text-amber-400" />
          <h2 className="text-[11px] font-bold text-white tracking-widest uppercase">
            Conquest Control
          </h2>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          
          {/* circular progress container */}
          <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
            {/* background circle */}
            <svg className="absolute w-full h-full -rotate-90">
              <circle cx="80" cy="80" r="68" stroke="#16181d" strokeWidth="8" fill="none" />
              <circle
                cx="80"
                cy="80"
                r="68"
                stroke="#f59e0b"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 68}
                strokeDashoffset={2 * Math.PI * 68 * (1 - data.progress / 100)}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            {/* Center progress display */}
            <div className="text-center z-10">
              <div className="text-3xl font-mono text-white tracking-wider font-extrabold">{data.progress}%</div>
              <div className="text-[8px] text-[#64748b] tracking-wider uppercase font-bold mt-0.5">Conquered</div>
            </div>
          </div>

          {/* Stats details side by side */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
            <div className="bg-[#16181d] border border-[#2a2e38]/60 p-4 rounded flex flex-col justify-center">
              <div className="text-[9px] text-[#64748b] font-bold tracking-widest uppercase mb-1">
                Conquest Points
              </div>
              <div className="text-sm font-bold text-white">
                {formatNumber(Math.round(data.conquestPoints))} / {formatNumber(data.conquestPointsRequired)}
              </div>
            </div>
            
            <div className="bg-[#16181d] border border-[#2a2e38]/60 p-4 rounded flex flex-col justify-center">
              <div className="text-[9px] text-[#64748b] font-bold tracking-widest uppercase mb-1">
                Conquest Complete In
              </div>
              <div className="text-sm font-bold text-amber-400">
                {formatETA(data.estimatedMinutesRemaining)}
              </div>
            </div>

            <div className="bg-[#16181d] border border-[#2a2e38]/60 p-4 rounded flex flex-col justify-center">
              <div className="text-[9px] text-[#64748b] font-bold tracking-widest uppercase mb-1">
                Orbital Siege Population
              </div>
              <div className="text-sm font-bold text-white flex flex-col">
                <span>{data.totalHoldingPopulation} Pop</span>
                <span className="text-[10px] text-[#64748b] font-normal lowercase mt-0.5">
                  ({(data.totalHoldingPopulation / 10).toFixed(1)} pts/min | 10 pop per pt)
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Defense Controls (size: 5) */}
        {isDefender && (
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#1a1d24] border border-[#2a2e38] p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                <h2 className="text-[11px] font-bold text-white tracking-widest uppercase">
                  Orbital Defense Grid
                </h2>
              </div>

              {!data.defense?.hasBuilding ? (
                <div className="bg-[#16181d] border border-red-500/20 p-4 text-center">
                  <p className="text-xs text-[#94a3b8] mb-3">
                    Your planet is under siege, but you do not have a Planetary Defense grid active. Build a Planetary Defense system immediately to repel the hostile fleets.
                  </p>
                  <button
                    onClick={() => navigate("/buildings")}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/30 transition-all rounded-sm"
                  >
                    Go to Buildings Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#16181d] border border-[#2a2e38] p-4 font-mono text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Defense System:</span>
                      <span className="text-white font-bold">Lvl {data.defense.level} Planetary Defense</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Target Damage:</span>
                      <span className="text-red-400 font-bold">{data.defense.damagePerShot} Siege Population</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Firing Cooldown:</span>
                      <span className="text-[#00E5FF] font-bold">{data.defense.defenseCooldownSeconds} seconds</span>
                    </div>
                  </div>

                  <button
                    onClick={handleFireDefense}
                    disabled={isFiring || cooldown > 0}
                    className={`w-full py-3 text-center text-xs font-mono font-bold tracking-widest uppercase transition-all select-none border rounded ${
                      cooldown > 0
                        ? "bg-zinc-800/40 border-zinc-700/50 text-[#64748b] cursor-not-allowed"
                        : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                    }`}
                  >
                    {isFiring
                      ? "FIRING CANNONS..."
                      : cooldown > 0
                        ? `COOLING DOWN: ${cooldown}s`
                        : "FIRE ORBITAL DEFENSES"}
                  </button>

                  {/* Firing results */}
                  {lastDefenseResult && (
                    <div className="bg-[#16181d] border border-emerald-500/20 p-4 font-mono text-xs space-y-2 rounded-sm">
                      <h4 className="font-bold text-emerald-400 border-b border-[#2a2e38] pb-1.5 uppercase tracking-wider text-[10px]">
                        Last Strike Report
                      </h4>
                      <p className="text-[#94a3b8]">
                        Orbital strike dealt {lastDefenseResult.damageDealt} population worth of damage.
                      </p>
                      {lastDefenseResult.shipsDestroyed && lastDefenseResult.shipsDestroyed.length > 0 ? (
                        <div className="space-y-1 pt-1.5">
                          <span className="text-[10px] uppercase font-bold text-[#64748b]">Ships Destroyed:</span>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {lastDefenseResult.shipsDestroyed.map((s: any) => (
                              <div key={s.type} className="bg-[#111317] px-2 py-1 border border-[#2a2e38] flex justify-between">
                                <span className="text-white">{s.type}</span>
                                <span className="text-red-400 font-bold">-{s.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-amber-400 italic">No ships were destroyed in this barrage.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Fleet Breakdown */}
        <div className={`${isDefender ? "lg:col-span-7" : "lg:col-span-12"} bg-[#1a1d24] border border-[#2a2e38] p-6 shadow-xl relative overflow-hidden flex flex-col`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00E5FF]" />
              <h2 className="text-[11px] font-bold text-white tracking-widest uppercase">
                Holding Fleets in Orbit
              </h2>
            </div>
            <div className="text-xs font-mono text-[#64748b]">
              Total Population: <span className="text-amber-400 font-bold">{data.totalHoldingPopulation}</span>
            </div>
          </div>

          {accumulatedFleets.length === 0 ? (
            <div className="flex-1 bg-[#16181d] border border-dashed border-[#2a2e38] p-12 flex flex-col items-center justify-center opacity-50 text-center">
              <Target className="w-8 h-8 text-[#64748b] mb-3 animate-pulse" />
              <div className="text-[#94a3b8] text-xs font-bold tracking-widest uppercase">
                No fleets currently in holding orbit
              </div>
              <p className="text-[10px] text-[#3b4252] mt-1.5 max-w-sm">
                Conquest points can only be accumulated when fleets are in holding orbit at this coordinates.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
              {accumulatedFleets.map((fleet) => (
                <div key={fleet.userId} className="bg-[#16181d] border border-[#2a2e38] p-4 space-y-3 relative hover:border-[#3b4252] transition-colors rounded-sm">
                  {/* Fleet details */}
                  <div className="flex justify-between items-start border-b border-[#2a2e38] pb-2">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider">
                        {fleet.displayName}
                      </div>
                      <div className="text-[9px] text-[#64748b] font-mono mt-0.5">
                        Player: {fleet.username}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#64748b] font-bold uppercase tracking-wider block">Siege Contribution</span>
                      <span className="text-xs font-mono font-bold text-[#00E5FF]">{fleet.totalPopulation} Pop</span>
                    </div>
                  </div>

                  {/* Fleet composition */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {fleet.ships.map((ship) => (
                      <div key={ship.type} className="bg-[#111317] border border-[#2a2e38]/70 px-3 py-2 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white tracking-wide truncate max-w-[80px]">{ship.type}</span>
                          <span className="text-[8px] text-[#64748b] font-mono mt-0.5">{ship.population} pop/ship</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-white">x{ship.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick instructions / Info block */}
          <div className="mt-6 p-4 bg-[#16181d] border border-[#2a2e38] flex gap-3 text-xs text-[#94a3b8] leading-relaxed rounded-sm">
            <Info className="w-5 h-5 text-[#00E5FF] shrink-0" />
            <div>
              <span className="font-bold text-white block mb-0.5 uppercase tracking-wide text-[10px]">Siege Intel Protocol</span>
              <p>
                To maintain and increase conquest progress, fleets must remain in target orbit. If total population in orbit falls below <span className="text-amber-400 font-bold">10</span>, the siege will stall and decay at a rate of <span className="text-amber-400 font-bold">5%</span> of required points per 5-minute tick.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
