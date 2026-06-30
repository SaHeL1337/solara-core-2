import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useGame } from "@/context/GameContext";
import { formatTime, formatNumber } from "@/lib/utils";
import { Settings, Coins, Swords, Shield, Rocket, ChevronRight, CheckCircle2 } from "lucide-react";
import { FluxIcon } from "@/components/ui/icons";
import Xarrow, { Xwrapper } from "react-xarrows";
import { CLASSES } from "./PlayerSetup";

type TechtreeNode = {
  name: string;
  description: string;
  benefits: string;
  costFlux: number;
  buildTimeInSeconds: number;
  requirements: string[];
  classes: string[];
  icon: string;
};

type QueueItem = {
  id: string;
  nodeId: string;
  status: string;
  durationSec: number;
  startedAt: string;
  finishedAt: string;
};

export default function Techtree() {
  const { user, refreshUser } = useGame();
  const [nodes, setNodes] = useState<Record<string, TechtreeNode>>({});
  const [researched, setResearched] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [playerClass, setPlayerClass] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());
  const lastFetchTriggerRef = useRef<number>(0);

  const fetchTechtree = async () => {
    try {
      const { data } = await api.get("/techtree");
      setNodes(data.nodes);
      setResearched(data.researched);
      setQueue(data.queue);
      setPlayerClass(data.playerClass);
    } catch (err) {
      console.error("Failed to fetch techtree", err);
    }
  };

  useEffect(() => {
    fetchTechtree();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (queue.length > 0 && queue[0].startedAt) {
      const q = queue[0];
      const start = new Date(q.startedAt).getTime();
      const elapsedSec = Math.floor((now - start) / 1000);

      if (
        elapsedSec === q.durationSec ||
        (elapsedSec > q.durationSec && elapsedSec % 5 === 0)
      ) {
        if (lastFetchTriggerRef.current !== elapsedSec) {
          lastFetchTriggerRef.current = elapsedSec;
          fetchTechtree();
          refreshUser();
        }
      }
    }
  }, [now, queue, refreshUser]);

  const handleResearch = async (nodeId: string) => {
    try {
      await api.post("/techtree/research", { nodeId });
      await fetchTechtree();
      await refreshUser();
    } catch (err) {
      console.error("Failed to research", err);
    }
  };

  const renderIcon = (iconName: string, className: string = "size-6") => {
    switch (iconName) {
      case "Settings": return <Settings className={className} />;
      case "Coins": return <Coins className={className} />;
      case "Swords": return <Swords className={className} />;
      case "Shield": return <Shield className={className} />;
      default: return <Rocket className={className} />;
    }
  };

  const getFinishTimeString = (finishTimeMs: number) => {
    const finishDate = new Date(finishTimeMs);
    const nowObj = new Date();
    const isSameDay =
      finishDate.getDate() === nowObj.getDate() &&
      finishDate.getMonth() === nowObj.getMonth() &&
      finishDate.getFullYear() === nowObj.getFullYear();
    const timeStr = finishDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (!isSameDay) {
      const dateStr = finishDate.toLocaleDateString([], { month: "short", day: "numeric" });
      return `${dateStr} ${timeStr}`;
    }
    return timeStr;
  };

  const renderActiveResearch = () => {
    if (queue.length === 0) return null;
    const q = queue[0];
    const nodeConfig = nodes[q.nodeId];
    if (!nodeConfig) return null;

    const start = new Date(q.startedAt).getTime();
    const finishTimeMs = start + q.durationSec * 1000;
    const elapsedSec = Math.floor((now - start) / 1000);
    const progress = Math.min(100, Math.max(0, (elapsedSec / q.durationSec) * 100));
    const remSec = Math.max(0, q.durationSec - elapsedSec);

    return (
      <div className="mb-8">
        <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-4">
          Active Research
        </h2>
        <div className="flex-1 bg-[#16181d] border-l-2 border-[#00E5FF] p-4 shadow-lg flex items-center gap-6">
          <div className="w-16 h-16 bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/30 text-[#00E5FF]">
            {renderIcon(nodeConfig.icon, "size-8")}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-4">
              <div className="text-lg font-bold text-white mb-1">
                {nodeConfig.name}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[#00E5FF] font-mono">{progress.toFixed(1)}%</span>
                <span className="text-[#e2e8f0] font-mono">
                  {formatTime(remSec)}{" "}
                  <span className="text-[#64748b]">({getFinishTimeString(finishTimeMs)})</span>
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
      </div>
    );
  };

  // Group nodes into tiers for dependency arrows
  const tiers: string[][] = [];
  const placed = new Set<string>();

  if (Object.keys(nodes).length > 0) {
    let keepGoing = true;
    while (keepGoing) {
      const currentTier: string[] = [];
      Object.entries(nodes).forEach(([id, node]) => {
        if (!placed.has(id)) {
          const reqsMet = node.requirements.every(req => placed.has(req));
          if (reqsMet) {
            currentTier.push(id);
          }
        }
      });
      if (currentTier.length > 0) {
        tiers.push(currentTier);
        currentTier.forEach(id => placed.add(id));
      } else {
        keepGoing = false;
        // Dump the rest (unreachable/cycles)
        const remainder = Object.keys(nodes).filter(id => !placed.has(id));
        if (remainder.length > 0) {
           tiers.push(remainder);
        }
      }
    }
  }

  return (
    <div className="space-y-8 flex gap-8">
      <div className="flex-1 min-w-0">
        
        {/* Class Core Benefits Panel */}
        <div className="mb-8 bg-[#1a1d24] border border-[#2a2e38] p-6 shadow-md relative overflow-hidden">
           <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-4">
             Class Core Benefits
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {CLASSES.map((cls) => {
               const isMyClass = cls.id === playerClass;
               const Icon = cls.icon;
               return (
                 <div key={cls.id} className={`p-4 border ${isMyClass ? 'bg-[#16181d] border-[#00E5FF]/50 shadow-[0_0_15px_rgba(0,229,255,0.1)]' : 'bg-[#111317] border-[#1e2028] opacity-60'}`}>
                   <div className="flex items-center gap-3 mb-3">
                     <div className={`p-2 border ${isMyClass ? 'bg-[#00E5FF]/10 border-[#00E5FF]/30' : 'bg-[#1a1d24] border-[#2a2e38]'}`}>
                        <Icon className={`w-4 h-4 ${isMyClass ? 'text-[#00E5FF]' : 'text-[#64748b]'}`} />
                     </div>
                     <div>
                       <h3 className={`text-sm font-bold tracking-wide ${isMyClass ? 'text-white' : 'text-[#94a3b8]'}`}>{cls.name}</h3>
                       {!isMyClass && <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">Unobtainable</span>}
                       {isMyClass && <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">Your Class</span>}
                     </div>
                   </div>
                   <div className="space-y-1">
                     {cls.benefits?.map((benefit, i) => (
                       <div key={i} className={`text-xs font-mono ${isMyClass ? 'text-[#00E5FF]' : 'text-[#64748b]'}`}>
                         + {benefit}
                       </div>
                     ))}
                   </div>
                 </div>
               )
             })}
           </div>
        </div>

        {renderActiveResearch()}

        <h2 className="text-[11px] font-bold text-[#00E5FF] tracking-widest uppercase mb-4">
          Technology Tree
        </h2>

        {/* Techtree Map with Arrows */}
        <div className="bg-[#111317] border border-[#1e2028] p-8 overflow-x-auto">
          <Xwrapper>
            <div className="flex gap-16 min-w-max">
              {tiers.map((tierNodes, tierIdx) => (
                <div key={tierIdx} className="flex flex-col gap-8 justify-center min-w-[280px]">
                  {tierNodes.map((id) => {
                    const node = nodes[id];
                    const isResearched = researched.includes(id);
                    const isResearching = queue.some(q => q.nodeId === id);
                    const isWrongClass = node.classes && node.classes.length > 0 && !node.classes.includes(playerClass);
                    
                    // Check requirements
                    const meetsReqs = node.requirements.every(req => researched.includes(req));
                    const canAfford = user && user.flux >= node.costFlux;
                    const canResearch = !isResearched && !isResearching && meetsReqs && canAfford && queue.length === 0 && !isWrongClass;

                    let stateStyle = "bg-[#1a1d24] border-[#2a2e38]";
                    let textStyle = "text-white";
                    
                    if (isWrongClass) {
                      stateStyle = "bg-[#111317] border-[#1e2028] opacity-50";
                      textStyle = "text-slate-500";
                    } else if (isResearched) {
                      stateStyle = "bg-[#16181d] border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]";
                      textStyle = "text-green-400";
                    } else if (isResearching) {
                      stateStyle = "bg-[#16181d] border-[#00E5FF]/50 shadow-[0_0_10px_rgba(0,229,255,0.1)]";
                      textStyle = "text-[#00E5FF]";
                    } else if (!meetsReqs) {
                      stateStyle = "bg-[#111317] border-[#1e2028] opacity-50";
                      textStyle = "text-slate-500";
                    }

                    return (
                      <div 
                        id={`node-${id}`}
                        key={id} 
                        className={`border p-4 transition-all cursor-pointer hover:border-[#3b4252] flex flex-col ${stateStyle} ${selectedNodeId === id ? 'ring-2 ring-[#00E5FF] ring-offset-2 ring-offset-[#0a0b0e]' : ''}`}
                        onClick={() => setSelectedNodeId(id)}
                        style={{ width: '280px' }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className={`w-10 h-10 flex items-center justify-center border shrink-0 ${isResearched ? 'bg-green-500/10 border-green-500/30' : 'bg-[#16181d] border-[#2a2e38]'}`}>
                             {renderIcon(node.icon, isResearched ? "size-5 text-green-400" : isWrongClass ? "size-5 text-slate-500" : "size-5 text-[#94a3b8]")}
                          </div>
                          {isResearched && <div className="text-[9px] font-bold uppercase tracking-widest text-green-500">Researched</div>}
                          {isResearching && <div className="text-[9px] font-bold uppercase tracking-widest text-[#00E5FF] animate-pulse">Researching</div>}
                          {isWrongClass && <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Locked Class</div>}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-sm font-bold mb-1 truncate ${textStyle}`}>{node.name}</h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-yellow-400 font-mono mt-2">
                            <FluxIcon className="size-3" /> {formatNumber(node.costFlux)} Flux
                          </div>
                        </div>
                        
                        {!isResearched && !isResearching && !isWrongClass && (
                          <div className="mt-3 pt-3 border-t border-[#2a2e38]">
                            <button
                              disabled={!canResearch}
                              onClick={(e) => { e.stopPropagation(); handleResearch(id); }}
                              className={`w-full py-2 text-[9px] tracking-widest uppercase transition-all ${canResearch
                                ? "bg-[rgba(0,229,255,0.1)] text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                                : "bg-[#16181d] text-[#64748b] border border-[#2a2e38] cursor-not-allowed"
                                }`}
                            >
                              {meetsReqs ? (canAfford ? "Unlock" : "Insufficient Flux") : "Reqs Not Met"}
                            </button>
                          </div>
                        )}
                        {isWrongClass && (
                          <div className="mt-3 pt-3 border-t border-[#2a2e38]/30">
                            <div className="text-[9px] text-red-400 uppercase tracking-widest font-bold text-center">Requires {node.classes.join(", ")}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Draw Arrows */}
            {Object.entries(nodes).map(([id, node]) => 
              node.requirements.map(req => (
                <Xarrow
                  key={`${req}-${id}`}
                  start={`node-${req}`}
                  end={`node-${id}`}
                  color={researched.includes(id) ? "#22c55e" : researched.includes(req) ? "#00E5FF" : "#2a2e38"}
                  strokeWidth={2}
                  path="smooth"
                  dashness={!researched.includes(req)}
                  headSize={4}
                  startAnchor="right"
                  endAnchor="left"
                />
              ))
            )}
          </Xwrapper>
        </div>
      </div>

      {/* Details Sidebar */}
      {selectedNodeId && nodes[selectedNodeId] && (
        <div className="w-80 bg-[#1a1d24] border-l border-[#2a2e38] p-6 shrink-0 h-fit sticky top-24">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-[#00E5FF] text-[10px] font-bold uppercase tracking-widest">
              Tech Details
            </h3>
            <button onClick={() => setSelectedNodeId(null)} className="text-[#64748b] hover:text-white">
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <div className={`w-20 h-20 border flex items-center justify-center self-center mb-2 ${nodes[selectedNodeId].classes && nodes[selectedNodeId].classes.length > 0 && !nodes[selectedNodeId].classes.includes(playerClass) ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-[#16181d] border-[#2a2e38] text-[#00E5FF]'}`}>
              {renderIcon(nodes[selectedNodeId].icon, "size-10")}
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">
              {nodes[selectedNodeId].name}
            </h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              {nodes[selectedNodeId].description}
            </p>
            <div className="bg-[#111317] border border-[#1e2028] p-4 mt-2">
              <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#e2e8f0] mb-2">
                Benefits
              </h4>
              <p className="text-xs text-green-400">
                {nodes[selectedNodeId].benefits}
              </p>
            </div>
            <div className="bg-[#111317] border border-[#1e2028] p-4 flex justify-between items-center">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#64748b]">Research Time</span>
              <span className="text-xs font-mono text-white">{formatTime(nodes[selectedNodeId].buildTimeInSeconds)}</span>
            </div>

            {nodes[selectedNodeId].requirements.length > 0 && (
              <div className="mt-4">
                <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#e2e8f0] mb-2">
                  Required Technologies
                </h4>
                <div className="flex flex-col gap-2">
                  {nodes[selectedNodeId].requirements.map(req => (
                    <div key={req} className="flex items-center gap-2 text-xs">
                      {researched.includes(req) ? <CheckCircle2 className="size-3 text-green-500" /> : <ChevronRight className="size-3 text-[#64748b]" />}
                      <span className={researched.includes(req) ? "text-green-500" : "text-[#94a3b8]"}>{nodes[req]?.name || req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
