import { Crosshair, Info, Navigation, ShieldAlert } from "lucide-react";

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
};

interface MapContextMenuProps {
  object: SpaceObject;
  position?: { x: number; y: number };
  onClose?: () => void;
}

export function MapContextMenu({ object }: MapContextMenuProps) {
  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`font-bold text-lg m-0 ${object.color}`}>
            {object.name}
          </h3>
          <p className="text-xs text-zinc-400 capitalize m-0 mt-1">
            {object.type} {object.owner ? `• ${object.owner}` : ""}
          </p>
          <p className="text-xs font-mono text-zinc-500 m-0 mt-1">
            [{object.x}, {object.y}]
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group">
          <Info className="w-5 h-5 text-zinc-400 mb-1" />
          <span className="text-xs text-zinc-300">Details</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group">
          <Navigation className="w-5 h-5 text-zinc-400 mb-1" />
          <span className="text-xs text-zinc-300">Navigate</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group">
          <Crosshair className="w-5 h-5 text-zinc-400 mb-1" />
          <span className="text-xs text-zinc-300">Attack</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg p-2 transition-colors group">
          <ShieldAlert className="w-5 h-5 text-zinc-400 mb-1" />
          <span className="text-xs text-zinc-300">Scan</span>
        </button>
      </div>
    </>
  );
}
