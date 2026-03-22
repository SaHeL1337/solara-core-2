import { Card, CardContent } from "@/components/ui/card";

type ShipQueueListProps = {
  queue: any[];
  availableShips: Record<string, any>;
  now: number;
};

export default function ShipQueueList({
  queue,
  availableShips,
  now,
}: ShipQueueListProps) {
  if (queue.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-slate-100 mb-4">
        Shipyard Construction Queue ({queue.length})
      </h2>
      <div className="flex flex-col gap-3">
        {queue.map((q) => {
          const config = availableShips[q.shipType];
          const shipName = config ? config.name : q.shipType;
          const isActive = q.status === "BUILDING";

          let progress = 0;
          let timeRemaining = "";
          

          if (isActive && q.startedAt) {
            const start = new Date(q.startedAt).getTime();
            const elapsedSec = Math.floor((now - start) / 1000);

            // The time remaining represents the time to finish ALL remaining ships in this queue order
            const remainingShips = q.quantity - q.completedCount;
            // The time already spent on the current partial ship
            const timeInCurrentShip = elapsedSec % q.durationSec;

            // percentage progress of the *current single ship*
            progress = Math.min(
              100,
              Math.max(0, (timeInCurrentShip / q.durationSec) * 100),
            );

            const totalRemSec = Math.max(
              0,
              remainingShips * q.durationSec - timeInCurrentShip,
            );

            const hours = Math.floor(totalRemSec / 3600);
            const m = Math.floor((totalRemSec % 3600) / 60);
            const s = totalRemSec % 60;
            timeRemaining = hours > 0 ? `${hours}h ${m}m ${s}s` : `${m}m ${s}s`;
          }

          return (
            <Card
              key={q.id}
              className={`bg-slate-800 border-slate-700 text-slate-200 ${
                isActive
                  ? "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                  : ""
              }`}
            >
              <CardContent className="p-4 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-100">
                      {shipName} x{q.quantity}
                    </div>
                    <div className="text-sm text-slate-400">
                      {q.completedCount} / {q.quantity} Completed
                    </div>
                  </div>
                  <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700 text-amber-400">
                    {q.status}
                  </div>
                </div>

                {isActive && q.startedAt && (
                  <div className="mt-2 text-xs">
                    <div className="flex justify-between text-slate-400 mb-1 font-mono">
                      <span>
                        Building #{q.completedCount + 1} ({progress.toFixed(1)}
                        %)
                      </span>
                      <span className="text-blue-300">
                        Total left: {timeRemaining}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-700 overflow-hidden relative">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
