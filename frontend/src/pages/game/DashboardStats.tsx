import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, Pickaxe, BarChart3, Crosshair, Info } from "lucide-react";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";

interface MiningStats {
  today: {
    asteroidsMined: number;
    titanium: number;
    silicate: number;
    isotope: number;
  };
  totalToday: number;
  totalYesterday: number;
  percentChange: number;
  chartData: { date: string; totalMined: number }[];
}

// Shared hook for mining data
export function useMiningStats() {
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/statistics/mining")
      .then((res) => setStats(res.data.data))
      .catch((err) => console.error("Failed to load statistics", err))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

// ─── Mining Overview Panel ────────────────────────────────────

export function MiningOverviewPanel({ stats, loading }: { stats: MiningStats | null; loading: boolean }) {
  if (loading) {
    return <div className="animate-pulse bg-[#1a1d24] border border-[#2a2e38] h-48" />;
  }
  if (!stats) return null;

  const isPositive = stats.percentChange >= 0;
  const totalRes = stats.today.titanium + stats.today.silicate + stats.today.isotope;
  const titaniumPct = totalRes > 0 ? (stats.today.titanium / totalRes) * 100 : 33;
  const silicatePct = totalRes > 0 ? (stats.today.silicate / totalRes) * 100 : 33;
  const isotopePct = totalRes > 0 ? (stats.today.isotope / totalRes) * 100 : 34;

  return (
    <div className="bg-[#1a1d24] border border-[#2a2e38] p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Pickaxe className="w-4 h-4 text-[#00E5FF]" />
        <span className="text-xs font-bold text-[#64748b] tracking-widest uppercase">
          Mining Today
        </span>
      </div>

      {/* Hero stat */}
      <div className="mb-3">
        <div className="text-2xl font-mono text-white tracking-wide font-bold">
          {formatNumber(stats.totalToday)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-flex items-center text-xs font-bold font-mono px-1.5 py-0.5 ${
              isPositive
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {isPositive ? "+" : ""}{stats.percentChange}%
          </span>
          <span className="text-xs text-[#475569] font-bold">vs yesterday</span>
        </div>
      </div>

      {/* Resource breakdown bar */}
      <div className="mb-3">
        <div className="h-2 w-full flex overflow-hidden border border-[#1e2028]">
          <div className="h-full bg-[#64b5f6]" style={{ width: `${titaniumPct}%` }} />
          <div className="h-full bg-[#ce93d8]" style={{ width: `${silicatePct}%` }} />
          <div className="h-full bg-[#81c784]" style={{ width: `${isotopePct}%` }} />
        </div>
      </div>

      {/* Resource grid */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-[#16181d] border border-[#1e2028] p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Crosshair className="w-3 h-3 text-[#475569]" />
            <span className="text-[11px] text-[#64748b] font-bold tracking-wider uppercase">Missions</span>
          </div>
          <div className="text-sm font-mono text-white font-bold">{stats.today.asteroidsMined}</div>
        </div>
        <div className="bg-[#16181d] border border-[#1e2028] p-2.5 hover:border-[#64b5f6]/30 transition-colors">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TitaniumIcon className="w-3 h-3 text-[#64b5f6]" />
            <span className="text-[11px] text-[#64748b] font-bold tracking-wider uppercase">Titanium</span>
          </div>
          <div className="text-sm font-mono text-white font-bold text-center">{formatNumber(stats.today.titanium)}</div>
        </div>
        <div className="bg-[#16181d] border border-[#1e2028] p-2.5 hover:border-[#ce93d8]/30 transition-colors">
          <div className="flex items-center justify-center gap-1 mb-1">
            <SilicateIcon className="w-3 h-3 text-[#ce93d8]" />
            <span className="text-[11px] text-[#64748b] font-bold tracking-wider uppercase">Silicate</span>
          </div>
          <div className="text-sm font-mono text-white font-bold text-center">{formatNumber(stats.today.silicate)}</div>
        </div>
        <div className="bg-[#16181d] border border-[#1e2028] p-2.5 hover:border-[#81c784]/30 transition-colors">
          <div className="flex items-center justify-center gap-1 mb-1">
            <IsotopeIcon className="w-3 h-3 text-[#81c784]" />
            <span className="text-[11px] text-[#64748b] font-bold tracking-wider uppercase">Isotope</span>
          </div>
          <div className="text-sm font-mono text-white font-bold text-center">{formatNumber(stats.today.isotope)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Mining Chart Panel ───────────────────────────────────────

export function MiningChartPanel({ stats, loading }: { stats: MiningStats | null; loading: boolean }) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  if (loading) {
    return <div className="animate-pulse bg-[#1a1d24] border border-[#2a2e38] h-48" />;
  }
  if (!stats) return null;

  const maxMined = Math.max(...stats.chartData.map((d) => d.totalMined), 1);

  return (
    <div className="bg-[#1a1d24] border border-[#2a2e38] p-4 flex flex-col h-full min-h-[220px]">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#00E5FF]" />
          <span className="text-xs font-bold text-[#64748b] tracking-widest uppercase">
            7-Day Yield
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#475569]">
          Peak: {formatNumber(maxMined)}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end relative">
        {/* Y-axis */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between pointer-events-none">
          <div className="text-[10px] font-mono text-[#364152] text-right pr-1">{formatNumber(maxMined)}</div>
          <div className="text-[10px] font-mono text-[#364152] text-right pr-1">{formatNumber(Math.floor(maxMined / 2))}</div>
          <div className="text-[10px] font-mono text-[#364152] text-right pr-1">0</div>
        </div>

        {/* Grid lines */}
        <div className="absolute left-8 right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-b border-[#1e2028]" />
          ))}
        </div>

        {/* Bars */}
        <div className="h-32 flex items-end justify-between gap-1 ml-8 relative z-10">
          {stats.chartData.map((d, idx) => {
            const heightPct = (d.totalMined / maxMined) * 100;
            const isToday = d.date === stats.chartData[stats.chartData.length - 1].date;
            const isHovered = hoveredBar === idx;

            const dayParts = d.date.split("-");
            const dayDate = new Date(parseInt(dayParts[0]), parseInt(dayParts[1]) - 1, parseInt(dayParts[2]), 12, 0, 0);
            const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });

            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center justify-end gap-1 h-full cursor-default"
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className={`text-[10px] font-mono font-bold transition-all duration-150 ${
                  isHovered ? "text-[#00E5FF] opacity-100" : "opacity-0"
                }`}>
                  {formatNumber(d.totalMined)}
                </div>
                <div
                  className={`w-full max-w-[28px] transition-all duration-300 ${
                    isToday
                      ? "bg-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                      : isHovered ? "bg-[#3b4252]" : "bg-[#2a2e38]"
                  }`}
                  style={{
                    height: `${Math.max(heightPct, 3)}%`,
                    borderTop: isToday ? "2px solid #00E5FF" : isHovered ? "2px solid #4b5563" : "2px solid #3b4252",
                  }}
                />
                <div className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                  isToday ? "text-[#00E5FF]" : isHovered ? "text-[#94a3b8]" : "text-[#475569]"
                }`}>
                  {dayLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Legacy combined export (kept for backwards compat) ───────

export function DashboardStats() {
  const { stats, loading } = useMiningStats();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <MiningOverviewPanel stats={stats} loading={loading} />
      <MiningChartPanel stats={stats} loading={loading} />
    </div>
  );
}
