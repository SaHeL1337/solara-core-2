import React, { useState } from "react";

const getFinishTimeString = (finishTimeMs: number) => {
  const finishDate = new Date(finishTimeMs);
  const now = new Date();
  const isSameDay =
    finishDate.getDate() === now.getDate() &&
    finishDate.getMonth() === now.getMonth() &&
    finishDate.getFullYear() === now.getFullYear();

  const timeStr = finishDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (!isSameDay) {
    const dateStr = finishDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return `${dateStr} ${timeStr}`;
  }
  return timeStr;
};

const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

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
  const [isExpanded, setIsExpanded] = useState(false);

  if (queue.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-4">
        Shipyard Construction Queue ({queue.length})
      </h2>
      <div className="flex flex-col gap-4 mb-4">
        {queue.map((q, idx) => {
          const config = availableShips[q.shipType];
          const shipName = config ? config.name : q.shipType;
          const isActive = q.status === "BUILDING";
          const isFirst = idx === 0;
          const imgPath = `/ships/${q.shipType.toLowerCase()}.png`;

          let progress = 0;
          let timeRemaining = "";
          let finishTimeString = "";

          if (q.startedAt) {
            const start = new Date(q.startedAt).getTime();
            const elapsedSec = Math.floor((now - start) / 1000);

            // Time remaining for ALL remaining ships in this queue order
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

            timeRemaining = formatTime(totalRemSec);

            // Compute cumulative duration for earlier queue items to find true finish base
            // For Shipyard it's tricky since elapsedSec is only meaningful for first item.

            // To be accurate across all queue items:
            const totalDurationSoFar = queue
              .slice(0, idx + 1)
              .reduce((acc, curr) => {
                // For the currently active one, we only count its remaining time
                if (curr.status === "BUILDING") {
                  const currStart = new Date(curr.startedAt).getTime();
                  const curElapsed = Math.floor((now - currStart) / 1000);
                  const remShips = curr.quantity - curr.completedCount;
                  const tInCurr = curElapsed % curr.durationSec;
                  return Math.max(0, remShips * curr.durationSec - tInCurr);
                }
                return acc + curr.quantity * curr.durationSec;
              }, 0);

            const startBase = now;
            const finishTimeMs = startBase + totalDurationSoFar * 1000;
            finishTimeString = getFinishTimeString(finishTimeMs);

            // For waiting queues, recalculate timeRemaining simply using full duration
            if (!isActive) {
              timeRemaining = formatTime(q.quantity * q.durationSec);
            }
          } else {
            timeRemaining = formatTime(q.quantity * q.durationSec);

            const totalDurationSoFar = queue
              .slice(0, idx + 1)
              .reduce((acc, curr) => {
                if (curr.status === "BUILDING" && curr.startedAt) {
                  const currStart = new Date(curr.startedAt).getTime();
                  const curElapsed = Math.floor((now - currStart) / 1000);
                  const remShips = curr.quantity - curr.completedCount;
                  const tInCurr = curElapsed % curr.durationSec;
                  return (
                    acc + Math.max(0, remShips * curr.durationSec - tInCurr)
                  );
                }
                return acc + curr.quantity * curr.durationSec;
              }, 0);

            const finishTimeMs = now + totalDurationSoFar * 1000;
            finishTimeString = getFinishTimeString(finishTimeMs);
          }

          if (isFirst) {
            return (
              <React.Fragment key={q.id || idx}>
                <div
                  className="flex-1 bg-[#16181d] border-l-2 border-[#00E5FF] p-4 shadow-lg flex items-center gap-6"
                >
                <img
                  src={imgPath}
                  alt={shipName}
                  className="w-16 h-16 object-cover border border-[#2a2e38]"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-lg font-bold text-white mb-1">
                        {shipName}
                      </div>
                      <div className="text-xs text-[#94a3b8]">
                        Building #{q.completedCount + 1}
                      </div>
                    </div>
                    <div className="px-2 py-1 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] uppercase tracking-widest font-bold">
                      {q.completedCount} / {q.quantity}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-[#00E5FF] font-mono">
                        {progress.toFixed(1)}%
                      </span>
                      <span className="text-[#e2e8f0] font-mono">
                        {timeRemaining}{" "}
                        {finishTimeString && (
                          <span className="text-[#64748b]">
                            ({finishTimeString})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#1e2028] overflow-hidden">
                      <div
                        className="h-full bg-[#00E5FF] transition-all duration-1000 ease-linear shadow-[0_0_10px_#00E5FF]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {queue.length > 1 && (
                <div
                  className="flex items-center justify-between bg-[#1a1d24] border border-[#2a2e38] p-3 cursor-pointer hover:border-[#00E5FF]/50 transition-colors group"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider whitespace-nowrap">
                      {queue.length - 1} Queued Orders
                    </span>
                    {!isExpanded && (
                      <div
                        className="flex items-center gap-2 overflow-hidden flex-nowrap"
                        style={{
                          maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
                          WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)",
                        }}
                      >
                        {queue.slice(1).map((waitQ, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 bg-[#16181d] px-2 py-1 border border-[#2a2e38] rounded-sm shrink-0"
                          >
                            <img
                              src={`/ships/${waitQ.shipType.toLowerCase()}.png`}
                              alt={waitQ.shipType}
                              className="w-4 h-4 object-cover"
                            />
                            <span className="text-[10px] text-[#00E5FF] font-mono leading-none">
                              {waitQ.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-[#00E5FF] px-2 text-[10px] tracking-widest font-bold uppercase flex items-center gap-2 shrink-0">
                    {isExpanded ? "Collapse ▲" : "Expand ▼"}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        }

        if (!isExpanded) return null;

        // Waiting Queue Blocks
        return (
            <div
              key={q.id || idx}
              className="flex-1 bg-[#1a1d24] border border-[#2a2e38] p-4 flex items-center gap-6 opacity-70"
            >
              <img
                src={imgPath}
                alt={shipName}
                className="w-16 h-16 object-cover border border-[#2a2e38]"
              />
              <div className="flex-1 flex justify-between items-start">
                <div>
                  <div className="text-sm font-bold text-white mb-1">
                    {shipName}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="px-2 py-1 bg-[#2a2e38] text-[#94a3b8] text-[10px] uppercase tracking-widest font-bold">
                    {q.quantity}
                  </div>
                  <div className="text-[#64748b] text-[10px] font-mono">
                    {timeRemaining} | {finishTimeString}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
