import { useState, useEffect, useMemo, useCallback } from "react";
import { useGame } from "@/context/GameContext";
import { formatNumber } from "@/lib/utils";
import api from "@/lib/api";
import {
  ArrowLeftRight,
  Zap,
  Lock,
  TrendingUp,
  Clock,
  Package,
  Shield,
  Swords,
  BarChart,
  Globe,
} from "lucide-react";
import { TitaniumIcon, SilicateIcon, IsotopeIcon, FluxIcon } from "@/components/ui/icons";

interface TradingState {
  tradingHubLevel: number;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  multiplier: number;
  costPerFlux: {
    titanium: number;
    silicate: number;
    isotope: number;
  };
  maxFlux: number;
  globalMaxFlux: number;
  planetResources: {
    titanium: number;
    silicate: number;
    isotope: number;
  };
  activeTrades: {
    id: string;
    titaniumSpent: number;
    silicateSpent: number;
    isotopeSpent: number;
    fluxGained: number;
    capacityUsed: number;
    completesAt: string;
    createdAt: string;
  }[];
  hourlyVolume: {
    hour: string;
    fluxTraded: number;
  }[];
  predictedMultipliers: {
    hour: number;
    multiplier: number;
  }[];
}

type TradeTab = "flux" | "resources" | "defense";

export default function Trading() {
  const { selectedPlanet, refreshUser } = useGame();
  const [tradingState, setTradingState] = useState<TradingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [fluxAmount, setFluxAmount] = useState(0);
  const [activeTab, setActiveTab] = useState<TradeTab>("flux");
  const [trading, setTrading] = useState(false);
  const [tradingGlobal, setTradingGlobal] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTradingState = useCallback(async () => {
    if (!selectedPlanet) return;
    try {
      const { data } = await api.get(`/trading?planetId=${selectedPlanet.id}`);
      setTradingState(data);
    } catch (err) {
      console.error("Failed to fetch trading state:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlanet?.id]);

  useEffect(() => {
    setLoading(true);
    setFluxAmount(0);
    fetchTradingState();
  }, [fetchTradingState]);

  // Refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchTradingState, 15000);
    return () => clearInterval(interval);
  }, [fetchTradingState]);

  const cost = useMemo(() => {
    if (!tradingState) return { titanium: 0, silicate: 0, isotope: 0, totalCapacity: 0 };
    const c = tradingState.costPerFlux;
    return {
      titanium: c.titanium * fluxAmount,
      silicate: c.silicate * fluxAmount,
      isotope: c.isotope * fluxAmount,
      totalCapacity: (c.titanium + c.silicate + c.isotope) * fluxAmount,
    };
  }, [tradingState, fluxAmount]);

  const canTrade = useMemo(() => {
    if (!tradingState || fluxAmount <= 0) return false;
    const r = tradingState.planetResources;
    return (
      cost.titanium <= r.titanium &&
      cost.silicate <= r.silicate &&
      cost.isotope <= r.isotope &&
      cost.totalCapacity <= tradingState.availableCapacity
    );
  }, [tradingState, fluxAmount, cost]);

  const executeTrade = async () => {
    if (!selectedPlanet || !canTrade || trading) return;
    setTrading(true);
    try {
      await api.post("/trading/flux", {
        planetId: selectedPlanet.id,
        fluxAmount,
      });
      setFluxAmount(0);
      await fetchTradingState();
      await refreshUser();
    } catch (err) {
      console.error("Trade failed:", err);
    } finally {
      setTrading(false);
    }
  };

  const executeGlobalMaxTrade = async () => {
    if (!tradingState || tradingState.globalMaxFlux <= 0 || tradingGlobal) return;
    if (!confirm(`Are you sure you want to maximize flux conversion across ALL your planets? This will trade ${formatNumber(tradingState.globalMaxFlux)} flux.`)) {
      return;
    }
    setTradingGlobal(true);
    try {
      await api.post("/trading/flux/max-all");
      setFluxAmount(0);
      await fetchTradingState();
      await refreshUser();
    } catch (err) {
      console.error("Global Trade failed:", err);
    } finally {
      setTradingGlobal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#64748b] text-sm">Loading trading station...</div>
      </div>
    );
  }

  if (!selectedPlanet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#64748b] text-sm">Select a planet first.</div>
      </div>
    );
  }

  // Locked state — no trading hub
  if (!tradingState || tradingState.tradingHubLevel <= 0) {
    return (
      <div className="space-y-4">
        <Header level={0} />
        <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-none p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a2e38]/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#475569]" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Trading Hub Required</h2>
          <p className="text-sm text-[#64748b] max-w-md mx-auto">
            Build a Trading Hub on this planet to unlock flux trading. 
            Visit the Buildings page to construct one.
          </p>
        </div>
      </div>
    );
  }

  const maxVolume = Math.max(1, ...tradingState.hourlyVolume.map((v) => v.fluxTraded));
  const maxMultiplier = Math.max(1.1, ...tradingState.predictedMultipliers.map((v) => v.multiplier));

  return (
    <div className="space-y-4">
      <Header level={tradingState.tradingHubLevel} />

      {/* Tab bar - Sharp corners, standard UI style */}
      <div className="flex border-b border-[#2a2e38] bg-[#16181d]">
        <TabButton
          active={activeTab === "flux"}
          onClick={() => setActiveTab("flux")}
          icon={<Zap className="w-4 h-4" />}
          label="Trade for Flux"
        />
        <TabButton
          active={activeTab === "resources"}
          onClick={() => {}}
          icon={<Package className="w-4 h-4" />}
          label="Resource Trading"
          disabled
        />
        <TabButton
          active={activeTab === "defense"}
          onClick={() => {}}
          icon={<Swords className="w-4 h-4" />}
          label="Hire Defense Fleet"
          disabled
        />
      </div>

      {activeTab === "flux" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Left — Trade Panel (3 cols) */}
          <div className="xl:col-span-3 space-y-4">
            
            {/* Multiplier Card */}
            <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-none p-5 flex flex-col md:flex-row items-start md:items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Market Multiplier
                </h3>
                <p className="text-xs text-[#64748b]">
                  Higher volume increases prices. Wait for the multiplier to drop for cheaper trades.
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-6 items-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest mb-1">Current</span>
                  <span className={`text-2xl font-bold font-mono ${
                    tradingState.multiplier > 2 
                      ? "text-red-400" 
                      : tradingState.multiplier > 1.3 
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}>
                    {tradingState.multiplier}x
                  </span>
                </div>
                <div className="w-px h-10 bg-[#2a2e38]" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest mb-1">Next Hour</span>
                  <span className={`text-xl font-bold font-mono opacity-80 ${
                    tradingState.predictedMultipliers[1]?.multiplier > 2 
                      ? "text-red-400" 
                      : tradingState.predictedMultipliers[1]?.multiplier > 1.3 
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}>
                    {tradingState.predictedMultipliers[1]?.multiplier.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>

            {/* Current Base Price */}
            <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-none p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart className="w-4 h-4 text-[#00E5FF]" />
                Current Trade Rates
              </h3>
              <div className="bg-[#0f1115] rounded-none border border-[#1e222a] p-4 flex items-center justify-center gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-none bg-[#00E5FF]/10 flex items-center justify-center">
                    <FluxIcon className="w-4 h-4 text-[#00E5FF]" />
                  </div>
                  <span className="text-lg font-bold text-white">1 Flux</span>
                </div>
                <span className="text-[#475569] text-lg">=</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <TitaniumIcon className="w-4 h-4 text-[#00E5FF]" />
                    <span className="text-sm font-mono font-bold text-[#cbd5e1]">
                      {formatNumber(tradingState.costPerFlux.titanium)}
                    </span>
                  </div>
                  <span className="text-[#475569]">+</span>
                  <div className="flex items-center gap-1.5">
                    <SilicateIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-mono font-bold text-[#cbd5e1]">
                      {formatNumber(tradingState.costPerFlux.silicate)}
                    </span>
                  </div>
                  <span className="text-[#475569]">+</span>
                  <div className="flex items-center gap-1.5">
                    <IsotopeIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-mono font-bold text-[#cbd5e1]">
                      {formatNumber(tradingState.costPerFlux.isotope)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trade controls */}
            <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-none p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#00E5FF]" />
                Execute Trade (Local Planet)
              </h3>

              {/* Flux amount input + slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                    Flux Amount
                  </label>
                  <span className="text-xs text-[#00E5FF] font-mono">
                    Max Local: {formatNumber(tradingState.maxFlux)}
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    min={0}
                    max={tradingState.maxFlux}
                    value={fluxAmount}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(tradingState.maxFlux, parseInt(e.target.value) || 0));
                      setFluxAmount(v);
                    }}
                    className="w-32 bg-[#0f1115] border border-[#2a2e38] rounded-none px-3 py-2.5 text-white text-sm font-mono font-bold focus:outline-none focus:border-[#00E5FF] transition-colors text-center"
                  />
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min={0}
                      max={tradingState.maxFlux}
                      value={fluxAmount}
                      onChange={(e) => setFluxAmount(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#0f1115] rounded-none appearance-none cursor-pointer accent-[#00E5FF] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-[#00E5FF] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,229,255,0.4)] [&::-webkit-slider-thumb]:cursor-pointer"
                      style={{
                        background: tradingState.maxFlux > 0
                          ? `linear-gradient(to right, #00E5FF ${(fluxAmount / tradingState.maxFlux) * 100}%, #0f1115 ${(fluxAmount / tradingState.maxFlux) * 100}%)`
                          : "#0f1115",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setFluxAmount(tradingState.maxFlux)}
                    className="px-3 py-2 bg-[#0f1115] border border-[#2a2e38] rounded-none text-xs font-bold text-[#00E5FF] hover:bg-[#00E5FF]/10 hover:border-[#00E5FF]/30 transition-colors uppercase tracking-wider"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2 mb-5">
                <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
                  Cost Breakdown
                </div>
                <CostRow
                  icon={<TitaniumIcon className="w-4 h-4 text-[#00E5FF]" />}
                  label="Titanium"
                  cost={cost.titanium}
                  available={tradingState.planetResources.titanium}
                />
                <CostRow
                  icon={<SilicateIcon className="w-4 h-4 text-emerald-400" />}
                  label="Silicate"
                  cost={cost.silicate}
                  available={tradingState.planetResources.silicate}
                />
                <CostRow
                  icon={<IsotopeIcon className="w-4 h-4 text-purple-400" />}
                  label="Isotope"
                  cost={cost.isotope}
                  available={tradingState.planetResources.isotope}
                />
                <div className="flex items-center justify-between py-2 px-3 bg-[#0f1115] border border-[#1e222a] mt-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#475569]" />
                    <span className="text-xs text-[#64748b]">Capacity Used</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${cost.totalCapacity > tradingState.availableCapacity ? "text-red-400" : "text-[#94a3b8]"}`}>
                    {formatNumber(cost.totalCapacity)} / {formatNumber(tradingState.availableCapacity)}
                  </span>
                </div>
              </div>

              {/* Execute button */}
              <button
                onClick={executeTrade}
                disabled={!canTrade || trading || tradingGlobal}
                className={`w-full py-3 rounded-none text-sm font-bold uppercase tracking-wider transition-all ${
                  canTrade && !trading && !tradingGlobal
                    ? "bg-transparent border border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                    : "bg-[#2a2e38] text-[#475569] border border-transparent cursor-not-allowed"
                }`}
              >
                {trading ? "Executing Trade..." : fluxAmount <= 0 ? "Select Amount" : !canTrade ? "Insufficient Resources or Capacity" : `Trade Local for ${formatNumber(fluxAmount)} Flux`}
              </button>
            </div>
            
            {/* Global Max Execute Panel */}
            <div className="bg-[#1a1d24] border border-[#00E5FF]/30 border-dashed rounded-none p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-[#00E5FF]" />
                  Global Conversion
                </h3>
                <p className="text-[11px] text-[#64748b] max-w-sm">
                  Automatically calculate and convert the maximum possible flux across ALL your planets instantly.
                </p>
              </div>
              <button
                onClick={executeGlobalMaxTrade}
                disabled={tradingState.globalMaxFlux <= 0 || tradingGlobal || trading}
                className={`px-6 py-3 rounded-none text-sm font-bold uppercase tracking-wider transition-all shadow-lg ${
                  tradingState.globalMaxFlux > 0 && !tradingGlobal && !trading
                    ? "bg-[#00E5FF] text-[#0a0b0e] hover:bg-white hover:text-black hover:shadow-[0_0_25px_rgba(0,229,255,0.6)]"
                    : "bg-[#2a2e38] text-[#475569] cursor-not-allowed"
                }`}
              >
                {tradingGlobal ? "Executing..." : `MAX ALL PLANETS (${formatNumber(tradingState.globalMaxFlux)} Flux)`}
              </button>
            </div>
          </div>

          {/* Right — Market Info (2 cols) */}
          <div className="xl:col-span-2 space-y-4">
            
            {/* Active trades */}
            <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-none p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00E5FF]" />
                Active Trades
                {tradingState.activeTrades.length > 0 && (
                  <span className="ml-auto text-xs font-mono text-[#00E5FF]">
                    {tradingState.activeTrades.length} / Total
                  </span>
                )}
              </h3>
              {tradingState.activeTrades.length === 0 ? (
                <div className="text-sm text-[#475569] text-center py-6 border border-[#2a2e38] border-dashed">
                  No active trades
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {tradingState.activeTrades.map((trade) => {
                    const remaining = Math.max(0, new Date(trade.completesAt).getTime() - now);
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);

                    return (
                      <div
                        key={trade.id}
                        className="bg-[#16181d] border-l-2 border-[#00E5FF] border-y border-r border-[#2a2e38] p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-[#00E5FF]/10 p-1">
                              <FluxIcon className="w-4 h-4 text-[#00E5FF]" />
                            </div>
                            <span className="text-sm font-bold text-white font-mono">
                              +{formatNumber(trade.fluxGained)}
                            </span>
                          </div>
                          <span className="text-xs font-bold font-mono text-amber-400 bg-amber-400/10 px-2 py-1">
                            {remaining > 0 ? `${minutes}m ${seconds}s` : "Completing..."}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono text-[#94a3b8] bg-[#0f1115] p-2">
                          <span className="flex items-center gap-1.5">
                            <TitaniumIcon className="w-3 h-3 text-[#00E5FF]" />
                            {formatNumber(trade.titaniumSpent)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <SilicateIcon className="w-3 h-3 text-emerald-400" />
                            {formatNumber(trade.silicateSpent)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <IsotopeIcon className="w-3 h-3 text-purple-400" />
                            {formatNumber(trade.isotopeSpent)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 24h Volume Chart */}
            <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-none p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4 text-[#00E5FF]" />
                24h Volume (Past)
              </h3>
              <div className="flex items-end gap-[2px] h-20">
                {tradingState.hourlyVolume.map((bucket, i) => {
                  const height = maxVolume > 0 ? (bucket.fluxTraded / maxVolume) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 group relative flex flex-col items-center justify-end h-full"
                    >
                      <div
                        className={`w-full transition-all ${
                          bucket.fluxTraded > 0 
                            ? "bg-[#00E5FF]/40 group-hover:bg-[#00E5FF] min-h-[6px]" 
                            : "bg-transparent"
                        }`}
                        style={{ height: bucket.fluxTraded > 0 ? `${Math.max(10, height)}%` : "0%" }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0f1115] border border-[#2a2e38] px-2 py-1 text-xs font-mono text-white whitespace-nowrap z-10 shadow-lg">
                        {bucket.hour} — {bucket.fluxTraded} flux
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                <span>{tradingState.hourlyVolume[0]?.hour || ""}</span>
                <span>Now</span>
              </div>
            </div>

            {/* Projected Multiplier Chart */}
            <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-none p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Multiplier Forecast (Next 24h)
              </h3>
              <div className="flex items-end gap-[2px] h-20">
                {tradingState.predictedMultipliers.map((bucket, i) => {
                  const height = maxMultiplier > 0 ? ((bucket.multiplier - 1) / (maxMultiplier - 1 || 1)) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 group relative flex flex-col items-center justify-end h-full"
                    >
                      <div
                        className={`w-full transition-all ${
                          bucket.multiplier > 1
                            ? "bg-amber-400/40 group-hover:bg-amber-400 min-h-[6px]" 
                            : "bg-emerald-400/20 group-hover:bg-emerald-400 min-h-[6px]"
                        }`}
                        style={{ height: `${Math.max(10, height)}%` }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0f1115] border border-[#2a2e38] px-2 py-1 text-xs font-mono text-white whitespace-nowrap z-10 shadow-lg">
                        +{i}h — {bucket.multiplier}x
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                <span>Now</span>
                <span>+24h</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Coming soon tabs */}
      {activeTab === "resources" && <ComingSoon title="Resource Trading" description="Trade resources directly with other players. Set up offers and wait for matches." />}
      {activeTab === "defense" && <ComingSoon title="Hire Defense Fleet" description="Hire mercenary fleets to defend your planets. Pay with flux for temporary defense." />}
    </div>
  );
}

function Header({ level }: { level: number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-[#00E5FF]" />
        Trading Station
      </h1>
      {level > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#16181d] border border-[#2a2e38]">
          <Shield className="w-3.5 h-3.5 text-[#475569]" />
          <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
            Trading Hub
          </span>
          <span className="text-xs font-mono font-bold text-[#00E5FF]">
            Lv {level}
          </span>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
        disabled
          ? "text-[#3b4252] border-transparent cursor-not-allowed"
          : active
            ? "text-[#00E5FF] border-[#00E5FF] bg-[#1a1d24]"
            : "text-[#64748b] border-transparent hover:text-[#94a3b8] hover:bg-[#1a1d24]"
      }`}
    >
      {icon}
      {label}
      {disabled && (
        <span className="px-1.5 py-0.5 text-[8px] font-bold bg-[#2a2e38] text-[#475569] uppercase ml-2">
          Soon
        </span>
      )}
    </button>
  );
}

function CostRow({
  icon,
  label,
  cost,
  available,
}: {
  icon: React.ReactNode;
  label: string;
  cost: number;
  available: number;
}) {
  const overBudget = cost > available && cost > 0;
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-[#0f1115] border border-[#1e222a]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-[#64748b]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono font-bold ${overBudget ? "text-red-400" : "text-[#cbd5e1]"}`}>
          {formatNumber(cost)}
        </span>
        <span className="text-[10px] text-[#3b4252] font-mono">
          / {formatNumber(available)}
        </span>
      </div>
    </div>
  );
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[#1a1d24] border border-[#2a2e38] p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-none bg-[#2a2e38]/50 flex items-center justify-center">
        <Lock className="w-6 h-6 text-[#3b4252]" />
      </div>
      <h2 className="text-base font-bold text-[#64748b] mb-2">{title}</h2>
      <p className="text-sm text-[#3b4252] max-w-md mx-auto">{description}</p>
    </div>
  );
}
