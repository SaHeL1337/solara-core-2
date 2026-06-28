import { useState, useMemo } from "react";
import { useGame, Tag } from "@/context/GameContext";
import { formatNumber } from "@/lib/utils";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Search,
  MapPin,
  Shield,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Tag as TagIcon,
  Plus,
  X,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";

type SortField = "name" | "x" | "sovereignty" | "titanium";
type SortDir = "asc" | "desc";

export default function Planets() {
  const { user, selectedPlanet, selectPlanet, refreshUser } = useGame();
  const navigate = useNavigate();

  // Planets view states
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTagId, setFilterTagId] = useState<string>("all");
  const [activePlanetForTags, setActivePlanetForTags] = useState<string | null>(null);

  const planets = useMemo(() => {
    if (!user?.planets) return [];

    let filtered = user.planets;
    if (filterTagId !== "all") {
      filtered = filtered.filter((p) => p.tags?.some((t) => t.id === filterTagId));
    }

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
  }, [user?.planets, search, sortField, sortDir, filterTagId]);

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

  const toggleTagOnPlanet = async (planetId: string, tag: Tag, isAttached: boolean) => {
    try {
      if (isAttached) {
        await api.delete(`/tags/planets/${planetId}/tags/${tag.id}`);
      } else {
        await api.post(`/tags/planets/${planetId}/tags/${tag.id}`);
      }
      await refreshUser();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!user) {
    return <div className="p-4 text-[#94a3b8]">Loading...</div>;
  }

  const userTags = user.tags || [];
  const userTemplates = user.templates || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#00E5FF]" />
          Planet Control
          <span className="text-sm font-mono text-[#64748b] normal-case ml-2">
            {planets.length} planet{planets.length !== 1 ? "s" : ""}
          </span>
        </h1>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Manage Templates link */}
          <button
            onClick={() => navigate("/templates")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16181d] border border-[#2a2e38] text-xs font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white hover:border-[#3b4252] transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            Manage Templates
          </button>

          {/* Manage Tags link */}
          <button
            onClick={() => navigate("/tags")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16181d] border border-[#2a2e38] text-xs font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white hover:border-[#3b4252] transition-colors"
          >
            <TagIcon className="w-3.5 h-3.5" />
            Manage Tags
          </button>

          {/* Grid / list toggle */}
          <div className="flex border border-[#2a2e38]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid"
                ? "bg-[#00E5FF]/10 text-[#00E5FF] border-r border-[#2a2e38]"
                : "bg-[#16181d] text-[#64748b] hover:text-[#94a3b8] border-r border-[#2a2e38]"
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list"
                ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                : "bg-[#16181d] text-[#64748b] hover:text-[#94a3b8]"
                }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search + Sort Bar */}
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

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#64748b] shrink-0" />
          <select
            value={filterTagId}
            onChange={(e) => setFilterTagId(e.target.value)}
            className="bg-[#16181d] border border-[#2a2e38] text-xs font-bold uppercase tracking-wider text-[#94a3b8] px-3 py-2 focus:outline-none focus:border-[#00E5FF] transition-colors"
          >
            <option value="all">All Tags</option>
            {userTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
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
              className={`px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase border transition-colors ${sortField === field
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

      {/* Planets Rendering */}
      {planets.length === 0 ? (
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-12 text-center">
          <Globe className="w-8 h-8 text-[#2a2e38] mx-auto mb-3" />
          <p className="text-sm text-[#64748b]">No planets match current bounds or tag filters.</p>
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

            const attachedTemplate = userTemplates.find(
              (t) => t.tagId && planet.tags?.some((pt) => pt.id === t.tagId)
            );

            return (
              <div
                key={planet.id}
                className={`relative flex flex-col justify-between bg-[#1a1d24] border p-4 transition-all hover:border-[#3b4252] group ${isSelected
                  ? "border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  : "border-[#2a2e38]"
                  }`}
              >
                <button
                  onClick={() => selectPlanet(planet.id)}
                  className="absolute inset-0 z-0 text-left"
                />

                {isSelected && (
                  <div className="absolute top-2 right-2 z-10">
                    <Check className="w-4 h-4 text-[#00E5FF]" />
                  </div>
                )}

                <div className="relative z-10 pointer-events-none">
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

                  {/* Attached template recipe banner */}
                  {attachedTemplate && (
                    <div className="mb-3 px-2 py-1 bg-[#00E5FF]/5 border border-[#00E5FF]/20 text-[9px] font-bold text-[#00E5FF] uppercase tracking-wider flex items-center justify-between">
                      <span>Build Recipe:</span>
                      <span className="text-white truncate max-w-[120px]">{attachedTemplate.name}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[#64748b]" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748b]">
                          Sovereignty
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#94a3b8]">{planet.sovereignty}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0a0b0e] border border-[#2a2e38] overflow-hidden">
                      <div
                        className={`h-full transition-all ${sovColor}`}
                        style={{ width: `${planet.sovereignty}%` }}
                      />
                    </div>
                  </div>

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

                  <div className="mt-2 pt-2 border-t border-[#1e2028] flex justify-between text-[10px] text-[#64748b]">
                    <span>Pop: <span className="text-[#94a3b8] font-mono">{formatNumber(planet.population)}/{formatNumber(planet.populationCapacity)}</span></span>
                    <span>Storage: <span className="text-[#94a3b8] font-mono">{formatNumber(planet.storageCapacity)}</span></span>
                  </div>
                </div>

                {/* Planet tag list */}
                <div className="relative z-10 mt-3 pt-3 border-t border-[#1e2028] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748b] flex items-center gap-1">
                      <TagIcon className="w-2.5 h-2.5" /> Planet Tags
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePlanetForTags(activePlanetForTags === planet.id ? null : planet.id);
                        }}
                        className="p-1 border border-[#2a2e38] bg-[#16181d] text-[#64748b] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {activePlanetForTags === planet.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#16181d] border border-[#2a2e38] p-3 shadow-xl z-50 animate-in fade-in zoom-in duration-100">
                          <div className="flex justify-between items-center pb-1.5 border-b border-[#2a2e38] mb-2">
                            <span className="text-[9px] font-bold uppercase text-[#94a3b8]">Assign Tags</span>
                            <button
                              onClick={() => setActivePlanetForTags(null)}
                              className="text-[#64748b] hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {userTags.length === 0 ? (
                            <div className="text-[9px] text-center text-[#64748b] py-2">
                              No tags created. Use "Manage Tags" above.
                            </div>
                          ) : (
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {userTags.map((tag) => {
                                const isAttached = planet.tags?.some((t) => t.id === tag.id) || false;
                                return (
                                  <label
                                    key={tag.id}
                                    className="flex items-center gap-2 text-[10px] text-[#e2e8f0] cursor-pointer hover:bg-[#1a1d24] p-1 select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAttached}
                                      onChange={() => toggleTagOnPlanet(planet.id, tag, isAttached)}
                                      className="accent-[#00E5FF] w-3 h-3"
                                    />
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                    <span className="truncate uppercase font-bold tracking-wider">{tag.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {planet.tags && planet.tags.length > 0 ? (
                      planet.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest border"
                          style={{
                            color: tag.color,
                            borderColor: `${tag.color}30`,
                            backgroundColor: `${tag.color}05`,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-[#3b4252] font-medium italic">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Planet List mode */
        <div className="bg-[#1a1d24] border border-[#2a2e38] overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px_1fr_150px_100px] gap-0 text-[9px] font-bold tracking-widest uppercase text-[#64748b] border-b border-[#2a2e38] px-4 py-2">
            <span>Planet</span>
            <span>Position</span>
            <span>Sovereignty</span>
            <span>Resources</span>
            <span>Tags & Recipe</span>
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

            const attachedTemplate = userTemplates.find(
              (t) => t.tagId && planet.tags?.some((pt) => pt.id === t.tagId)
            );

            return (
              <div
                key={planet.id}
                className={`grid grid-cols-[1fr_100px_120px_1fr_150px_100px] gap-0 items-center px-4 py-3 border-b border-[#1e2028] transition-colors relative ${isSelected
                  ? "bg-[#00E5FF]/5 border-l-2 border-l-[#00E5FF]"
                  : "hover:bg-[#16181d] border-l-2 border-l-transparent"
                  }`}
              >
                <button onClick={() => selectPlanet(planet.id)} className="absolute inset-0 z-0" />
                <div className="flex items-center gap-2 min-w-0 relative z-10 pointer-events-none">
                  {isSelected && <Check className="w-3 h-3 text-[#00E5FF] shrink-0" />}
                  <span className={`text-xs font-bold truncate ${isSelected ? "text-[#00E5FF]" : "text-white"}`}>
                    {planet.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8] relative z-10 pointer-events-none">
                  {planet.x}, {planet.y}
                </span>
                <div className="flex items-center gap-2 relative z-10 pointer-events-none">
                  <div className="w-16 h-1.5 bg-[#0a0b0e] border border-[#2a2e38] overflow-hidden">
                    <div className={`h-full ${sovColor}`} style={{ width: `${planet.sovereignty}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#64748b]">{planet.sovereignty}</span>
                </div>
                <div className="flex items-center gap-3 relative z-10 pointer-events-none">
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

                {/* Tags and active recipe name */}
                <div className="flex flex-col gap-1 relative z-10">
                  <div className="flex flex-wrap gap-1">
                    {planet.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-widest border"
                        style={{
                          color: tag.color,
                          borderColor: `${tag.color}30`,
                          backgroundColor: `${tag.color}05`,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  {attachedTemplate && (
                    <div className="text-[8px] font-mono text-[#00E5FF] uppercase font-bold tracking-tight">
                      ⚙ {attachedTemplate.name}
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-mono text-[#94a3b8] text-right relative z-10 pointer-events-none">
                  {formatNumber(planet.population)}/{formatNumber(planet.populationCapacity)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
