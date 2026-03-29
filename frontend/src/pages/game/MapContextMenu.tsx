import { Crosshair, Info, Pickaxe, ShieldAlert } from "lucide-react";
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
  onMiningStarted?: (targetId: string, usedMiners: number) => void;
  onClose?: () => void;
}

export function MapContextMenu({ object, onMiningStarted }: MapContextMenuProps) {
  const map = useMap();
  const navigate = useNavigate();
  const { selectedPlanet } = useGame();
  const isAsteroid = object.type === "asteroid";

  const [resources, setResources] = useState({
    titanium: object.titanium || 0,
    silicate: object.silicate || 0,
    isotope: object.isotope || 0,
  });

  const [minersAvailable, setMinersAvailable] = useState<number | null>(null);
  const [minerCapacity, setMinerCapacity] = useState<number>(1000);

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
    if (isAsteroid && selectedPlanet) {
      api
        .get(`/ships/ships?planetId=${selectedPlanet.id}`)
        .then((res) => {
          const data = res.data.data;
          const ships = data.current;
          const miner = ships.find((s: any) => s.type === "MINER");
          setMinersAvailable(miner ? miner.count : 0);

          const availableModels = data.available;
          if (availableModels && availableModels["MINER"]) {
            setMinerCapacity(availableModels["MINER"].capacity || 1000);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [isAsteroid, selectedPlanet]);

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
    }
  };

  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <div className="w-full">
          <h3 className={`font-bold text-lg m-0 ${object.color}`}>
            {isAsteroid ? "Asteroid" : object.name}
          </h3>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-zinc-400 capitalize m-0">
              {object.type} {object.owner ? `• ${object.owner}` : ""}
            </p>
            <p className="text-xs font-mono text-zinc-500 m-0">
              [{object.x}, {object.y}]
            </p>
          </div>

          {isAsteroid && (
            <div className="mt-4 flex gap-1 bg-zinc-900/50 p-2 border border-zinc-800/50">
              {[
                {
                  label: "titanium",
                  icon: TitaniumIcon,
                  val: resources.titanium,
                },
                {
                  label: "silicate",
                  icon: SilicateIcon,
                  val: resources.silicate,
                },
                { label: "isotope", icon: IsotopeIcon, val: resources.isotope },
              ].map((res) => (
                <div
                  key={res.label}
                  className="flex-1 flex flex-col items-center"
                >
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
        </div>
      </div>

      <div
        className={`grid gap-2 mt-4 ${isAsteroid ? "grid-cols-2" : "grid-cols-2"}`}
      >
        {isAsteroid ? (
          <>
            <button
              onClick={() =>
                navigate(
                  `/fleet?action=MINE&targetX=${object.x}&targetY=${object.y}`,
                )
              }
              className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group"
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
              className="flex flex-col items-center justify-center bg-[#00E5FF]/5 border border-[#00E5FF]/50 rounded-lg p-2 transition-colors group text-[#00E5FF] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#00E5FF]/20 relative"
            >
              <Pickaxe className="w-5 h-5 mb-1 text-[#00E5FF]" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#00E5FF]">
                Send {validToSend} MINERs
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
            <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group">
              <Info className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-xs text-zinc-300">Details</span>
            </button>
            <button
              onClick={() =>
                navigate(
                  `/fleet?action=MINE&targetX=${object.x}&targetY=${object.y}`,
                )
              }
              className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group"
            >
              <Pickaxe className="w-5 h-5 mb-1 text-zinc-400" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">
                Mine
              </span>
            </button>
            <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group opacity-50 cursor-not-allowed">
              <Crosshair className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">
                Attack
              </span>
            </button>
            <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group opacity-50 cursor-not-allowed">
              <ShieldAlert className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">
                Scan
              </span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
