import { Crosshair, Pickaxe, ShieldAlert, WifiHigh, Factory, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/utils";
import { useMap } from "react-leaflet";
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
};

interface MapContextMenuProps {
  object: SpaceObject;
  position?: { x: number; y: number };
  scanTiming?: { start: number; end: number };
  onMiningStarted?: (targetId: string, usedMiners: number) => void;
  onScannerStarted?: (targetId: string, usedScanners: number, arrivalTimeStr: string) => void;
  onClose?: () => void;
}

export function MapContextMenu({ object, scanTiming, onMiningStarted, onScannerStarted }: MapContextMenuProps) {
  const map = useMap();
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

  // Distance calculation
  const distance = selectedPlanet
    ? Math.sqrt(Math.pow(object.x - selectedPlanet.x, 2) + Math.pow(object.y - selectedPlanet.y, 2))
    : 0;

  useEffect(() => {
    if (isAsteroid) {
      api
        .get(`/map/objects/${object.id}/resources`)
        .then((res) => {
          setResources(res.data.data);
        })
        .catch((err) =>
          console.error("Failed to fetch asteroid resources", err),
        );
    }
  }, [object.id, isAsteroid]);

  useEffect(() => {
    if (selectedPlanet) {
      api
        .get(`/ships/ships?planetId=${selectedPlanet.id}`)
        .then((res) => {
          const data = res.data.data;
          const ships = data.current;
          
          if (isAsteroid) {
            const miner = ships.find((s: any) => s.type === "MINER");
            setMinersAvailable(miner ? miner.count : 0);
            const availableModels = data.available;
            if (availableModels && availableModels["MINER"]) {
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
        .then(res => {
          if (res.data.data && res.data.data.data) {
            setScanReport(res.data.data.data);
          }
        })
        .catch(err => {
          // Ignore 404s (no report exists yet)
          if (err.response?.status !== 404) {
            console.error("Failed to fetch scan report", err);
          }
        });
    }
  }, [isPlanet, object.id, selectedPlanet]);

  const totalRes = resources.titanium + resources.silicate + resources.isotope;
  const requiredMiners = Math.ceil(totalRes / minerCapacity);
  const validToSend = Math.max(
    0,
    Math.min(requiredMiners, minersAvailable || 0),
  );

  const handleQuickMine = async () => {
    if (!selectedPlanet || validToSend <= 0) return;
    try {
      await api.post("/fleet/dispatch", {
        originId: selectedPlanet.id,
        targetId: object.id,
        missionType: "MINE",
        ships: { MINER: validToSend },
      });
      toast.success(`Dispatched ${validToSend} MINERs successfully to ${object.name}!`);
      setMinersAvailable((prev) => (prev || 0) - validToSend);
      if (onMiningStarted) onMiningStarted(object.id, validToSend);
      map.closePopup();
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
      if (onScannerStarted) onScannerStarted(object.id, scanAmount, res.data.data.arrivalTime);
      map.closePopup();
    } catch (e: any) {
      console.error("Scan dispatch failed", e);
      toast.error(e.response?.data?.error || "Scan dispatch failed");
    }
  };

  const isSelf = object.owner === (selectedPlanet as any)?.ownerId && object.owner !== undefined;

  const [timeLeft, setTimeLeft] = useState(0);
  const [lastScanEndTime, setLastScanEndTime] = useState<number | null>(null);

  useEffect(() => {
    if (!scanTiming) {
      // If scanTiming was present but now is gone, and we haven't fetched the report yet, try fetching it
      if (lastScanEndTime && lastScanEndTime > 0) {
        setLastScanEndTime(null);
        // Small delay to allow backend to finish processing
        setTimeout(() => {
          api.get(`/map/objects/${object.id}/report`)
            .then(res => {
              if (res.data.data && res.data.data.data) {
                setScanReport(res.data.data.data);
              }
            }).catch(console.error);
        }, 1000);
      }
      return;
    }
    
    setLastScanEndTime(scanTiming.end);
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((scanTiming.end - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        // Scan just finished! Trigger re-fetch
        setTimeout(() => {
          api.get(`/map/objects/${object.id}/report`)
            .then(res => {
              if (res.data.data && res.data.data.data) {
                setScanReport(res.data.data.data);
              }
            }).catch(console.error);
        }, 1500);
      }
    }, 1000);

    const now = Date.now();
    setTimeLeft(Math.max(0, Math.floor((scanTiming.end - now) / 1000)));
    
    return () => clearInterval(interval);
  }, [scanTiming, object.id]);

  const progress = scanTiming 
    ? Math.min(100, Math.max(0, ((Date.now() - scanTiming.start) / (scanTiming.end - scanTiming.start)) * 100))
    : 0;

  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <div className="w-full">
          <h3 className={`font-bold text-lg m-0 ${object.color}`}>
            {isAsteroid ? "Asteroid" : object.name} {isSelf && "(You)"}
          </h3>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-zinc-400 capitalize m-0">
              {object.type} {object.owner ? `• ${object.owner}` : ""}
            </p>
            <p className="text-xs font-mono text-zinc-500 m-0">
              [{object.x}, {object.y}]
            </p>
          </div>
          
          {selectedPlanet && (
            <p className="text-xs text-zinc-500 mt-1">
              Distance: <span className="text-zinc-300 font-mono">{distance.toFixed(1)}</span>
            </p>
          )}

          {isAsteroid && (
            <div className="mt-4 flex gap-1 bg-zinc-900/50 p-2 border border-zinc-800/50">
              {[
                { label: "titanium", icon: TitaniumIcon, val: resources.titanium },
                { label: "silicate", icon: SilicateIcon, val: resources.silicate },
                { label: "isotope", icon: IsotopeIcon, val: resources.isotope },
              ].map((res) => (
                <div key={res.label} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <res.icon className="size-3" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#e2e8f0]">
                    {formatNumber(res.val)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {scanTiming && scanTiming.end > Date.now() && (
            <div className="mt-4 bg-emerald-900/10 p-3 border border-emerald-500/50 rounded-lg">
              <div className="flex justify-between items-center mb-1 text-emerald-400">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <WifiHigh className="w-3 h-3 animate-pulse" /> Active Scan
                </span>
                <span className="text-[10px] font-mono">{timeLeft}s</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden border border-emerald-900/30">
                <div 
                  className="bg-emerald-400 h-1 rounded-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {isPlanet && scanReport && (!scanTiming || scanTiming.end <= Date.now()) && (
            <div className="mt-4 bg-zinc-900/50 p-2 border border-emerald-900/50 rounded-lg">
              <div className="flex items-center gap-1 mb-2 text-emerald-400">
                <WifiHigh className="w-3 h-3" /> 
                <span className="text-[10px] font-bold uppercase tracking-wider">Intercepted Intel</span>
              </div>
              <div className="flex gap-1 mb-2">
                {[
                  { label: "titanium", icon: TitaniumIcon, val: scanReport.resources?.titanium || 0 },
                  { label: "silicate", icon: SilicateIcon, val: scanReport.resources?.silicate || 0 },
                  { label: "isotope", icon: IsotopeIcon, val: scanReport.resources?.isotope || 0 },
                ].map((res) => (
                  <div key={res.label} className="flex-1 flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-1">
                      <res.icon className="size-3" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#e2e8f0]">
                      {formatNumber(res.val)}
                    </span>
                  </div>
                ))}
              </div>
              {scanReport.buildings && scanReport.buildings.length > 0 && (
                <div className="text-[10px] text-zinc-400 mt-2">
                  <div className="font-bold text-zinc-300 mb-1 flex items-center gap-1"><Factory className="w-3 h-3"/> Buildings:</div>
                  <ul className="list-disc list-inside">
                    {scanReport.buildings.map((b: any) => (
                      <li key={b.type}>{b.type} (Lv {b.level})</li>
                    ))}
                  </ul>
                </div>
              )}
              {scanReport.shipsOnPlanet && scanReport.shipsOnPlanet.length > 0 && (
                <div className="text-[10px] text-zinc-400 mt-2">
                  <div className="font-bold text-red-400 mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Fleet Presence:</div>
                  <ul className="list-disc list-inside">
                    {scanReport.shipsOnPlanet.map((s: any) => (
                      <li key={s.type}>{s.count}x {s.type}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`grid gap-2 mt-4 ${isAsteroid ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {isAsteroid ? (
          <>
            <button
              onClick={() =>
                navigate(
                  `/fleet?action=MINE&targetX=${object.x}&targetY=${object.y}`,
                )
              }
              className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors hover:bg-zinc-800 group"
            >
              <Pickaxe className="w-5 h-5 mb-1 text-zinc-400" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">
                Fleet
              </span>
            </button>
            <button
              onClick={handleQuickMine}
              disabled={
                minersAvailable === null ||
                minersAvailable === 0 ||
                totalRes === 0
              }
              className="flex flex-col items-center justify-center bg-[#00E5FF]/5 border border-[#00E5FF]/50 rounded-lg p-2 transition-colors hover:bg-[#00E5FF]/20 group text-[#00E5FF] disabled:opacity-30 disabled:cursor-not-allowed relative"
            >
              <Pickaxe className="w-5 h-5 mb-1 text-[#00E5FF]" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#00E5FF]">
                Send {validToSend}
              </span>
              {minersAvailable !== null && (
                <span className="absolute top-1 right-1 text-[8px] sm:text-[9px] font-mono font-bold p-1 border-[#00E5FF]/30 text-[#00E5FF]">
                  {minersAvailable}
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handleQuickScan}
              disabled={scannersAvailable === 0 || isSelf}
              className="flex flex-col items-center justify-center bg-[#00E5FF]/5 border border-[#00E5FF]/30 rounded-lg p-2 transition-colors hover:bg-[#00E5FF]/20 group text-[#00E5FF] disabled:opacity-30 disabled:cursor-not-allowed relative"
            >
              <WifiHigh className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase">
                Scan
              </span>
              {scannersAvailable !== null && !isSelf && (
                <span className="absolute top-1 right-1 text-[8px] font-mono font-bold text-[#00E5FF]">
                  {scannersAvailable}
                </span>
              )}
            </button>
            <button
              onClick={() =>
                navigate(
                  `/fleet?action=ATTACK&targetX=${object.x}&targetY=${object.y}`,
                )
              }
              disabled={isSelf}
              className="flex flex-col items-center justify-center bg-red-900/10 border border-red-900/50 rounded-lg p-2 transition-colors hover:bg-red-900/30 group disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Crosshair className="w-4 h-4 text-red-400 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-red-300">
                Attack
              </span>
            </button>
            <button
              onClick={() =>
                navigate(
                  `/fleet?action=SUPPORT&targetX=${object.x}&targetY=${object.y}`,
                )
              }
              className="flex flex-col items-center justify-center bg-emerald-900/10 border border-emerald-900/50 rounded-lg p-2 transition-colors hover:bg-emerald-900/30 group"
            >
              <Zap className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-300">
                Support
              </span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
