import { useState, useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { formatNumber } from "@/lib/utils";
import { Bell, Settings, User } from "lucide-react";
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

    const interval = setInterval(() => {
      setVisualResources((prev) => ({
        titanium: prev.titanium + selectedPlanet.production.titanium / 3600,
        silicate: prev.silicate + selectedPlanet.production.silicate / 3600,
        isotope: prev.isotope + selectedPlanet.production.isotope / 3600,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPlanet]);

  const planetResources = [
    {
      name: "Titanium",
      value: formatNumber(Math.floor(visualResources.titanium)),
      color: "text-slate-400",
    },
    {
      name: "Silicate",
      value: formatNumber(Math.floor(visualResources.silicate)),
      color: "text-green-400",
    },
    {
      name: "Isotope",
      value: formatNumber(Math.floor(visualResources.isotope)),
      color: "text-blue-400",
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
      value: selectedPlanet ? `${formatNumber(selectedPlanet.population)} / ${formatNumber(selectedPlanet.populationCapacity)}` : "0 / 0",
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
            className="flex items-center gap-1.5 text-[#94a3b8]"
          >
            {getIconForResource(r.name, "size-3.5")}
            <span className="text-[#e2e8f0] font-mono tracking-normal">
              {r.value}
            </span>
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
        <button className="hover:text-[#e2e8f0] transition-colors">
          <Bell className="size-4" />
        </button>
        <button className="hover:text-[#e2e8f0] transition-colors">
          <Settings className="size-4" />
        </button>
      </div>
    </header>
  );
}
