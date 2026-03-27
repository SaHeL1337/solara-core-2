import { Crosshair, Info, Pickaxe, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/utils";

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
  onClose?: () => void;
}

export function MapContextMenu({ object }: MapContextMenuProps) {
  const navigate = useNavigate();
  const isAsteroid = object.type === "asteroid";

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
                { label: "titanium", icon: TitaniumIcon, val: object.titanium || 5000 },
                { label: "silicate", icon: SilicateIcon, val: object.silicate || 3500 },
                { label: "isotope", icon: IsotopeIcon, val: object.isotope || 1200 },
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
        </div>
      </div>

      <div className={`grid gap-2 mt-4 ${isAsteroid ? "grid-cols-1" : "grid-cols-2"}`}>
        {isAsteroid ? (
          <button
            onClick={() => navigate(`/fleet?action=MINE&targetX=${object.x}&targetY=${object.y}`)}
            className="flex flex-col items-center justify-center bg-[#00E5FF]/5 border border-[#00E5FF]/50 rounded-lg p-3 transition-colors group text-[#00E5FF]"
          >
            <Pickaxe className="w-5 h-5 mb-1 text-[#00E5FF]" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#00E5FF]">
              Mine Asteroid
            </span>
          </button>
        ) : (
          <>
            <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group">
              <Info className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-xs text-zinc-300">Details</span>
            </button>
            <button
              onClick={() => navigate(`/fleet?action=MINE&targetX=${object.x}&targetY=${object.y}`)}
              className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group"
            >
              <Pickaxe className="w-5 h-5 mb-1 text-zinc-400" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">
                Mine
              </span>
            </button>
            <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group opacity-50 cursor-not-allowed">
              <Crosshair className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">Attack</span>
            </button>
            <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group opacity-50 cursor-not-allowed">
              <ShieldAlert className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-300">Scan</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
