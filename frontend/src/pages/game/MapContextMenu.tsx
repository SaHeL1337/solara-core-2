import {
  Crosshair,
  Pickaxe,
  ShieldAlert,
  WifiHigh,
  Factory,
  Zap,
  X,
  MapPin,
  Compass,
  Swords,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/utils";
import { useGame } from "@/context/GameContext";
import { toast } from "sonner";

export type SpaceObject = {
  id: string;
  type: "planet" | "asteroid" | "anomaly";
  name: string;
  x: number;
  y: number;
  color: string;
  size: number;
  owner?: string;
  imageUrl?: string;
  titanium?: number;
  silicate?: number;
  isotope?: number;
  scanStatus?: "success" | "failed" | "unscanned";
};

interface MapDetailPanelProps {
  object: SpaceObject;
  onMiningStarted?: (targetId: string, usedMiners: number) => void;
  onScannerStarted?: (
    targetId: string,
    usedScanners: number,
    arrivalTimeStr: string,
  ) => void;
  onClose: () => void;
}

const BUILDING_LABELS: Record<string, string> = {
  TITANIUM_MINE: "Titanium Mine",
  SILICATE_MINE: "Silicate Mine",
  ISOTOPE_COLLECTOR: "Isotope Collector",
  SHIPYARD: "Shipyard",
  SHIELD_GENERATOR: "Shield Gen",
  HOUSING_BLOCK: "Housing",
  GOVERNMENT_BUILDING: "Government",
  STORAGE: "Storage",
  TRADING_HUB: "Trading Hub",
};

export function MapDetailPanel({
  object,
  onMiningStarted,
  onScannerStarted,
  onClose,
}: MapDetailPanelProps) {
  const navigate = useNavigate();
  const { selectedPlanet } = useGame();

  const isAsteroid = object.type === "asteroid";
  const isPlanet = object.type === "planet";

  const [resources, setResources] = useState({
    titanium: object.titanium || 0,
    silicate: object.silicate || 0,
    isotope: object.isotope || 0,
  });

  const [minersAvailable, setMinersAvailable] = useState<number | null>(null);
  const [minerCapacity, setMinerCapacity] = useState<number>(1000);
  const [scannersAvailable, setScannersAvailable] = useState<number | null>(null);
  const [scanReport, setScanReport] = useState<any>(null);

  const distance = selectedPlanet
    ? Math.sqrt(
        Math.pow(object.x - selectedPlanet.x, 2) +
          Math.pow(object.y - selectedPlanet.y, 2),
      )
    : 0;

  useEffect(() => {
    if (isAsteroid) {
      api.get(`/map/objects/${object.id}/resources`)
        .then((res) => setResources(res.data.data))
        .catch((err) => console.error("Failed to fetch asteroid resources", err));
    }
  }, [object.id, isAsteroid]);

  useEffect(() => {
    if (selectedPlanet) {
      api.get(`/ships/ships?planetId=${selectedPlanet.id}`)
        .then((res) => {
          const data = res.data.data;
          const ships = data.current;
          if (isAsteroid) {
            const miner = ships.find((s: any) => s.type === "MINER");
            setMinersAvailable(miner ? miner.count : 0);
            const availableModels = data.available;
            if (availableModels?.["MINER"]) {
              setMinerCapacity(availableModels["MINER"].capacity || 1000);
            }
          }
          if (isPlanet) {
            const scanner = ships.find((s: any) => s.type === "SCANNER");
            setScannersAvailable(scanner ? scanner.count : 0);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [object.id, isAsteroid, isPlanet, selectedPlanet]);

  useEffect(() => {
    if (isPlanet && selectedPlanet) {
      api.get(`/map/objects/${object.id}/report`)
        .then((res) => {
          if (res.data.data) {
            const reportDb = res.data.data;
            if (reportDb.data) {
              setScanReport({
                ...reportDb.data,
                createdAt: reportDb.createdAt,
              });
            }
          }
        })
        .catch((err) => {
          if (err.response?.status !== 404) {
            console.error("Failed to fetch scan report", err);
          }
        });
    }
  }, [isPlanet, object.id, selectedPlanet]);

  const [movements, setMovements] = useState<any[]>([]);
  const movementsRef = useRef<any[]>([]);

  const fetchMovements = useCallback(async () => {
    try {
      const { data } = await api.get("/fleet/movements");
      const list = Array.isArray(data.data) ? data.data : (data.data.active || []);
      const filtered = list.filter((m: any) => m.targetId === object.id || m.originId === object.id);

      // Refresh scan report immediately if a scan probe mission has finished
      const hadScan = movementsRef.current.some((m: any) => m.missionType === "SCAN" && m.status === "EN_ROUTE");
      const hasScan = filtered.some((m: any) => m.missionType === "SCAN" && m.status === "EN_ROUTE");

      if (hadScan && !hasScan) {
        setTimeout(() => {
          api.get(`/map/objects/${object.id}/report`)
            .then((res) => {
              if (res.data.data) {
                const reportDb = res.data.data;
                if (reportDb.data) {
                  setScanReport({
                    ...reportDb.data,
                    createdAt: reportDb.createdAt,
                  });
                }
              }
            })
            .catch(console.error);
        }, 1000);
      }

      setMovements(filtered);
      movementsRef.current = filtered;
    } catch (err) {
      console.error("Failed to fetch movements for side panel", err);
    }
  }, [object.id]);

  useEffect(() => {
    fetchMovements();
    const interval = setInterval(fetchMovements, 2000);
    return () => clearInterval(interval);
  }, [fetchMovements]);

  const totalRes = resources.titanium + resources.silicate + resources.isotope;
  const requiredMiners = Math.ceil(totalRes / minerCapacity);
  const validToSend = Math.max(0, Math.min(requiredMiners, minersAvailable || 0));

  const handleQuickMine = async () => {
    if (!selectedPlanet || validToSend <= 0) return;
    try {
      await api.post("/fleet/dispatch", {
        originId: selectedPlanet.id,
        targetId: object.id,
        missionType: "MINE",
        ships: { MINER: validToSend },
      });
      toast.success(`Dispatched ${validToSend} MINERs to ${object.name}!`);
      setMinersAvailable((prev) => (prev || 0) - validToSend);
      if (onMiningStarted) onMiningStarted(object.id, validToSend);
      fetchMovements();
    } catch (e: any) {
      console.error("Dispatch failed", e);
      toast.error(e.response?.data?.error || "Dispatch failed");
    }
  };

  const scanAmount = Math.min(5, scannersAvailable || 0);

  const handleQuickScan = async () => {
    if (!selectedPlanet) return;
    if (scanAmount <= 0) {
      toast.error("No Scanner Probes available!");
      return;
    }
    try {
      const res = await api.post("/fleet/dispatch", {
        originId: selectedPlanet.id,
        targetId: object.id,
        missionType: "SCAN",
        ships: { SCANNER: scanAmount },
      });
      toast.success(`Dispatched ${scanAmount} Scanner Probes to ${object.name}!`);
      setScannersAvailable((prev) => (prev || 0) - scanAmount);
      if (onScannerStarted)
        onScannerStarted(object.id, scanAmount, res.data.data.arrivalTime);
      fetchMovements();
    } catch (e: any) {
      console.error("Scan dispatch failed", e);
      toast.error(e.response?.data?.error || "Scan dispatch failed");
    }
  };

  const isSelf =
    object.owner === (selectedPlanet as any)?.ownerId &&
    object.owner !== undefined;

  // Determine the type badge color
  const typeBadge = {
    planet: { label: "Planet", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
    asteroid: { label: "Asteroid", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" },
    anomaly: { label: "Anomaly", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  }[object.type];

  return (
    <div className="h-full flex flex-col bg-[#111317] border-l border-[#1e2028] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#1e2028] bg-[#16181d] shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="text-base font-bold text-[#e2e8f0] tracking-wide truncate">
              {isAsteroid ? "Asteroid Field" : object.name}
              {isSelf && <span className="text-[#00E5FF] ml-2 text-xs">(You)</span>}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${typeBadge.bg} ${typeBadge.color}`}>
                {typeBadge.label}
              </span>
              {object.owner && (
                <span className="text-[10px] text-[#64748b] font-mono truncate">
                  {object.owner}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1e2028] transition-colors border border-transparent hover:border-[#2a2e38]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Coordinates, Distance & Intel Age badges */}
        <div className="flex flex-wrap gap-2 text-[10px] tracking-wide mt-2">
          <div className="flex items-center gap-1 bg-[#1a1d24] border border-[#2a2e38] px-2 py-0.5 rounded text-[#94a3b8]">
            <MapPin className="size-3 text-[#00E5FF]" />
            <span className="font-mono text-white font-bold">{object.x}, {object.y}</span>
          </div>
          {selectedPlanet && (
            <div className="flex items-center gap-1 bg-[#1a1d24] border border-[#2a2e38] px-2 py-0.5 rounded text-[#94a3b8]">
              <Compass className="size-3 text-[#00E5FF]" />
              <span className="font-mono text-white font-bold">{distance.toFixed(1)} ly</span>
            </div>
          )}
          {isPlanet && scanReport?.createdAt && (
            <div className="flex items-center gap-1 bg-[#1a1d24] border border-[#2a2e38] px-2 py-0.5 rounded text-[#94a3b8]" title="Time since last scanner scan">
              <Timer className="size-3 text-[#00E5FF]" />
              <span className="font-mono text-white font-bold">{formatScanAge(scanReport.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Resources — for asteroids, always show; for planets, show from scan report */}
        {isAsteroid && (
          <Section title="Resources">
            <div className="grid grid-cols-3 gap-2">
              <ResourceCard icon={TitaniumIcon} label="Titanium" value={resources.titanium} color="text-[#00E5FF]" />
              <ResourceCard icon={SilicateIcon} label="Silicate" value={resources.silicate} color="text-emerald-400" />
              <ResourceCard icon={IsotopeIcon} label="Isotope" value={resources.isotope} color="text-purple-400" />
            </div>
          </Section>
        )}



        {/* Scan Report — planet intel */}
        {isPlanet && scanReport && (
          <>
            {scanReport.failed ? (
              <Section title="Scan Report">
                <div className="bg-red-950/20 border border-red-900/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-400">
                    <ShieldAlert className="size-4 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Scan Intercepted</span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8]">
                    Scanner probes were destroyed by planetary defenses.
                  </p>
                  {scanReport.losses > 0 && (
                    <div className="text-[10px] text-red-500 font-mono">
                      Losses: {scanReport.losses} SCANNER{scanReport.losses > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </Section>
            ) : (
              <>
                {/* Scanned Resources */}
                <Section title="Resources">
                  <div className="grid grid-cols-3 gap-2">
                    <ResourceCard icon={TitaniumIcon} label="Titanium" value={scanReport.resources?.titanium || 0} color="text-[#00E5FF]" />
                    <ResourceCard icon={SilicateIcon} label="Silicate" value={scanReport.resources?.silicate || 0} color="text-emerald-400" />
                    <ResourceCard icon={IsotopeIcon} label="Isotope" value={scanReport.resources?.isotope || 0} color="text-purple-400" />
                  </div>
                </Section>

                {/* Structures */}
                {scanReport.buildings?.length > 0 && (
                  <Section title="Structures" icon={Factory}>
                    <div className="space-y-1">
                      {scanReport.buildings.map((b: any) => (
                        <div key={b.type} className="flex items-center justify-between py-1.5 px-3 bg-[#16181d] border border-[#1e2028] hover:border-[#2a2e38] transition-colors">
                          <span className="text-[11px] text-[#94a3b8] font-medium">
                            {BUILDING_LABELS[b.type] || b.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#00E5FF]">
                            Lv. {b.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Garrison */}
                {scanReport.shipsOnPlanet?.length > 0 && (
                  <Section title="Garrison" icon={Swords} iconColor="text-red-400">
                    <div className="space-y-1">
                      {scanReport.shipsOnPlanet.map((s: any) => (
                        <div key={s.type} className="flex items-center justify-between py-1.5 px-3 bg-[#16181d] border border-[#1e2028] hover:border-[#2a2e38] transition-colors">
                          <span className="text-[11px] text-[#94a3b8] font-medium">
                            {s.type}
                          </span>
                          <span className="text-xs font-mono font-bold text-red-400">
                            ×{formatNumber(s.count)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}
          </>
        )}

        {/* No scan data yet for planet */}
        {isPlanet && !scanReport && !movements.some((m: any) => m.missionType === "SCAN" && m.status === "EN_ROUTE") && (
          <Section title="Intel">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <WifiHigh className="size-6 text-[#2a2e38] mb-2" />
              <span className="text-[11px] text-[#64748b] font-bold uppercase tracking-wider">No scan data</span>
              <span className="text-[10px] text-[#3b4252] mt-1">Send scanner probes to gather intel</span>
            </div>
          </Section>
        )}

        {/* Active Fleet Activities */}
        {movements.length > 0 && (
          <Section title="Active Fleets" icon={Timer}>
            <div className="space-y-2">
              {movements.map((m) => (
                <FleetActivityItem key={m.id} fleet={m} />
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Action Buttons — sticky at bottom */}
      <div className="shrink-0 border-t border-[#1e2028] bg-[#16181d] p-4">
        {isAsteroid ? (
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              icon={Pickaxe}
              label="Fleet Panel"
              onClick={() => navigate(`/fleet?action=MINE&targetX=${object.x}&targetY=${object.y}`)}
              variant="secondary"
            />
            <ActionButton
              icon={Pickaxe}
              label={`Mine (${validToSend})`}
              badge={minersAvailable !== null ? `${minersAvailable}` : undefined}
              onClick={handleQuickMine}
              disabled={minersAvailable === null || minersAvailable === 0 || totalRes === 0}
              variant="primary"
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              icon={WifiHigh}
              label="Scan"
              badge={scannersAvailable !== null && !isSelf ? `${scannersAvailable}` : undefined}
              onClick={handleQuickScan}
              disabled={scannersAvailable === 0 || isSelf}
              variant="primary"
            />
            <ActionButton
              icon={Crosshair}
              label="Attack"
              onClick={() => navigate(`/fleet?action=ATTACK&targetX=${object.x}&targetY=${object.y}`)}
              disabled={isSelf}
              variant="danger"
            />
            <ActionButton
              icon={Zap}
              label="Support"
              onClick={() => navigate(`/fleet?action=SUPPORT&targetX=${object.x}&targetY=${object.y}`)}
              variant="success"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon?: any;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className={`size-3 ${iconColor || "text-[#64748b]"}`} />}
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#64748b]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function ResourceCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#16181d] border border-[#1e2028] p-2.5 flex flex-col items-center gap-1">
      <Icon className={`size-4 ${color}`} />
      <span className={`text-xs font-mono font-bold ${color}`}>
        {formatNumber(Math.floor(value))}
      </span>
      <span className="text-[8px] font-bold uppercase tracking-widest text-[#64748b]">
        {label}
      </span>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  badge,
  onClick,
  disabled,
  variant = "secondary",
}: {
  icon: any;
  label: string;
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "success";
}) {
  const styles = {
    primary: "bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF] hover:bg-[#00E5FF]/20",
    secondary: "bg-[#1e2028] border-[#2a2e38] text-[#94a3b8] hover:bg-[#2a2e38] hover:text-[#e2e8f0]",
    danger: "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
  };

  const badgeColors = {
    primary: "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30",
    secondary: "bg-zinc-800 text-[#94a3b8] border-zinc-700",
    danger: "bg-red-500/20 text-red-400 border-red-500/30",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center py-2.5 px-2 border transition-all relative
        disabled:opacity-30 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      <Icon className="size-4 mb-1" />
      <span className="text-[9px] font-bold tracking-widest uppercase">{label}</span>
      {badge && (
        <span className={`absolute top-1 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 border ${badgeColors[variant]}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function FleetActivityItem({ fleet }: { fleet: any }) {
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

  const totalShips = Array.isArray(fleet.ships)
    ? fleet.ships.reduce((a: number, b: any) => a + b.count, 0)
    : Object.entries(fleet.ships || {}).reduce((a: number, [_, count]: any) => a + count, 0);

  const missionColor = {
    ATTACK: "text-red-400 border-red-500/20 bg-red-500/5",
    MINE: "text-[#00E5FF] border-[#00E5FF]/20 bg-[#00E5FF]/5",
    SCAN: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    EXPLORE: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
    SUPPORT: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  }[fleet.missionType as string] || "text-zinc-400 border-zinc-500/20 bg-zinc-500/5";

  return (
    <div className={`p-3 border rounded ${missionColor} flex flex-col gap-1.5`}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {fleet.missionType} Mission
        </span>
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wide opacity-80">
          {fleet.status === "EN_ROUTE" ? "En Route" : "Returning"}
        </span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-300 font-medium">
          {totalShips} Ships
        </span>
        <span className="font-mono text-zinc-300 flex items-center gap-1">
          <Timer className="size-3" />
          {timeLeft > 0 ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s` : "Arrived"}
        </span>
      </div>
    </div>
  );
}

function formatScanAge(createdAtStr: string): string {
  const date = new Date(createdAtStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  
  if (diffMins < 1) return "<1m";
  if (diffMins < 60) return `${diffMins}m`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
