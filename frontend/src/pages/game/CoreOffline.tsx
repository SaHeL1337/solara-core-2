import { useState, useEffect } from "react";
import { ShieldAlert, RefreshCw, Radio } from "lucide-react";
import { useGame } from "@/context/GameContext";

export default function CoreOffline() {
  const { refreshUser } = useGame();
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      handleAutoRetry();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleAutoRetry = async () => {
    try {
      await refreshUser();
    } catch (e) {
      // ignore
    } finally {
      setCountdown(5);
    }
  };

  const handleManualRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await refreshUser();
    } catch (e) {
      // ignore
    } finally {
      setIsRetrying(false);
      setCountdown(5);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0b0e] flex items-center justify-center z-50 overflow-hidden select-none">
      {/* Background sci-fi details */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] animate-pulse" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-md mx-4 bg-[#111317] border border-amber-500/30 p-8 shadow-[0_0_40px_rgba(245,158,11,0.1)] flex flex-col items-center text-center">
        {/* Warning corner decorations */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500" />

        {/* Pulsing warning circle */}
        <div className="relative w-16 h-16 flex items-center justify-center border border-amber-500/40 bg-amber-500/5 rounded-full mb-6">
          <div className="absolute inset-0 border border-amber-500 rounded-full animate-ping opacity-25" />
          <Radio className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>

        <h1 className="text-lg font-bold text-white tracking-widest uppercase mb-2 flex items-center gap-2 justify-center">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Neural Link Severed
        </h1>

        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-500/60 mb-4 font-mono">
          Sector Core Offline
        </div>

        <p className="text-xs text-[#94a3b8] leading-relaxed mb-6 font-medium max-w-sm">
          Unable to establish transmission with the sector mainframes. The neural link is offline. Your local interface is waiting for telemetry connection.
        </p>

        {/* Retry controls */}
        <div className="w-full bg-[#0a0b0e] border border-[#2a2e38] p-4 mb-6">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold mb-2">
            <span className="text-[#64748b]">Auto-reconnect Protocol</span>
            <span className="text-amber-500 font-mono">Pinging in {countdown}s</span>
          </div>
          <div className="w-full h-1 bg-[#1a1d24] overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-1000"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleManualRetry}
          disabled={isRetrying}
          className={`w-full py-3.5 flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all ${
            isRetrying
              ? "bg-amber-500/10 text-amber-500/40 border border-amber-500/20 cursor-not-allowed"
              : "bg-amber-500/10 text-amber-500 border border-amber-500 hover:bg-amber-500 hover:text-black hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Establishing Link..." : "Establish Neural Connection"}
        </button>
      </div>
    </div>
  );
}
