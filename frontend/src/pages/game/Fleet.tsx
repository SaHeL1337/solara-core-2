import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Target, Pickaxe, Map as MapIcon, Send, Crown, Shield } from "lucide-react";

type SpaceObjectTarget = {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  distance: number;
  owner?: string;
};

type ShipInventory = {
  id: string;
  type: string;
  count: number;
};

export default function Fleet() {
  const { selectedPlanet } = useGame();
  const selectedPlanetId = selectedPlanet?.id;
  
  const [targetX, setTargetX] = useState<string>("");
  const [targetY, setTargetY] = useState<string>("");
  const [targetInfo, setTargetInfo] = useState<SpaceObjectTarget | null>(null);
  const [isFetchingTarget, setIsFetchingTarget] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);

  const [missionType, setMissionType] = useState<"ATTACK" | "MINE" | "EXPLORE" | "CONQUER" | "HOLD" | null>(null);

  const [availableShips, setAvailableShips] = useState<Record<string, any>>({});
  const [currentShips, setCurrentShips] = useState<ShipInventory[]>([]);
  const [selectedShips, setSelectedShips] = useState<Record<string, number>>({});
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [searchParams] = useSearchParams();

  const lastCoordsRef = useRef<{ x: string; y: string }>({ x: "", y: "" });

  useEffect(() => {
    const action = searchParams.get("action");
    const x = searchParams.get("targetX");
    const y = searchParams.get("targetY");

    if (x) setTargetX(x);
    if (y) setTargetY(y);
    if (action === "MINE") setMissionType("MINE");
    if (action === "ATTACK") setMissionType("ATTACK");
    if (action === "EXPLORE") setMissionType("EXPLORE");
    if (action === "CONQUER") setMissionType("CONQUER");
    if (action === "HOLD") setMissionType("HOLD");
  }, [searchParams]);

  const fetchTarget = useCallback(async (xVal: string, yVal: string) => {
    if (!selectedPlanetId || !xVal || !yVal) return;
    
    setIsFetchingTarget(true);
    setTargetError(null);

    // Only clear missionType if coordinates actually changed
    const coordsChanged = lastCoordsRef.current.x !== xVal || lastCoordsRef.current.y !== yVal;
    if (coordsChanged) {
      setMissionType(null);
      lastCoordsRef.current = { x: xVal, y: yVal };
    }

    try {
      const endpoint = `/map/target?x=${xVal}&y=${yVal}&originPlanetId=${selectedPlanetId}`;
      const { data } = await api.get(endpoint);
      setTargetInfo(data.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to fetch target";
      setTargetError(msg);
      setTargetInfo(null);
    } finally {
      setIsFetchingTarget(false);
    }
  }, [selectedPlanetId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (targetX && targetY) {
        fetchTarget(targetX, targetY);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [targetX, targetY, fetchTarget]);

  const fetchShips = useCallback(async () => {
    if (!selectedPlanetId) return;
    try {
      const { data } = await api.get(`/ships/ships?planetId=${selectedPlanetId}`);
      setAvailableShips(data.data.available || {});
      const newShips: ShipInventory[] = data.data.current || [];
      setCurrentShips(newShips);

      // Clamp existing user selection to new ship counts without wiping selection
      setSelectedShips((prev) => {
        const next: Record<string, number> = {};
        for (const [type, qty] of Object.entries(prev)) {
          if (qty > 0) {
            const availCount = newShips.find((s) => s.type === type)?.count || 0;
            next[type] = Math.min(qty, availCount);
          }
        }
        return next;
      });
    } catch (err) {
      console.error("Failed fetching ships", err);
    }
  }, [selectedPlanetId]);

  useEffect(() => {
    fetchShips();
  }, [fetchShips]);

  const handleShipQuantity = (type: string, val: string) => {
    const num = parseInt(val, 10);
    const max = currentShips.find((s) => s.type === type)?.count || 0;
    setSelectedShips((p) => ({
      ...p,
      [type]: isNaN(num) ? 0 : Math.min(Math.max(0, num), max),
    }));
  };

  const setMaxShipQuantity = (type: string) => {
    const max = currentShips.find((s) => s.type === type)?.count || 0;
    setSelectedShips((p) => ({ ...p, [type]: max }));
  };

  const handleDispatch = async () => {
    if (!canSend || isDispatching) return;
    setIsDispatching(true);
    setDispatchError(null);
    setDispatchSuccess(false);

    try {
      await api.post("/fleet/dispatch", {
        originId: selectedPlanet?.id || "",
        targetId: targetInfo?.id || "",
        missionType,
        ships: selectedShips,
      });
      setDispatchSuccess(true);
      setSelectedShips({});
      fetchShips();
      setTimeout(() => setDispatchSuccess(false), 5000);
    } catch (err: any) {
      setDispatchError(err.response?.data?.error || "Dispatch failed");
    } finally {
      setIsDispatching(false);
    }
  };

  if (!selectedPlanet) {
    return <div className="p-4 text-[#94a3b8]">Select a planet to open fleet command.</div>;
  }

  const anyShipsSelected = Object.values(selectedShips).some((v) => v > 0);
  const totalShipsSelected = Object.values(selectedShips).reduce((a, b) => a + b, 0);

  let minSpeed = Infinity;
  for (const [type, qty] of Object.entries(selectedShips)) {
    if (qty > 0) {
      const shipConfig = availableShips[type];
      const speed = shipConfig?.distancePerSecond;
      if (speed && speed < minSpeed) {
        minSpeed = speed;
      }
    }
  }

  const etaSeconds = targetInfo && minSpeed !== Infinity ? Math.ceil(targetInfo.distance / minSpeed) : 0;
  const canSend = targetInfo && missionType && anyShipsSelected;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white tracking-wide uppercase">Fleet Command</h1>

      {/* 1. Target Coordinates */}
      <div className="bg-[#1a1d24] border border-[#2a2e38] p-4 flex flex-col transition-colors hover:border-[#3b4252]">
        <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-3">
          1. Target Coordinates
        </h2>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="X"
              value={targetX}
              onChange={(e) => setTargetX(e.target.value)}
              className="bg-[#16181d] border border-[#2a2e38] rounded-none px-3 py-2 w-20 text-center text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00E5FF] transition-colors"
            />
            <input
              type="number"
              placeholder="Y"
              value={targetY}
              onChange={(e) => setTargetY(e.target.value)}
              className="bg-[#16181d] border border-[#2a2e38] rounded-none px-3 py-2 w-20 text-center text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00E5FF] transition-colors"
            />
          </div>

          <div className="flex-1 bg-[#16181d] border border-[#2a2e38] px-4 py-2 flex items-center min-h-[42px]">
            {isFetchingTarget ? (
              <span className="text-[#00E5FF] animate-pulse text-xs font-bold tracking-widest uppercase">Scanning...</span>
            ) : targetError ? (
              <span className="text-red-400 text-xs font-bold tracking-widest uppercase">{targetError}</span>
            ) : targetInfo ? (
              <div className="flex-1 flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{targetInfo.name}</span>
                  <span className="text-[10px] uppercase bg-[#2a2e38] px-2 py-0.5 text-[#94a3b8] tracking-widest font-bold">
                    {targetInfo.type}
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-[#94a3b8]">Dist: <span className="text-[#e2e8f0] font-mono">{targetInfo.distance}</span></span>
                  {targetInfo.owner && <span className="text-[#94a3b8]">Owner: <span className="text-[#e2e8f0]">{targetInfo.owner}</span></span>}
                </div>
              </div>
            ) : (
              <span className="text-[#64748b] text-xs font-bold tracking-widest uppercase">No target locked</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Mission Type */}
      <div className={`bg-[#1a1d24] border border-[#2a2e38] p-4 flex flex-col transition-opacity ${!targetInfo ? 'opacity-50 pointer-events-none' : 'hover:border-[#3b4252]'}`}>
        <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-3">
          2. Mission Type
        </h2>
        <div className="grid grid-cols-5 gap-2">
          <button
            className={`py-3 flex flex-col items-center justify-center gap-1 border transition-all ${
              missionType === 'ATTACK'
                ? 'bg-red-500/10 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-[#16181d] border-[#2a2e38] text-[#94a3b8] hover:border-red-500/50 hover:text-red-400'
            }`}
            disabled={targetInfo?.type !== 'planet' && targetInfo?.type !== 'wormhole'}
            onClick={() => setMissionType('ATTACK')}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Attack</span>
          </button>
          <button
            className={`py-3 flex flex-col items-center justify-center gap-1 border transition-all ${
              missionType === 'MINE'
                ? 'bg-[rgba(0,229,255,0.1)] border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                : 'bg-[#16181d] border-[#2a2e38] text-[#94a3b8] hover:border-[#00E5FF]/50 hover:text-[#00E5FF]'
            }`}
            disabled={targetInfo?.type !== 'asteroid'}
            onClick={() => setMissionType('MINE')}
          >
            <Pickaxe className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Mine</span>
          </button>
          <button
            className={`py-3 flex flex-col items-center justify-center gap-1 border transition-all ${
              missionType === 'EXPLORE'
                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                : 'bg-[#16181d] border-[#2a2e38] text-[#94a3b8] hover:border-indigo-500/50 hover:text-indigo-400'
            }`}
            disabled={targetInfo?.type !== 'anomaly'}
            onClick={() => setMissionType('EXPLORE')}
          >
            <MapIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Explore</span>
          </button>
          <button
            className={`py-3 flex flex-col items-center justify-center gap-1 border transition-all ${
              missionType === 'CONQUER'
                ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-[#16181d] border-[#2a2e38] text-[#94a3b8] hover:border-amber-500/50 hover:text-amber-400'
            }`}
            disabled={(targetInfo?.type !== 'planet' && targetInfo?.type !== 'wormhole') || (targetInfo?.owner === (selectedPlanet as any)?.ownerId && targetInfo?.owner !== undefined)}
            onClick={() => setMissionType('CONQUER')}
          >
            <Crown className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Conquer</span>
          </button>
          <button
            className={`py-3 flex flex-col items-center justify-center gap-1 border transition-all ${
              missionType === 'HOLD'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-[#16181d] border-[#2a2e38] text-[#94a3b8] hover:border-emerald-500/50 hover:text-emerald-400'
            }`}
            disabled={targetInfo?.type !== 'planet' && targetInfo?.type !== 'wormhole'}
            onClick={() => setMissionType('HOLD')}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Hold</span>
          </button>
        </div>
      </div>

      {/* 3. Fleet Composition */}
      <div className={`bg-[#1a1d24] border border-[#2a2e38] p-4 flex flex-col transition-opacity ${(!targetInfo || !missionType) ? 'opacity-50 pointer-events-none' : 'hover:border-[#3b4252]'}`}>
        <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-3">
          3. Fleet Composition
        </h2>
        
        {currentShips.length === 0 ? (
          <div className="bg-[#16181d] border border-[#2a2e38] p-4 text-[#64748b] text-xs font-bold tracking-widest uppercase text-center">
            No ships stationed here
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {currentShips.map((ship) => {
              const cfg = availableShips[ship.type];
              if (!cfg) return null;
              const q = selectedShips[ship.type] || 0;
              return (
                <div key={ship.type} className="bg-[#16181d] border border-[#2a2e38] p-2 flex flex-col">
                  <div className="flex gap-2 mb-2 items-center">
                    <img src={`/ships/${ship.type.toLowerCase()}.png`} alt={cfg.name} className="w-10 h-10 object-cover border border-[#2a2e38] shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[11px] font-bold text-white truncate">{cfg.name}</span>
                      <span className="text-[9px] text-[#00E5FF] tracking-widest uppercase truncate">Av: {ship.count}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-auto">
                    <input
                      type="number"
                      min="0"
                      max={ship.count}
                      value={q || ""}
                      onChange={(e) => handleShipQuantity(ship.type, e.target.value)}
                      className="w-full bg-[#1a1d24] border border-[#2a2e38] text-center text-xs text-[#e2e8f0] font-mono px-1 py-1 focus:outline-none focus:border-[#00E5FF]"
                    />
                    <button
                      onClick={() => setMaxShipQuantity(ship.type)}
                      className="px-2 bg-[#1a1d24] text-[#94a3b8] border border-[#2a2e38] hover:text-[#00E5FF] hover:border-[#00E5FF] text-[9px] font-bold tracking-widest uppercase transition-colors"
                    >
                      Max
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mission Summary & Dispatch */}
      <div className="bg-[#16181d] border border-[#00E5FF]/30 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1 items-center md:items-start w-full md:w-auto">
          <div className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase">Mission Summary</div>
          <div className="text-xs text-[#94a3b8]">
            {targetInfo && missionType ? (
              <span>Activating <strong className="text-white">{missionType}</strong> protocol for <strong className="text-white">{targetInfo.name}</strong></span>
            ) : (
              <span>Awaiting valid orders...</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-4 md:gap-6 w-full md:w-auto justify-center">
          <div className="text-center">
            <div className="text-[10px] text-[#64748b] tracking-widest uppercase font-bold mb-0.5">Fleet Size</div>
            <div className="text-sm text-white font-mono">{formatNumber(totalShipsSelected)}</div>
          </div>
          <div className="text-center md:mr-4">
            <div className="text-[10px] text-[#64748b] tracking-widest uppercase font-bold mb-0.5">Total ETA</div>
            <div className="text-sm text-[#00E5FF] font-mono">{etaSeconds > 0 && anyShipsSelected ? `${etaSeconds}s` : '--'}</div>
          </div>
          
          <button
            disabled={!canSend || isDispatching}
            onClick={handleDispatch}
            className={`px-6 py-2 text-[11px] font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
              canSend && !isDispatching
                ? 'bg-[rgba(0,229,255,0.1)] text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                : 'bg-[#1a1d24] text-[#64748b] border border-[#00E5FF]/30 cursor-not-allowed opacity-80'
            }`}
          >
            <Send className={`w-3.5 h-3.5 mr-2 inline ${isDispatching ? 'animate-pulse' : ''}`} /> 
            {isDispatching ? 'Dispatching...' : 'Dispatch'}
          </button>
        </div>
      </div>

      {dispatchError && (
        <div className="bg-red-500/10 border border-red-500/50 p-3 text-red-400 text-xs font-bold tracking-widest uppercase text-center">
          {dispatchError}
        </div>
      )}
      {dispatchSuccess && (
        <div className="bg-green-500/10 border border-green-500/50 p-3 text-green-400 text-xs font-bold tracking-widest uppercase text-center">
          Fleet dispatched successfully!
        </div>
      )}
    </div>
  );
}
