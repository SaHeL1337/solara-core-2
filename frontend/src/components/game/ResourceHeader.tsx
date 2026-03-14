import { useState, useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { formatNumber } from "@/lib/utils";

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
  ];

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-10">
      <div className="flex gap-8">
        {userResources.map((r) => (
          <div key={r.name} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {r.name}
            </span>
            <span className={`text-sm font-mono ${r.color}`}>{r.value}</span>
          </div>
        ))}
        {planetResources.map((r) => (
          <div key={r.name} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {r.name}
            </span>
            <span className={`text-sm font-mono ${r.color}`}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {/* Profile/Settings placeholder */}
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
      </div>
    </header>
  );
}
