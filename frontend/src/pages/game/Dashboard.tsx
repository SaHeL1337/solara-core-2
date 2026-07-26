import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useGame } from "@/context/GameContext";
import { formatNumber, formatTime } from "@/lib/utils";
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
  Crown,
  Shield,
  Trophy,
  Globe,
  Star,
  Info,
  Building2,
  BookOpen,
  Rocket,
  Thermometer,
  Zap,
  CloudRain,
  Sun,
  Snowflake,
  CloudFog,
  Cloud,
  Layers,
  TrendingUp,
  ArrowLeftRight,
  Users,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import { MiningOverviewPanel, MiningChartPanel, useMiningStats } from "./DashboardStats";

// ─── Types ────────────────────────────────────────────────────

type FleetMovement = {
  id: string;
  missionType: "ATTACK" | "MINE" | "EXPLORE" | "CONQUER" | "HOLD";
  status: "EN_ROUTE" | "RETURNING" | "HOLDING";
  startTime: string;
  arrivalTime: string;
  returnArrivalTime?: string;
  origin?: { id: string; name: string; x: number; y: number } | null;
  target?: { id: string; name: string; x: number; y: number } | null;
  ships: { type: string; count: number }[];
  resources: { type: string; amount: number }[];
};

type ActiveConquest = {
  id: string;
  spaceObjectId: string;
  name: string;
  type: string;
  x: number;
  y: number;
  progress: number;
  totalHoldingPopulation?: number;
  estimatedMinutesRemaining?: number;
  initiatorId?: string;
};

type MissionFilter = "ALL" | "ATTACK" | "MINE" | "EXPLORE" | "CONQUER" | "HOLD";
type DirectionFilter = "ALL" | "OUTBOUND" | "INBOUND";

const MISSION_FILTERS: { value: MissionFilter; label: string; icon: any }[] = [
  { value: "ALL", label: "All", icon: Layers },
  { value: "ATTACK", label: "Attack", icon: Target },
  { value: "MINE", label: "Mine", icon: Pickaxe },
  { value: "EXPLORE", label: "Explore", icon: MapIcon },
  { value: "CONQUER", label: "Conquer", icon: Crown },
  { value: "HOLD", label: "Hold", icon: Shield },
];

const DIRECTION_TYPES: { value: DirectionFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OUTBOUND", label: "Outbound" },
  { value: "INBOUND", label: "Inbound" },
];

const FLEET_COLLAPSED_COUNT = 4;

// ─── Dummy Weather Data (TODO: Replace with API calls) ───────

const DUMMY_WEATHER_PHASES = [
  {
    id: "current",
    name: "Solar Flare",
    icon: "solar_flare",
    duration: "2h 14m",
    isCurrent: true,
    effects: [
      { label: "Mining Speed", value: "+15%", positive: true },
      { label: "Shield Regen", value: "-10%", positive: false },
      { label: "Energy Output", value: "+20%", positive: true },
    ],
  },
  {
    id: "next1",
    name: "Clear Skies",
    icon: "clear",
    duration: "4h 00m",
    isCurrent: false,
    effects: [
      { label: "All Production", value: "+5%", positive: true },
      { label: "Fleet Launch", value: "Normal", positive: true },
    ],
  },
  {
    id: "next2",
    name: "Ion Storm",
    icon: "ion_storm",
    duration: "1h 30m",
    isCurrent: false,
    effects: [
      { label: "Fleet Launch", value: "Disabled", positive: false },
      { label: "Building Speed", value: "-20%", positive: false },
      { label: "Isotope Mining", value: "+30%", positive: true },
    ],
  },
  {
    id: "next3",
    name: "Cryo Freeze",
    icon: "cryo",
    duration: "3h 00m",
    isCurrent: false,
    effects: [
      { label: "Production", value: "-15%", positive: false },
      { label: "Building Speed", value: "+10%", positive: true },
      { label: "Population Growth", value: "-25%", positive: false },
    ],
  },
];

// ─── Weather Icon Helper ──────────────────────────────────────

function WeatherIcon({ type, className }: { type: string; className?: string }) {
  const props = { className: className || "w-5 h-5" };
  switch (type) {
    case "solar_flare": return <Zap {...props} />;
    case "clear": return <Sun {...props} />;
    case "ion_storm": return <CloudRain {...props} />;
    case "cryo": return <Snowflake {...props} />;
    case "nebula": return <CloudFog {...props} />;
    default: return <Cloud {...props} />;
  }
}

// ─── Tooltip Component ────────────────────────────────────────

function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-all duration-200 scale-95 group-hover/tip:scale-100">
        <div className="bg-[#0f1015] border border-[#2a2e38] px-3 py-2 shadow-xl text-xs text-[#c8d0df] whitespace-nowrap max-w-[280px] w-max">
          {content}
        </div>
        <div className="w-2 h-2 bg-[#0f1015] border-r border-b border-[#2a2e38] rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────

function SectionLabel({ icon: Icon, label, info, right }: { icon: any; label: string; info?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-[#00E5FF]" />
      <span className="text-xs font-bold text-[#64748b] tracking-widest uppercase">
        {label}
      </span>
      {info && (
        <Tooltip content={<span>{info}</span>}>
          <Info className="w-3.5 h-3.5 text-[#475569] hover:text-[#94a3b8] transition-colors cursor-help" />
        </Tooltip>
      )}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

export default function Dashboard() {
  const { user, selectedPlanet } = useGame();
  const [movements, setMovements] = useState<FleetMovement[]>([]);
  const [activeConquests, setActiveConquests] = useState<ActiveConquest[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Trading state
  const [tradingData, setTradingData] = useState<{
    multiplier: number;
    predictedMultipliers?: { hour: number; multiplier: number }[];
  } | null>(null);

  // Fleet filter/expand state
  const [missionFilter, setMissionFilter] = useState<MissionFilter>("ALL");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("ALL");
  const [fleetExpanded, setFleetExpanded] = useState(false);

  // Activity feed state
  const [buildingQueue, setBuildingQueue] = useState<any[]>([]);
  const [techQueue, setTechQueue] = useState<any[]>([]);
  const [shipQueue, setShipQueue] = useState<any[]>([]);
  const [buildingConfigs, setBuildingConfigs] = useState<Record<string, any>>({});
  const [techNodes, setTechNodes] = useState<Record<string, any>>({});
  const [shipConfigs, setShipConfigs] = useState<Record<string, any>>({});
  const [now, setNow] = useState(Date.now());

  // Mining stats
  const { stats: miningStats, loading: miningLoading } = useMiningStats();

  const fetchDashboardData = useCallback(async () => {
    try {
      const [movementsRes, conquestsRes] = await Promise.all([
        api.get("/fleet/movements"),
        api.get("/conquest/active"),
      ]);
      setMovements(movementsRes.data.data || []);
      setActiveConquests(conquestsRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTradingData = useCallback(async () => {
    if (!selectedPlanet?.id) return;
    try {
      const { data } = await api.get(`/trading?planetId=${selectedPlanet.id}`);
      setTradingData({
        multiplier: data.multiplier || 1.0,
        predictedMultipliers: data.predictedMultipliers || [],
      });
    } catch (err) {
      console.error("Failed to fetch trading data", err);
      // Fallback 6-hour forecast data
      setTradingData({
        multiplier: 1.25,
        predictedMultipliers: [
          { hour: 1, multiplier: 1.28 },
          { hour: 2, multiplier: 1.35 },
          { hour: 3, multiplier: 1.20 },
          { hour: 4, multiplier: 1.15 },
          { hour: 5, multiplier: 1.40 },
          { hour: 6, multiplier: 1.30 },
        ],
      });
    }
  }, [selectedPlanet?.id]);

  const fetchActivityData = useCallback(async () => {
    if (!selectedPlanet?.id) return;
    try {
      const [buildingsRes, techRes, shipsRes] = await Promise.all([
        api.get(`/buildings/buildings?planetId=${selectedPlanet.id}`),
        api.get("/techtree"),
        api.get(`/ships/ships?planetId=${selectedPlanet.id}`),
      ]);
      setBuildingQueue(buildingsRes.data.data.queue || []);
      setBuildingConfigs(buildingsRes.data.data.available || {});
      setTechQueue(techRes.data.queue || []);
      setTechNodes(techRes.data.nodes || {});
      setShipQueue(shipsRes.data.data.queue || []);
      setShipConfigs(shipsRes.data.data.available || {});
    } catch (err) {
      console.error("Failed to fetch activity data", err);
    }
  }, [selectedPlanet?.id]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchActivityData();
    fetchTradingData();
    const interval = setInterval(() => {
      fetchActivityData();
      fetchTradingData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchActivityData, fetchTradingData]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Combined Operations (Movements + Ongoing Conquests)
  const combinedOperations = useMemo(() => {
    const items: Array<
      { kind: "movement"; data: FleetMovement } | { kind: "conquest"; data: ActiveConquest }
    > = [];

    // Filter movements
    movements.forEach((m) => {
      if (missionFilter !== "ALL" && m.missionType !== missionFilter) return;
      if (directionFilter === "OUTBOUND" && m.status !== "EN_ROUTE") return;
      if (directionFilter === "INBOUND" && m.status !== "RETURNING") return;
      items.push({ kind: "movement", data: m });
    });

    // Add active conquests under CONQUER or ALL
    if (missionFilter === "ALL" || missionFilter === "CONQUER") {
      activeConquests.forEach((c) => {
        items.push({ kind: "conquest", data: c });
      });
    }

    return items;
  }, [movements, activeConquests, missionFilter, directionFilter]);

  const visibleOperations = fleetExpanded
    ? combinedOperations
    : combinedOperations.slice(0, FLEET_COLLAPSED_COUNT);
  const hiddenCount = combinedOperations.length - visibleOperations.length;

  // Prepare 6-hour forecast data
  const forecastBars = useMemo(() => {
    const raw = tradingData?.predictedMultipliers || [];
    const list: { hour: number; multiplier: number }[] = [];
    for (let h = 1; h <= 6; h++) {
      const found = raw.find((r) => r.hour === h);
      list.push(found || { hour: h, multiplier: tradingData?.multiplier || 1.0 });
    }
    return list;
  }, [tradingData]);

  const maxForecastMult = useMemo(() => {
    return Math.max(...forecastBars.map((b) => b.multiplier), 1.5);
  }, [forecastBars]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-[#00E5FF] animate-pulse font-bold tracking-widest uppercase text-sm">
          Initializing Dashboard...
        </div>
      </div>
    );
  }

  // TODO: Replace with API data for rank/points
  const dummyRank = 42;
  const dummyTotalPoints = 12450;
  const dummyPlanetPoints = 4200;

  return (
    <div className="space-y-5">
      {/* ── Fleet Operations & Conquests ── */}
      <div>
        <SectionLabel
          icon={Ship}
          label="Fleet Operations & Conquests"
          info="Active fleet movements, missions, and ongoing planetary sieges"
          right={
            combinedOperations.length > 0 ? (
              <span className="text-xs font-mono text-[#475569]">
                {combinedOperations.length} Active
              </span>
            ) : undefined
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            {MISSION_FILTERS.map((mf) => {
              const MfIcon = mf.icon;
              return (
                <button
                  key={mf.value}
                  onClick={() => setMissionFilter(mf.value)}
                  className={`px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                    missionFilter === mf.value
                      ? "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30"
                      : "bg-[#16181d] text-[#475569] border-[#1e2028] hover:text-[#94a3b8] hover:border-[#2a2e38]"
                  }`}
                >
                  <MfIcon className="w-3.5 h-3.5" />
                  {mf.label}
                </button>
              );
            })}
          </div>

          <div className="w-px h-6 bg-[#2a2e38]" />

          <div className="flex items-center gap-1">
            {DIRECTION_TYPES.map((dir) => (
              <button
                key={dir.value}
                onClick={() => setDirectionFilter(dir.value)}
                className={`px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border ${
                  directionFilter === dir.value
                    ? "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30"
                    : "bg-[#16181d] text-[#475569] border-[#1e2028] hover:text-[#94a3b8] hover:border-[#2a2e38]"
                }`}
              >
                {dir.label}
              </button>
            ))}
          </div>
        </div>

        {/* Operations list */}
        {combinedOperations.length === 0 ? (
          <div className="bg-[#1a1d24] border border-dashed border-[#2a2e38] p-8 flex flex-col items-center justify-center opacity-50 text-center">
            <Timer className="w-6 h-6 text-[#475569] mb-2" />
            <div className="text-[#94a3b8] text-xs font-bold tracking-widest uppercase">
              No active operations match filters
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {visibleOperations.map((op) =>
                op.kind === "movement" ? (
                  <FleetCard
                    key={`m-${op.data.id}`}
                    fleet={op.data}
                    isExpanded={expandedId === op.data.id}
                    toggleExpand={() =>
                      setExpandedId(expandedId === op.data.id ? null : op.data.id)
                    }
                  />
                ) : (
                  <ConquestOperationCard key={`c-${op.data.id}`} conquest={op.data} />
                )
              )}
            </div>

            {combinedOperations.length > FLEET_COLLAPSED_COUNT && (
              <button
                onClick={() => setFleetExpanded(!fleetExpanded)}
                className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 bg-[#16181d] border border-[#1e2028] hover:border-[#2a2e38] text-[#64748b] hover:text-[#94a3b8] transition-all text-xs font-bold uppercase tracking-widest"
              >
                {fleetExpanded ? (
                  <>
                    <ChevronsUp className="w-4 h-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronsDown className="w-4 h-4" />
                    Show {hiddenCount} More Operation{hiddenCount !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Weather + Flux Trading (side by side) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Planetary Weather */}
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-4">
          <SectionLabel
            icon={Thermometer}
            label="Planetary Weather"
            info="Weather cycles affect production, fleet operations, and building speed."
          />
          <div className="grid grid-cols-4 gap-2">
            {DUMMY_WEATHER_PHASES.map((phase) => (
              <div
                key={phase.id}
                className={`p-3 border transition-all relative ${
                  phase.isCurrent
                    ? "bg-[#00E5FF]/5 border-[#00E5FF]/40"
                    : "bg-[#16181d] border-[#1e2028]"
                }`}
              >
                {phase.isCurrent && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#00E5FF]" />
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 flex items-center justify-center shrink-0 ${
                    phase.isCurrent ? "bg-[#00E5FF]/15 text-[#00E5FF]" : "bg-[#1e2028] text-[#475569]"
                  }`}>
                    <WeatherIcon type={phase.icon} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold uppercase tracking-wider leading-tight truncate ${
                      phase.isCurrent ? "text-white" : "text-[#94a3b8]"
                    }`}>
                      {phase.name}
                    </div>
                    <div className={`text-[11px] font-mono ${
                      phase.isCurrent ? "text-[#00E5FF]" : "text-[#475569]"
                    }`}>
                      {phase.isCurrent ? "Active" : phase.duration}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mt-2 pt-2 border-t border-[#1e2028]">
                  {phase.effects.map((e, i) => (
                    <div key={i} className="flex justify-between text-[11px] font-mono gap-1">
                      <span className="text-[#64748b] truncate">{e.label}</span>
                      <span className={`shrink-0 font-bold ${e.positive ? "text-green-400" : "text-red-400"}`}>
                        {e.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flux Market & Multiplier */}
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-4 flex flex-col justify-between">
          <SectionLabel
            icon={ArrowLeftRight}
            label="Flux Market & Multiplier"
            info="Convert raw planetary resources into Flux based on current dynamic exchange multipliers."
            right={
              <Link
                to="/trading"
                className="bg-[rgba(0,229,255,0.1)] text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all"
              >
                Trade
              </Link>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 flex-1 items-center">
            {/* Current Multiplier */}
            <div className="bg-[#16181d] border border-[#1e2028] p-4 flex flex-col justify-center h-full">
              <div className="text-xs text-[#64748b] font-bold uppercase tracking-wider mb-2">
                Current Multiplier
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-mono font-bold text-[#00E5FF]">
                  {(tradingData?.multiplier || 1.0).toFixed(2)}x
                </span>
                <span className="text-xs text-green-400 font-mono font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{Math.round(((tradingData?.multiplier || 1.0) - 1) * 100)}%
                </span>
              </div>
              <div className="text-xs text-[#475569] font-mono">
                Resource exchange rate boost
              </div>
            </div>

            {/* 6-Hour Forecast Bar Chart */}
            <div className="bg-[#16181d] border border-[#1e2028] p-3 flex flex-col justify-between h-full">
              <div className="text-xs text-[#64748b] font-bold uppercase tracking-wider mb-1">
                6-Hour Forecast
              </div>
              <div className="h-24 flex items-end justify-between gap-1.5 pt-2 border-b border-[#1e2028]">
                {forecastBars.map((b) => {
                  const heightPct = (b.multiplier / maxForecastMult) * 100;
                  return (
                    <div
                      key={b.hour}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                    >
                      <div className="text-[10px] font-mono text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-opacity font-bold mb-1">
                        {b.multiplier.toFixed(2)}x
                      </div>
                      <div
                        className="w-full max-w-[20px] bg-[#2a2e38] border-t-2 border-[#00E5FF] group-hover:bg-[#00E5FF]/30 transition-all"
                        style={{ height: `${Math.max(20, heightPct)}%` }}
                      />
                      <div className="text-[10px] font-mono text-[#475569] mt-1">
                        +{b.hour}h
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4-column row: Activity + Commander + Mining + Chart ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Planet Activity */}
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-4">
          <SectionLabel icon={Zap} label="Planet Activity" info="Currently active queues on this planet" />
          <div className="space-y-2">
            <ActivityRow
              icon={Building2}
              label="Construction"
              queue={buildingQueue}
              configs={buildingConfigs}
              now={now}
              linkTo="/buildings"
              type="building"
            />
            <ActivityRow
              icon={BookOpen}
              label="Research"
              queue={techQueue}
              configs={techNodes}
              now={now}
              linkTo="/techtree"
              type="tech"
            />
            <ActivityRow
              icon={Rocket}
              label="Shipyard"
              queue={shipQueue}
              configs={shipConfigs}
              now={now}
              linkTo="/shipyard"
              type="ship"
            />
          </div>
        </div>

        {/* Commander Stats */}
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-4">
          <SectionLabel icon={Trophy} label="Commander" info="Your account-wide stats and ranking" />
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-[#16181d] border border-[#1e2028]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Rank</span>
              </div>
              <span className="text-sm font-mono text-[#00E5FF] font-bold">#{dummyRank}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-[#16181d] border border-[#1e2028]">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#94a3b8]" />
                <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Total Points</span>
              </div>
              <span className="text-sm font-mono text-white font-bold">{formatNumber(dummyTotalPoints)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-[#16181d] border border-[#1e2028]">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#94a3b8]" />
                <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Planets</span>
              </div>
              <span className="text-sm font-mono text-white font-bold">{user?.planets?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-[#16181d] border border-[#1e2028]">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Planet Pts</span>
              </div>
              <span className="text-sm font-mono text-amber-400 font-bold">{formatNumber(dummyPlanetPoints)}</span>
            </div>
          </div>
        </div>

        {/* Mining Overview */}
        <MiningOverviewPanel stats={miningStats} loading={miningLoading} />

        {/* Mining Chart */}
        <MiningChartPanel stats={miningStats} loading={miningLoading} />
      </div>
    </div>
  );
}

// ─── Conquest Operation Card (Special Fleet Item) ────────────

function ConquestOperationCard({ conquest }: { conquest: ActiveConquest }) {
  const estMins = conquest.estimatedMinutesRemaining;
  const pop = conquest.totalHoldingPopulation ?? 0;

  // Format estimated completion string
  let timeStr = "Calculating...";
  if (estMins !== undefined && estMins !== null) {
    if (estMins > 0) {
      if (estMins >= 60) {
        const h = Math.floor(estMins / 60);
        const m = estMins % 60;
        timeStr = `~${h}h ${m}m remaining`;
      } else {
        timeStr = `~${estMins}m remaining`;
      }
    } else if (estMins === 0) {
      timeStr = "Completing...";
    } else if (estMins < 0) {
      timeStr = "Stalled (Min Pop)";
    }
  }

  return (
    <div className="bg-[#1a1d24] border border-[#2a2e38] hover:border-[#3b4252] transition-all p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#16181d] border border-[#00E5FF]/30 text-[#00E5FF]">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {conquest.name}
              </span>
              <span className="text-xs uppercase bg-[#00E5FF]/10 px-2 py-0.5 text-[#00E5FF] border border-[#00E5FF]/30 font-bold tracking-widest">
                CONQUEST SIEGE ({conquest.type})
              </span>
            </div>
            <div className="text-xs font-mono text-[#94a3b8] mt-0.5">
              Coords: X: {conquest.x}, Y: {conquest.y}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-xs font-mono">
          <div>
            <div className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
              Holding Population
            </div>
            <div className="flex items-center gap-1.5 text-[#e2e8f0]">
              <Users className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="font-bold">{formatNumber(pop)}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
              Est. Completion
            </div>
            <div className="flex items-center gap-1.5 text-[#00E5FF]">
              <Timer className="w-3.5 h-3.5" />
              <span>{timeStr}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
              Progress
            </div>
            <div className="text-[#00E5FF] font-bold">{conquest.progress}%</div>
          </div>
        </div>

        {/* Details button (styled exactly like Buildings upgrade button) */}
        <Link
          to={`/conquest/${conquest.spaceObjectId}`}
          className="bg-[rgba(0,229,255,0.1)] text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all select-none border border-[#00E5FF] shrink-0 text-center"
        >
          Details
        </Link>
      </div>

      {/* Progress Bar (styled exactly like Buildings queue progress bar) */}
      <div className="h-1.5 w-full bg-[#1e2028] overflow-hidden mt-3">
        <div
          className="h-full bg-[#00E5FF] transition-all duration-1000 ease-linear shadow-[0_0_10px_#00E5FF]"
          style={{ width: `${conquest.progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Activity Row Component ───────────────────────────────────

function ActivityRow({
  icon: Icon,
  label,
  queue,
  configs,
  now,
  linkTo,
  type,
}: {
  icon: any;
  label: string;
  queue: any[];
  configs: Record<string, any>;
  now: number;
  linkTo: string;
  type: "building" | "tech" | "ship";
}) {
  const activeItem = queue.length > 0 ? queue[0] : null;

  if (!activeItem || !activeItem.startedAt) {
    return (
      <Link
        to={linkTo}
        className="flex items-center gap-3 p-3 bg-[#16181d] border border-[#1e2028] hover:border-[#2a2e38] transition-colors group"
      >
        <div className="w-8 h-8 bg-[#1e2028] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#364152]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[#475569] uppercase tracking-widest">{label}</div>
          <div className="text-xs text-[#364152] font-mono italic">Idle</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-[#364152] group-hover:text-[#64748b] transition-colors shrink-0" />
      </Link>
    );
  }

  const start = new Date(activeItem.startedAt).getTime();
  let totalSec: number;
  let itemName: string;

  if (type === "building") {
    totalSec = activeItem.durationSec;
    const config = configs[activeItem.buildingType];
    itemName = config?.name || activeItem.buildingType;
  } else if (type === "tech") {
    totalSec = activeItem.durationSec;
    const config = configs[activeItem.nodeId];
    itemName = config?.name || activeItem.nodeId;
  } else {
    totalSec = activeItem.durationSec * (activeItem.quantity - (activeItem.completedCount || 0));
    const config = configs[activeItem.shipType];
    itemName = config?.name || activeItem.shipType;
    if (activeItem.quantity > 1) {
      itemName += ` ×${activeItem.quantity - (activeItem.completedCount || 0)}`;
    }
  }

  const elapsedSec = Math.floor((now - start) / 1000);
  const progress = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));
  const remSec = Math.max(0, totalSec - elapsedSec);

  return (
    <Link
      to={linkTo}
      className="flex items-center gap-3 p-3 bg-[#16181d] border border-[#00E5FF]/15 hover:border-[#00E5FF]/30 transition-colors group"
    >
      <div className="w-8 h-8 bg-[#00E5FF]/10 flex items-center justify-center shrink-0 border border-[#00E5FF]/20">
        <Icon className="w-4 h-4 text-[#00E5FF]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs font-bold text-white uppercase tracking-wider truncate">
            {itemName}
          </div>
          <div className="text-xs font-mono text-[#00E5FF] shrink-0 ml-2">
            {formatTime(remSec)}
          </div>
        </div>
        <div className="h-1 w-full bg-[#0a0b0e] overflow-hidden">
          <div
            className="h-full bg-[#00E5FF] transition-all duration-1000 ease-linear shadow-[0_0_6px_rgba(0,229,255,0.3)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-[#475569] group-hover:text-[#00E5FF] transition-colors shrink-0" />
    </Link>
  );
}

// ─── Fleet Card Component ─────────────────────────────────────

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
      if (targetTime === 0) { setTimeLeft(0); return; }
      setTimeLeft(Math.max(0, Math.floor((targetTime - Date.now()) / 1000)));
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, [fleet]);

  const missionIcon = {
    ATTACK: <Target className="w-4 h-4 text-red-400" />,
    MINE: <Pickaxe className="w-4 h-4 text-[#00E5FF]" />,
    EXPLORE: <MapIcon className="w-4 h-4 text-indigo-400" />,
    CONQUER: <Crown className="w-4 h-4 text-amber-400" />,
    HOLD: <Shield className="w-4 h-4 text-emerald-400" />,
  }[fleet.missionType];

  const totalShips = fleet.ships.reduce((a, b) => a + b.count, 0);

  return (
    <div className={`bg-[#1a1d24] border transition-all ${isExpanded ? "border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.08)]" : "border-[#2a2e38] hover:border-[#3b4252]"}`}>
      <div className="p-4 cursor-pointer flex items-center gap-4 select-none" onClick={toggleExpand}>
        <div className={`w-9 h-9 shrink-0 flex items-center justify-center bg-[#16181d] border ${
          fleet.status === "RETURNING" ? "text-amber-400 border-amber-500/30"
            : fleet.status === "HOLDING" ? "text-emerald-400 border-emerald-500/30"
            : "text-[#00E5FF] border-[#00E5FF]/30"
        }`}>
          {fleet.status === "EN_ROUTE" ? <ArrowRight className="w-4 h-4" />
            : fleet.status === "HOLDING" ? <Shield className="w-4 h-4" />
            : <RotateCcw className="w-4 h-4" />}
        </div>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">Mission</div>
            <div className="flex items-center gap-2">
              {missionIcon}
              <span className="text-sm font-bold text-white uppercase tracking-wider">{fleet.missionType}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">Route</div>
            <div className="flex items-center gap-1 text-sm font-mono text-[#e2e8f0]">
              <span className="truncate max-w-[120px]">{fleet.origin?.name || "Unknown"}</span>
              <ChevronRight className="w-3 h-3 text-[#475569]" />
              <span className="truncate max-w-[120px]">{fleet.target?.name || "Destroyed"}</span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">Fleet Size</div>
            <div className="text-sm font-mono text-[#e2e8f0]">{formatNumber(totalShips)} Ships</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">Arrival</div>
            <div className={`flex items-center gap-1.5 text-sm font-mono ${fleet.status === "HOLDING" ? "text-emerald-400" : "text-[#00E5FF]"}`}>
              {fleet.status === "HOLDING" ? (
                <span className="text-xs font-bold uppercase tracking-widest">Holding</span>
              ) : (
                <>
                  <Timer className="w-3.5 h-3.5" />
                  <span>{Math.floor(timeLeft / 60)}m {timeLeft % 60}s</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-[#475569]" /> : <ChevronRight className="w-4 h-4 text-[#475569]" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#2a2e38] bg-[#16181d]/50 animate-in slide-in-from-top-1 duration-200">
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Ship className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span className="text-xs font-bold text-[#00E5FF] tracking-widest uppercase">Composition</span>
              </div>
              <div className="grid gap-2">
                {fleet.ships.map((s) => (
                  <div key={s.type} className="flex justify-between items-center bg-[#1a1d24] border border-[#2a2e38] p-2 px-3">
                    <span className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider">{s.type}</span>
                    <span className="text-sm font-mono text-[#00E5FF]">{formatNumber(s.count)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">Cargo</span>
              </div>
              <div className="grid gap-2">
                {fleet.resources.length === 0 ? (
                  <div className="text-xs text-[#475569] font-bold uppercase italic py-2">Hold is empty</div>
                ) : (
                  fleet.resources.map((r) => (
                    <div key={r.type} className="flex justify-between items-center bg-[#1a1d24] border border-[#2a2e38] p-2 px-3">
                      <span className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider">{r.type}</span>
                      <span className="text-sm font-mono text-amber-400">{formatNumber(r.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-[#2a2e38] flex justify-between items-center text-xs text-[#475569] font-bold uppercase tracking-widest">
            <div className="flex gap-4">
              <span>Origin: <span className="text-[#94a3b8]">{fleet.origin ? `${fleet.origin.x}, ${fleet.origin.y}` : "Unknown"}</span></span>
              <span>Target: <span className="text-[#94a3b8]">{fleet.target ? `${fleet.target.x}, ${fleet.target.y}` : "Destroyed"}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
