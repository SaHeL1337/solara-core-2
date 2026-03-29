import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, Pickaxe } from "lucide-react";
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

export function DashboardStats() {
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/statistics/mining")
      .then((res) => {
        setStats(res.data.data);
      })
      .catch((err) => console.error("Failed to load statistics", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse bg-[#1a1d24] border border-[#2a2e38] h-48 rounded-lg mb-8"></div>
    );
  }

  if (!stats) return null;

  const isPositive = stats.percentChange >= 0;

  // Find max value for chart scaling
  const maxMined = Math.max(...stats.chartData.map((d) => d.totalMined), 1);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
      <div className="bg-[#1a1d24] border border-[#2a2e38] p-4 lg:p-6 flex flex-col shadow-xl relative overflow-hidden">
        {/* Overview stats */}
        <div className="flex-1 space-y-6 relative z-10 w-full">
          <div>
            <h3 className="text-[#64748b] text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 mb-2">
              <Pickaxe className="w-4 h-4 text-[#00E5FF]" />
              Mining Operations Today
            </h3>
            <div className="text-3xl font-mono text-white tracking-widest">
              {formatNumber(stats.totalToday)}{" "}
              <span className="text-sm text-[#94a3b8] tracking-widest uppercase font-bold ml-1">
                resources
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`flex items-center text-xs font-bold leading-none px-2 py-0.5 rounded-sm ${isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {isPositive ? "+" : ""}
                {stats.percentChange}%
              </span>
              <span className="text-xs text-[#64748b] uppercase tracking-wider font-bold">
                vs yesterday
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#16181d]/80 border border-[#2a2e38]/80 p-3 text-center rounded-sm">
              <div className="text-[9px] text-[#64748b] font-bold tracking-widest uppercase mb-1">
                Missions
              </div>
              <div className="text-sm font-mono text-white">
                {stats.today.asteroidsMined}
              </div>
            </div>
            <div className="bg-[#16181d]/80 border border-[#2a2e38]/80 p-3 flex flex-col items-center rounded-sm">
              <TitaniumIcon className="w-4 h-4 mb-2 opacity-80" />
              <div className="text-[10px] font-mono text-white">
                {formatNumber(stats.today.titanium)}
              </div>
            </div>
            <div className="bg-[#16181d]/80 border border-[#2a2e38]/80 p-3 flex flex-col items-center rounded-sm">
              <SilicateIcon className="w-4 h-4 mb-2 opacity-80" />
              <div className="text-[10px] font-mono text-white">
                {formatNumber(stats.today.silicate)}
              </div>
            </div>
            <div className="bg-[#16181d]/80 border border-[#2a2e38]/80 p-3 flex flex-col items-center rounded-sm">
              <IsotopeIcon className="w-4 h-4 mb-2 opacity-80" />
              <div className="text-[10px] font-mono text-white">
                {formatNumber(stats.today.isotope)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1d24] border border-[#2a2e38] p-4 lg:p-6 flex flex-col shadow-xl relative overflow-hidden min-h-[200px]">
        {/* Chart */}
        <div className="flex-1 w-full min-w-[300px] flex flex-col justify-end relative z-10 pt-4 md:pt-0">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-[#64748b] text-[10px] font-bold tracking-widest uppercase">
              7-Day Resource Yield
            </h3>
            <div className="text-[10px] font-mono text-[#475569]">
              Max: {formatNumber(maxMined)}
            </div>
          </div>
          <div className="h-32 flex items-end justify-between gap-2 border-b border-[#2a2e38]">
            {stats.chartData.map((d) => {
              const heightPct = (d.totalMined / maxMined) * 100;
              const isToday =
                d.date === stats.chartData[stats.chartData.length - 1].date;

              // Format day label
              const dayParts = d.date.split("-");
              const dayDate = new Date(
                parseInt(dayParts[0]),
                parseInt(dayParts[1]) - 1,
                parseInt(dayParts[2]),
                12,
                0,
                0,
              );
              const dayLabel = dayDate.toLocaleDateString("en-US", {
                weekday: "short",
              });

              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end gap-2 group h-full"
                >
                  <div className="text-[10px] font-mono text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    {formatNumber(d.totalMined)}
                  </div>
                  <div
                    className={`w-full max-w-[30px] rounded-t-sm transition-all duration-500 ease-out border-t border-x ${isToday ? "bg-linear-to-t from-[#00E5FF]/20 to-[#00E5FF] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)]" : "bg-[#2a2e38] border-[#3b4252] group-hover:bg-[#3b4252]"}`}
                    style={{ height: `${Math.max(heightPct, 2)}%` }} // min 2% height so it shows
                  />
                  <div
                    className={`text-[8px] uppercase font-bold tracking-widest absolute -bottom-5 w-[30px] text-center ${isToday ? "text-[#00E5FF]" : "text-[#64748b]"}`}
                  >
                    {dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
