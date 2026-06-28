import { useState, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { formatNumber } from "@/lib/utils";
import { Globe, Search, MapPin, Shield, Check, ChevronDown, ChevronUp, LayoutGrid, List } from "lucide-react";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";

type SortField = "name" | "x" | "sovereignty" | "titanium";
type SortDir = "asc" | "desc";

export default function Planets() {
  const { user, selectedPlanet, selectPlanet } = useGame();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const planets = useMemo(() => {
    if (!user?.planets) return [];

    let filtered = user.planets;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          `${p.x},${p.y}`.includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "x":
          cmp = a.x - b.x || a.y - b.y;
          break;
        case "sovereignty":
          cmp = a.sovereignty - b.sovereignty;
          break;
        case "titanium":
          cmp = (a.titanium + a.silicate + a.isotope) - (b.titanium + b.silicate + b.isotope);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [user?.planets, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  if (!user) {
    return <div className="p-4 text-[#94a3b8]">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#00E5FF]" />
          Planet Management
          <span className="text-sm font-mono text-[#64748b] normal-case ml-2">
            {planets.length} planet{planets.length !== 1 ? "s" : ""}
          </span>
        </h1>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border border-[#2a2e38]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-[#00E5FF]/10 text-[#00E5FF] border-r border-[#2a2e38]"
                  : "bg-[#16181d] text-[#64748b] hover:text-[#94a3b8] border-r border-[#2a2e38]"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                  : "bg-[#16181d] text-[#64748b] hover:text-[#94a3b8]"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="bg-[#1a1d24] border border-[#2a2e38] p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search planets by name or coordinates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#16181d] border border-[#2a2e38] pl-9 pr-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#3b4252] focus:outline-none focus:border-[#00E5FF] transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              { field: "name" as SortField, label: "Name" },
              { field: "x" as SortField, label: "Position" },
              { field: "sovereignty" as SortField, label: "Sovereignty" },
              { field: "titanium" as SortField, label: "Resources" },
            ] as const
          ).map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase border transition-colors ${
                sortField === field
                  ? "border-[#00E5FF]/50 text-[#00E5FF] bg-[#00E5FF]/5"
                  : "border-[#2a2e38] text-[#64748b] hover:text-[#94a3b8] hover:border-[#3b4252]"
              }`}
            >
              {label}
              <SortIcon field={field} />
            </button>
          ))}
        </div>
      </div>

      {/* Planet Grid / List */}
      {planets.length === 0 ? (
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-12 text-center">
          <Globe className="w-8 h-8 text-[#2a2e38] mx-auto mb-3" />
          <p className="text-sm text-[#64748b]">
            {search ? "No planets match your search." : "You have no planets."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {planets.map((planet) => {
            const isSelected = selectedPlanet?.id === planet.id;
            const sovColor =
              planet.sovereignty > 75
                ? "bg-emerald-500"
                : planet.sovereignty > 40
                  ? "bg-amber-500"
                  : "bg-red-500";

            return (
              <button
                key={planet.id}
                onClick={() => selectPlanet(planet.id)}
                className={`relative text-left bg-[#1a1d24] border p-4 transition-all hover:border-[#3b4252] group ${
                  isSelected
                    ? "border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    : "border-[#2a2e38]"
                }`}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-[#00E5FF]" />
                  </div>
                )}

                {/* Planet name & coords */}
                <div className="mb-3">
                  <h3 className={`text-sm font-bold truncate ${isSelected ? "text-[#00E5FF]" : "text-white"}`}>
                    {planet.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-[#64748b]" />
                    <span className="text-[10px] font-mono text-[#64748b]">
                      {planet.x}, {planet.y}
                    </span>
                  </div>
                </div>

                {/* Sovereignty bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#64748b]" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748b]">
                        Sovereignty
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#94a3b8]">
                      {planet.sovereignty}/100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0a0b0e] border border-[#2a2e38] overflow-hidden">
                    <div
                      className={`h-full transition-all ${sovColor}`}
                      style={{ width: `${planet.sovereignty}%` }}
                    />
                  </div>
                </div>

                {/* Resources */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1">
                    <TitaniumIcon className="w-3 h-3 text-[#00E5FF]" />
                    <span className="text-[10px] font-mono text-[#94a3b8]">
                      {formatNumber(Math.floor(planet.titanium))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <SilicateIcon className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-mono text-[#94a3b8]">
                      {formatNumber(Math.floor(planet.silicate))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IsotopeIcon className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] font-mono text-[#94a3b8]">
                      {formatNumber(Math.floor(planet.isotope))}
                    </span>
                  </div>
                </div>

                {/* Population */}
                <div className="mt-2 pt-2 border-t border-[#1e2028] flex justify-between text-[10px] text-[#64748b]">
                  <span>Pop: <span className="text-[#94a3b8] font-mono">{formatNumber(planet.population)}/{formatNumber(planet.populationCapacity)}</span></span>
                  <span>Storage: <span className="text-[#94a3b8] font-mono">{formatNumber(planet.storageCapacity)}</span></span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-[#1a1d24] border border-[#2a2e38] overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px_1fr_100px] gap-0 text-[9px] font-bold tracking-widest uppercase text-[#64748b] border-b border-[#2a2e38] px-4 py-2">
            <span>Planet</span>
            <span>Position</span>
            <span>Sovereignty</span>
            <span>Resources</span>
            <span className="text-right">Population</span>
          </div>
          {planets.map((planet) => {
            const isSelected = selectedPlanet?.id === planet.id;
            const sovColor =
              planet.sovereignty > 75
                ? "bg-emerald-500"
                : planet.sovereignty > 40
                  ? "bg-amber-500"
                  : "bg-red-500";

            return (
              <button
                key={planet.id}
                onClick={() => selectPlanet(planet.id)}
                className={`w-full grid grid-cols-[1fr_100px_120px_1fr_100px] gap-0 items-center px-4 py-3 border-b border-[#1e2028] transition-colors text-left ${
                  isSelected
                    ? "bg-[#00E5FF]/5 border-l-2 border-l-[#00E5FF]"
                    : "hover:bg-[#16181d] border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isSelected && <Check className="w-3 h-3 text-[#00E5FF] shrink-0" />}
                  <span className={`text-xs font-bold truncate ${isSelected ? "text-[#00E5FF]" : "text-white"}`}>
                    {planet.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8]">
                  {planet.x}, {planet.y}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-[#0a0b0e] border border-[#2a2e38] overflow-hidden">
                    <div
                      className={`h-full ${sovColor}`}
                      style={{ width: `${planet.sovereignty}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#64748b]">{planet.sovereignty}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <TitaniumIcon className="w-3 h-3 text-[#00E5FF]" />
                    <span className="text-[10px] font-mono text-[#94a3b8]">{formatNumber(Math.floor(planet.titanium))}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <SilicateIcon className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-mono text-[#94a3b8]">{formatNumber(Math.floor(planet.silicate))}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IsotopeIcon className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] font-mono text-[#94a3b8]">{formatNumber(Math.floor(planet.isotope))}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8] text-right">
                  {formatNumber(planet.population)}/{formatNumber(planet.populationCapacity)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
