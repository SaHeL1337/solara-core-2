import { useGame } from "@/context/GameContext";
import { ChevronDown } from "lucide-react";

export function PlanetSelector() {
  const { user, selectedPlanet, selectPlanet, isLoading } = useGame();

  if (isLoading) {
    return <div className="h-10 w-full animate-pulse bg-white/5 rounded" />;
  }

  if (!user?.planets || user.planets.length === 0) {
    return (
      <div className="text-sm text-[#94a3b8] px-2 py-1">No planets found</div>
    );
  }

  return (
    <div className="relative group cursor-pointer">
      <div className="text-[10px] text-[#00E5FF] font-bold uppercase tracking-widest mb-1">
        COMMAND_SECTOR
      </div>
      <select
        value={selectedPlanet?.id || ""}
        onChange={(e) => selectPlanet(e.target.value)}
        className="w-full appearance-none bg-transparent text-[#94a3b8] hover:text-[#e2e8f0] text-xs pr-6 focus:outline-none cursor-pointer transition-colors"
      >
        {user.planets.map((planet) => (
          <option
            key={planet.id}
            value={planet.id}
            className="bg-[#1e2028] text-[#e2e8f0]"
          >
            {planet.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-0 bottom-0.5 w-3 h-3 text-[#94a3b8] pointer-events-none group-hover:text-[#e2e8f0] transition-colors" />
    </div>
  );
}
