import { useState, useEffect, useCallback } from "react";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { Target, Pickaxe, Map as MapIcon, Send } from "lucide-react";

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
  
  const [targetX, setTargetX] = useState<string>("");
  const [targetY, setTargetY] = useState<string>("");
  const [targetInfo, setTargetInfo] = useState<SpaceObjectTarget | null>(null);
  const [isFetchingTarget, setIsFetchingTarget] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);

  const [missionType, setMissionType] = useState<"ATTACK" | "MINE" | "EXPLORE" | null>(null);

  const [availableShips, setAvailableShips] = useState<Record<string, any>>({});
  const [currentShips, setCurrentShips] = useState<ShipInventory[]>([]);
  const [selectedShips, setSelectedShips] = useState<Record<string, number>>({});

  const fetchTarget = useCallback(async () => {
    if (!selectedPlanet || !targetX || !targetY) return;
    setIsFetchingTarget(true);
    setTargetError(null);
    setTargetInfo(null);
    setMissionType(null);
    try {
      const endpoint = `/map/target?x=${targetX}&y=${targetY}&originPlanetId=${selectedPlanet.id}`;
      const { data } = await api.get(endpoint);
      setTargetInfo(data.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to fetch target";
      setTargetError(msg);
    } finally {
      setIsFetchingTarget(false);
    }
  }, [targetX, targetY, selectedPlanet]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (targetX && targetY) {
        fetchTarget();
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [targetX, targetY, fetchTarget]);

  const fetchShips = useCallback(async () => {
    if (!selectedPlanet) return;
    try {
      const { data } = await api.get(`/ships/ships?planetId=${selectedPlanet.id}`);
      setAvailableShips(data.data.available);
      setCurrentShips(data.data.current);
    } catch (err) {
      console.error("Failed fetching ships", err);
    }
  }, [selectedPlanet]);

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

  if (!selectedPlanet) {
    return <div className="p-4 text-slate-300">Select a planet to open fleet command.</div>;
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Fleet Command</h1>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader><CardTitle>1. Target Coordinates</CardTitle></CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
          <div className="flex gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">X Coordinate</label>
              <input type="number" value={targetX} onChange={(e) => setTargetX(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 w-24 text-center focus:outline-none focus:border-blue-500 font-mono" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">Y Coordinate</label>
              <input type="number" value={targetY} onChange={(e) => setTargetY(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 w-24 text-center focus:outline-none focus:border-blue-500 font-mono" />
            </div>
          </div>
          <div className="flex-1 bg-slate-950/50 rounded border border-slate-800 p-4 min-h-[5rem] flex items-center">
            {isFetchingTarget ? <span className="text-slate-400 animate-pulse">Scanning sector...</span>
            : targetError ? <span className="text-red-400">{targetError}</span>
            : targetInfo ? (
              <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-lg text-blue-300">{targetInfo.name}</span>
                  <span className="text-xs uppercase bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">{targetInfo.type}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Distance: <span className="text-slate-200">{targetInfo.distance} ly</span></span>
                  {targetInfo.owner && <span>Owner: <span className="text-slate-200">{targetInfo.owner}</span></span>}
                </div>
              </div>
            ) : <span className="text-slate-500 italic">Enter coordinates to lock target</span>}
          </div>
        </CardContent>
      </Card>

      <Card className={`bg-slate-900 border-slate-800 text-slate-100 transition-opacity ${!targetInfo ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader><CardTitle>2. Mission Type</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className={`h-24 flex flex-col gap-2 border-slate-700 hover:bg-slate-800 hover:text-white ${missionType === 'ATTACK' ? 'bg-red-900/50 border-red-500 text-red-100' : 'bg-slate-950'}`} disabled={targetInfo?.type !== 'planet'} onClick={() => setMissionType('ATTACK')}>
              <Target className="w-8 h-8 mb-1" />Attack Planet
            </Button>
            <Button variant="outline" className={`h-24 flex flex-col gap-2 border-slate-700 hover:bg-slate-800 hover:text-white ${missionType === 'MINE' ? 'bg-amber-900/50 border-amber-500 text-amber-100' : 'bg-slate-950'}`} disabled={targetInfo?.type !== 'asteroid'} onClick={() => setMissionType('MINE')}>
              <Pickaxe className="w-8 h-8 mb-1" />Mining Expedition
            </Button>
            <Button variant="outline" className={`h-24 flex flex-col gap-2 border-slate-700 hover:bg-slate-800 hover:text-white ${missionType === 'EXPLORE' ? 'bg-indigo-900/50 border-indigo-500 text-indigo-100' : 'bg-slate-950'}`} disabled={targetInfo?.type !== 'anomaly'} onClick={() => setMissionType('EXPLORE')}>
              <MapIcon className="w-8 h-8 mb-1" />Explore Anomaly
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={`bg-slate-900 border-slate-800 text-slate-100 transition-opacity ${(!targetInfo || !missionType) ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader><CardTitle>3. Fleet Composition</CardTitle></CardHeader>
        <CardContent>
          {currentShips.length === 0 ? (
            <div className="text-slate-400 p-4 bg-slate-950 rounded border border-slate-800 text-center">No ships stationed here.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {currentShips.map((ship) => {
                const cfg = availableShips[ship.type];
                if (!cfg) return null;
                const q = selectedShips[ship.type] || 0;
                return (
                  <div key={ship.type} className="flex flex-col bg-slate-950 border border-slate-800 p-3 rounded">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-blue-200">{cfg.name}</span>
                      <span className="text-sm bg-slate-800 px-2 py-0.5 rounded text-slate-300">Avail: {ship.count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max={ship.count} value={q || ""} onChange={(e) => handleShipQuantity(ship.type, e.target.value)} className="bg-slate-900 border border-slate-700 w-full rounded px-2 py-1 text-slate-100 font-mono text-center focus:outline-none focus:border-blue-500" />
                      <Button variant="secondary" size="sm" onClick={() => setMaxShipQuantity(ship.type)} className="bg-slate-800 hover:bg-slate-700 text-slate-300">Max</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-950 border-blue-900/50 text-slate-100">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-blue-300">Mission Summary</h3>
            <div className="text-sm text-slate-400">
              {targetInfo && missionType ? <span>Mission <strong className="text-white">{missionType}</strong> to <strong className="text-white">{targetInfo.name}</strong></span> : <span>Awaiting orders...</span>}
            </div>
            <div className="flex gap-4 mt-2">
              <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-800"><span className="text-xs text-slate-500 block">Fleet Size</span><span className="font-mono text-lg">{formatNumber(totalShipsSelected)}</span></div>
              <div className="bg-slate-900 px-3 py-1.5 rounded border border-slate-800"><span className="text-xs text-slate-500 block">Travel Time</span><span className="font-mono text-lg">{etaSeconds > 0 && anyShipsSelected ? `${etaSeconds}s` : '--'}</span></div>
            </div>
          </div>
          <Button size="lg" disabled={!canSend} className={`font-bold px-8 py-6 text-lg transition-all ${canSend ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
            <Send className="w-5 h-5 mr-2" /> Dispatch
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
