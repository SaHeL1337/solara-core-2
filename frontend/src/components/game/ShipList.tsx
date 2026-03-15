import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type ShipConfig = {
  name: string;
  description: string;
  cost: Record<string, number>;
  requirements: Record<string, number>;
  buildTimeInSeconds: number;
  meetsRequirements: boolean;
};

type ShipListProps = {
  availableShips: Record<string, ShipConfig>;
  currentShips?: any[];
  onQueueShips: (type: string, quantity: number) => void;
  isQueueing: boolean;
};

export default function ShipList({
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
      <h2 className="text-xl font-bold text-slate-100 mb-4">Available Ships</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(availableShips).map(([type, config]) => {
          const qty = quantities[type] || 1;
          const buildTime = config.buildTimeInSeconds;

          const meetsReqs = config.meetsRequirements;
          const currentCount = getShipCount(type);

          return (
            <Card
              key={type}
              className={`bg-slate-900 border-slate-800 text-slate-100 flex flex-col ${!meetsReqs ? "opacity-60 grayscale-[50%]" : ""}`}
            >
              <CardHeader className="pb-2 relative">
                <CardTitle className="flex justify-between items-center">
                  <span>{config.name}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700">
                    Owned: {formatNumber(currentCount)}
                  </span>
                </CardTitle>
                <div className="text-xs text-slate-400 italic mt-1">
                  {config.description}
                </div>
                {!meetsReqs && (
                  <div className="absolute top-2 right-2 text-xs bg-red-900/50 text-red-300 border border-red-800 px-2 py-1 rounded">
                    Requirements Not Met
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-col flex-1 mt-2">
                <div className="grid grid-cols-2 gap-2 text-sm mb-4 bg-slate-950 p-3 rounded border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">
                      Build Time (each)
                    </span>
                    <span>{formatNumber(buildTime)}s</span>
                  </div>
                </div>

                <div className="flex flex-col text-sm mb-4 space-y-1">
                  <span className="text-slate-500 text-xs text-center mb-1 border-b border-slate-800 pb-1">
                    Cost per Unit
                  </span>
                  <div className="flex justify-evenly text-amber-200/90 font-mono text-xs mt-1">
                    {Object.entries(config.cost).map(([res, val]) =>
                      val > 0 ? (
                        <span key={res} className="capitalize">
                          {formatNumber(val)} {res}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>

                <div className="flex flex-col text-sm mb-4 space-y-1">
                  <span className="text-slate-500 text-xs text-center mb-1 border-b border-slate-800 pb-1">
                    Total Cost for {qty} Ships
                  </span>
                  <div className="flex justify-evenly text-amber-200/90 font-mono text-xs mt-1">
                    {Object.entries(config.cost).map(([res, val]) =>
                      val > 0 ? (
                        <span key={res} className="capitalize">
                          {formatNumber(val * qty)} {res}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>

                {!meetsReqs && (
                  <div className="text-xs text-red-400 mt-2 mb-4 bg-red-950/30 p-2 rounded -mx-1">
                    Requires:{" "}
                    {Object.entries(config.requirements)
                      .map(([reqType, reqLvl]) => `${reqType} Lv. ${reqLvl}`)
                      .join(", ")}
                  </div>
                )}

                <div className="mt-auto pt-2 grid grid-cols-[1fr,2fr] gap-2">
                  <input
                    type="number"
                    min="1"
                    className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-center text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={quantities[type] || ""}
                    placeholder="1"
                    onChange={(e) => handleQuantityChange(type, e.target.value)}
                    disabled={!meetsReqs || isQueueing}
                  />
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-all disabled:opacity-50"
                    onClick={() => onQueueShips(type, qty)}
                    disabled={!meetsReqs || isQueueing || qty < 1}
                  >
                    Build
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
