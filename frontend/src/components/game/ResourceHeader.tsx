import { useGame } from "@/context/GameContext";

export default function ResourceHeader() {
  const { user, selectedPlanet } = useGame();

  const planetResources = [
    {
      name: "Titanium",
      value: selectedPlanet?.titanium?.toString() || "0",
      color: "text-slate-400",
    },
    {
      name: "Silicate",
      value: selectedPlanet?.silicate?.toString() || "0",
      color: "text-green-400",
    },
    {
      name: "Isotope",
      value: selectedPlanet?.isotope?.toString() || "0",
      color: "text-blue-400",
    },
  ];

  const userResources = [
    {
      name: "Flux",
      value: user?.flux?.toString() || "0",
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
