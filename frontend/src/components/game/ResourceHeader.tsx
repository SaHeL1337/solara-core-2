import { useState, useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatNumber, formatTime } from "@/lib/utils";

import { Bell, Settings, User, Swords, Shield, Coins } from "lucide-react";
import {
  TitaniumIcon,
  SilicateIcon,
  IsotopeIcon,
  FluxIcon,
} from "@/components/ui/icons";

const getIconForResource = (name: string, className?: string) => {
  switch (name.toLowerCase()) {
    case "titanium":
      return <TitaniumIcon className={className} />;
    case "silicate":
      return <SilicateIcon className={className} />;
    case "isotope":
      return <IsotopeIcon className={className} />;
    case "flux":
      return <FluxIcon className={className} />;
    case "population":
      return <User className={className} />;
    default:
      return null;
  }
};

export default function ResourceHeader() {
  const { user, selectedPlanet } = useGame();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get("/messages?isRead=false");
        setUnreadCount(data.length);
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const [visualResources, setVisualResources] = useState({
    titanium: 0,
    silicate: 0,
    isotope: 0,
  });

  useEffect(() => {
    if (selectedPlanet) {
      setVisualResources({
        titanium: selectedPlanet.titanium,
        silicate: selectedPlanet.silicate,
        isotope: selectedPlanet.isotope,
      });
    }
  }, [selectedPlanet]);

  useEffect(() => {
    if (!selectedPlanet || !selectedPlanet.production) return;

    let lastTick = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;

      setVisualResources((prev) => {
        const capacity = selectedPlanet.storageCapacity || 10000;
        return {
          titanium: Math.min(
            capacity,
            prev.titanium +
              (selectedPlanet.production.titanium / 3600) * deltaSeconds,
          ),
          silicate: Math.min(
            capacity,
            prev.silicate +
              (selectedPlanet.production.silicate / 3600) * deltaSeconds,
          ),
          isotope: Math.min(
            capacity,
            prev.isotope +
              (selectedPlanet.production.isotope / 3600) * deltaSeconds,
          ),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPlanet]);

  const getCapacityColor = (percent: number) => {
    if (percent >= 98) return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]";
    if (percent >= 80)
      return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]";
    if (percent >= 50)
      return "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]";
    return "bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.4)]";
  };

  const capacity = selectedPlanet?.storageCapacity || 10000;

  const planetResources = [
    {
      name: "Titanium",
      value: formatNumber(Math.floor(visualResources.titanium)),
      raw: visualResources.titanium,
      percentage: Math.min(100, (visualResources.titanium / capacity) * 100),
      productionPerHour: selectedPlanet?.production?.titanium || 0,
    },
    {
      name: "Silicate",
      value: formatNumber(Math.floor(visualResources.silicate)),
      raw: visualResources.silicate,
      percentage: Math.min(100, (visualResources.silicate / capacity) * 100),
      productionPerHour: selectedPlanet?.production?.silicate || 0,
    },
    {
      name: "Isotope",
      value: formatNumber(Math.floor(visualResources.isotope)),
      raw: visualResources.isotope,
      percentage: Math.min(100, (visualResources.isotope / capacity) * 100),
      productionPerHour: selectedPlanet?.production?.isotope || 0,
    },
  ];

  const userResources = [
    {
      name: "Flux",
      value: user?.flux != null ? formatNumber(user.flux) : "0",
      color: "text-yellow-400",
    },
    {
      name: "Population",
      value: selectedPlanet
        ? `${formatNumber(selectedPlanet.population)} / ${formatNumber(selectedPlanet.populationCapacity)}`
        : "0 / 0",
      color: "text-purple-400",
    },
  ];

  return (
    <header className="h-20 bg-[#16181d] flex items-center px-8 justify-between sticky top-0 z-10">
      {/* Left side spacer to help centering if we want */}
      <div className="flex-1"></div>

      {/* Center: Resources */}
      <div className="flex items-center justify-center gap-8 text-[14px] font-bold tracking-widest uppercase">
        {planetResources.map((r) => (
          <div
            key={r.name}
            className="flex flex-col relative group cursor-default"
          >
            <div className="flex items-center gap-1.5 text-[#94a3b8] mb-1">
              {getIconForResource(r.name, "size-3.5")}
              <span
                className={`font-mono tracking-normal ${r.percentage >= 98 ? "text-red-400" : "text-[#e2e8f0]"}`}
              >
                {r.value}
              </span>
            </div>

            {/* Storage Capacity Bar */}
            <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getCapacityColor(r.percentage)} transition-all duration-1000`}
                style={{ width: `${r.percentage}%` }}
              />
            </div>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700 text-[10px] text-slate-300 py-2 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl flex flex-col gap-1 backdrop-blur-sm min-w-[140px]">
              {/* Storage Info */}
              <div className="flex justify-between items-center gap-4 border-b border-slate-800 pb-1.5 mb-0.5">
                <span className="text-slate-400 uppercase tracking-wider font-bold text-[9px]">
                  {r.name} STORAGE
                </span>
                <div className="font-mono text-xs">
                  <span className="text-[#00E5FF]">
                    {formatNumber(Math.floor(r.raw))}
                  </span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-300">
                    {formatNumber(capacity)}
                  </span>
                </div>
              </div>

              {/* Production */}
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-500">Production</span>
                <span className="text-green-400 font-mono tracking-tight">
                  +{formatNumber(r.productionPerHour)}/h
                </span>
              </div>

              {/* Status or Countdown */}
              {r.raw >= capacity && (
                <div className="flex justify-between items-center gap-4 mt-0.5">
                  <span className="text-slate-500">Status</span>
                  <span className="text-red-500 font-mono font-bold animate-pulse">
                    CAPACITY FULL
                  </span>
                </div>
              )}
              {r.raw < capacity && r.productionPerHour > 0 && (
                <div className="flex justify-between items-center gap-4 mt-0.5">
                  <span className="text-slate-500">Time to Full</span>
                  <span className="text-orange-400 font-mono tracking-tight">
                    {formatTime(
                      Math.max(
                        0,
                        Math.floor(
                          (capacity - r.raw) / (r.productionPerHour / 3600),
                        ),
                      ),
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {userResources.map((r) => (
          <div
            key={r.name}
            className="flex items-center gap-1.5 text-[#00E5FF]"
          >
            {getIconForResource(r.name, "size-4")}
            <span className="font-mono tracking-normal">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Right side icons */}
      <div className="flex-1 flex justify-end items-center gap-6 text-[#94a3b8]">
        {user?.playerClass && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d24] border border-[#2a2e38] rounded-sm group cursor-help relative">
            {user.playerClass === "Commander" && <Swords className="size-4 text-red-400" />}
            {user.playerClass === "Bastion" && <Shield className="size-4 text-amber-400" />}
            {user.playerClass === "Harvester" && <Coins className="size-4 text-cyan-400" />}
            <span className="text-[10px] font-bold tracking-widest uppercase text-white">
              {user.playerClass}
            </span>
          </div>
        )}
        <Link
          to="/messages"
          className="hover:text-[#00E5FF] transition-colors relative"
        >
          <Bell
            className={
              unreadCount > 0 ? "text-[#ffbb00] animate-pulse size-4" : "size-4"
            }
          />
        </Link>
        <button className="hover:text-[#e2e8f0] transition-colors">
          <Settings className="size-4" />
        </button>
      </div>
    </header>
  );
}
