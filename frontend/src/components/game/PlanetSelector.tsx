import { useGame } from "@/context/GameContext";
import { ChevronDown } from "lucide-react";

export function PlanetSelector() {
  const { user, selectedPlanet, selectPlanet, isLoading } = useGame();

  if (isLoading) {
    return (
      <div className="h-10 w-full bg-slate-800/50 animate-pulse rounded-lg" />
    );
  }

  if (!user?.planets || user.planets.length === 0) {
    return (
      <div className="text-sm text-slate-500 px-2 py-1">No planets found</div>
    );
  }

  return (
    <div className="relative">
      <select
        value={selectedPlanet?.id || ""}
        onChange={(e) => selectPlanet(e.target.value)}
        className="w-full appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        {user.planets.map((planet) => (
          <option key={planet.id} value={planet.id}>
            {planet.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
}
