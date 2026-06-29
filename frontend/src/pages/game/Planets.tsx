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

const BUILDING_NAMES: Record<string, string> = {
  TITANIUM_MINE: "Titanium Mine",
  SILICATE_MINE: "Silicate Mine",
  ISOTOPE_COLLECTOR: "Isotope Collector",
  SHIPYARD: "Shipyard",
  SHIELD_GENERATOR: "Shield Generator",
  HOUSING_BLOCK: "Housing Block",
  GOVERNMENT_BUILDING: "Government Building",
  STORAGE: "Storage",
  TRADING_HUB: "Trading Hub",
};

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {planets.map((planet) => {
            const isSelected = selectedPlanet?.id === planet.id;
            const sovPercent = planet.sovereignty;
            const sovColor =
              sovPercent > 75
                ? "from-emerald-500 to-emerald-400"
                : sovPercent > 40
                  ? "from-amber-500 to-amber-400"
                  : "from-red-500 to-red-400";
            const sovTextColor =
              sovPercent > 75
                ? "text-emerald-400"
                : sovPercent > 40
                  ? "text-amber-400"
                  : "text-red-400";

            const attachedTemplate = userTemplates.find(
              (t) => t.tagId && planet.tags?.some((pt) => pt.id === t.tagId)
            );

            const titaniumFull = Math.floor(planet.titanium) >= planet.storageCapacity;
            const silicateFull = Math.floor(planet.silicate) >= planet.storageCapacity;
            const isotopeFull = Math.floor(planet.isotope) >= planet.storageCapacity;

            return (
              <div
                key={planet.id}
                className={`relative rounded-xl overflow-hidden transition-all duration-300 group ${isSelected
                  ? "ring-1 ring-[#00E5FF]/60 shadow-[0_0_24px_rgba(0,229,255,0.12)]"
                  : "ring-1 ring-[#2a2e38]/60 hover:ring-[#3b4252]"
                  }`}
              >
                {/* Gradient top accent */}
                <div className={`h-[2px] w-full ${isSelected ? "bg-gradient-to-r from-[#00E5FF] via-[#00E5FF]/60 to-transparent" : "bg-gradient-to-r from-[#2a2e38] via-[#2a2e38]/40 to-transparent"}`} />

                <div className="bg-gradient-to-b from-[#1c1f27] to-[#181a21] p-5">
                  <button
                    onClick={() => selectPlanet(planet.id)}
                    className="absolute inset-0 z-0 text-left"
                  />

                  {/* Header: Planet name + coordinates */}
                  <div className="relative z-10 pointer-events-none">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base font-bold truncate leading-tight ${isSelected ? "text-[#00E5FF]" : "text-white"}`}>
                          {planet.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#475569]" />
                          <span className="text-xs font-mono text-[#64748b] bg-[#0f1115] px-2 py-0.5 rounded-md">
                            {planet.x}, {planet.y}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#00E5FF]/10 flex items-center justify-center shrink-0 ml-3">
                          <Check className="w-3.5 h-3.5 text-[#00E5FF]" />
                        </div>
                      )}
                    </div>

                    {/* Attached template recipe banner */}
                    {attachedTemplate && (
                      <div className="mb-4 px-3 py-2 bg-[#00E5FF]/5 border border-[#00E5FF]/15 rounded-lg text-xs font-semibold text-[#00E5FF] flex items-center justify-between gap-2">
                        <span className="uppercase tracking-wider text-[#00E5FF]/70 text-[11px]">Build Recipe</span>
                        <span className="text-white truncate">{attachedTemplate.name}</span>
                      </div>
                    )}

                    {/* Sovereignty */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-[#475569]" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                            Sovereignty
                          </span>
                        </div>
                        <span className={`text-sm font-bold font-mono ${sovTextColor}`}>{sovPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#0d0e12] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${sovColor} transition-all duration-500`}
                          style={{ width: `${sovPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Resources — vertical stack with mini bars */}
                    <div className="space-y-2.5 mb-4">
                      <div className="flex items-center gap-3">
                        <TitaniumIcon className="w-4 h-4 text-[#00E5FF] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-[#64748b]">Titanium</span>
                            <span className={`text-xs font-mono font-bold ${titaniumFull ? "text-red-400 animate-pulse" : "text-[#cbd5e1]"}`}>
                              {formatNumber(Math.floor(planet.titanium))}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-[#0d0e12] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${titaniumFull ? "bg-red-500" : "bg-[#00E5FF]"}`}
                              style={{ width: `${Math.min((planet.titanium / planet.storageCapacity) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <SilicateIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-[#64748b]">Silicate</span>
                            <span className={`text-xs font-mono font-bold ${silicateFull ? "text-red-400 animate-pulse" : "text-[#cbd5e1]"}`}>
                              {formatNumber(Math.floor(planet.silicate))}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-[#0d0e12] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${silicateFull ? "bg-red-500" : "bg-emerald-400"}`}
                              style={{ width: `${Math.min((planet.silicate / planet.storageCapacity) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <IsotopeIcon className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-[#64748b]">Isotope</span>
                            <span className={`text-xs font-mono font-bold ${isotopeFull ? "text-red-400 animate-pulse" : "text-[#cbd5e1]"}`}>
                              {formatNumber(Math.floor(planet.isotope))}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-[#0d0e12] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isotopeFull ? "bg-red-500" : "bg-purple-400"}`}
                              style={{ width: `${Math.min((planet.isotope / planet.storageCapacity) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pop + Storage footer */}
                    <div className="flex items-center justify-between py-2.5 px-3 bg-[#0f1115] rounded-lg text-xs text-[#64748b]">
                      <span>Pop <span className="text-[#94a3b8] font-mono font-semibold">{formatNumber(planet.population)}<span className="text-[#3b4252] mx-0.5">/</span>{formatNumber(planet.populationCapacity)}</span></span>
                      <span className="w-px h-3 bg-[#2a2e38]" />
                      <span>Storage <span className="text-[#94a3b8] font-mono font-semibold">{formatNumber(planet.storageCapacity)}</span></span>
                    </div>

                    {/* Active building constructions */}
                    {planet.queue && planet.queue.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#1e2028]">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full animate-pulse" />
                          Building ({planet.queue.length})
                        </div>
                        <div className="space-y-1.5">
                          {planet.queue.slice(0, 2).map((q, idx) => {
                            const label = BUILDING_NAMES[q.buildingType] || q.buildingType;
                            return (
                              <div
                                key={q.id || idx}
                                className="flex items-center justify-between px-3 py-1.5 bg-[#111317] border border-[#2a2e38]/60 rounded-md text-xs font-mono"
                              >
                                <span className="text-[#cbd5e1] truncate">
                                  {label}
                                </span>
                                <span className="text-[#00E5FF] font-bold ml-2">Lv {q.targetLevel}</span>
                              </div>
                            );
                          })}
                          {planet.queue.length > 2 && (
                            <div className="text-[10px] text-[#475569] text-right font-medium">
                              +{planet.queue.length - 2} more queued
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Planet tag list */}
                  <div className="relative z-10 mt-4 pt-3 border-t border-[#1e2028]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569] flex items-center gap-1.5">
                        <TagIcon className="w-3 h-3" /> Tags
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePlanetForTags(activePlanetForTags === planet.id ? null : planet.id);
                          }}
                          className="p-1.5 rounded-md border border-[#2a2e38] bg-[#16181d] text-[#64748b] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {activePlanetForTags === planet.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-52 bg-[#16181d] border border-[#2a2e38] rounded-lg p-3 shadow-2xl z-50 animate-in fade-in zoom-in duration-100">
                            <div className="flex justify-between items-center pb-2 border-b border-[#2a2e38] mb-2">
                              <span className="text-[11px] font-bold uppercase text-[#94a3b8]">Assign Tags</span>
                              <button
                                onClick={() => setActivePlanetForTags(null)}
                                className="text-[#64748b] hover:text-white p-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {userTags.length === 0 ? (
                              <div className="text-xs text-center text-[#64748b] py-3">
                                No tags created yet.
                              </div>
                            ) : (
                              <div className="max-h-36 overflow-y-auto space-y-1">
                                {userTags.map((tag) => {
                                  const isAttached = planet.tags?.some((t) => t.id === tag.id) || false;
                                  return (
                                    <label
                                      key={tag.id}
                                      className="flex items-center gap-2 text-xs text-[#e2e8f0] cursor-pointer hover:bg-[#1a1d24] p-1.5 rounded select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isAttached}
                                        onChange={() => toggleTagOnPlanet(planet.id, tag, isAttached)}
                                        className="accent-[#00E5FF] w-3.5 h-3.5"
                                      />
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
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

                    <div className="flex flex-wrap gap-1.5">
                      {planet.tags && planet.tags.length > 0 ? (
                        planet.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border"
                            style={{
                              color: tag.color,
                              borderColor: `${tag.color}25`,
                              backgroundColor: `${tag.color}0a`,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#3b4252] italic">No tags</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Planet List mode */
        <div className="bg-[#1a1d24] border border-[#2a2e38] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_130px_1fr_160px_110px] gap-0 text-[10px] font-bold tracking-widest uppercase text-[#475569] border-b border-[#2a2e38] px-5 py-3">
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
                className={`grid grid-cols-[1fr_100px_130px_1fr_160px_110px] gap-0 items-center px-5 py-3.5 border-b border-[#1e2028] transition-colors relative ${isSelected
                  ? "bg-[#00E5FF]/5 border-l-2 border-l-[#00E5FF]"
                  : "hover:bg-[#16181d] border-l-2 border-l-transparent"
                  }`}
              >
                <button onClick={() => selectPlanet(planet.id)} className="absolute inset-0 z-0" />
                <div className="flex flex-col gap-0.5 min-w-0 relative z-10 pointer-events-none">
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />}
                    <span className={`text-sm font-bold truncate ${isSelected ? "text-[#00E5FF]" : "text-white"}`}>
                      {planet.name}
                    </span>
                  </div>
                  {planet.queue && planet.queue.length > 0 && (
                    <div className="text-[10px] text-[#00E5FF] font-mono uppercase tracking-tight truncate flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full animate-ping shrink-0" />
                      <span>
                        {BUILDING_NAMES[planet.queue[0].buildingType] || planet.queue[0].buildingType} L{planet.queue[0].targetLevel}
                        {planet.queue.length > 1 && ` (+${planet.queue.length - 1})`}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono text-[#94a3b8] relative z-10 pointer-events-none">
                  {planet.x}, {planet.y}
                </span>
                <div className="flex items-center gap-2.5 relative z-10 pointer-events-none">
                  <div className="w-16 h-2 bg-[#0a0b0e] rounded-full border border-[#2a2e38] overflow-hidden">
                    <div className={`h-full rounded-full ${sovColor}`} style={{ width: `${planet.sovereignty}%` }} />
                  </div>
                  <span className="text-xs font-mono text-[#64748b]">{planet.sovereignty}</span>
                </div>
                <div className="flex items-center gap-3.5 relative z-10 pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <TitaniumIcon className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span className={`text-xs font-mono ${Math.floor(planet.titanium) >= planet.storageCapacity ? "text-red-400 font-extrabold animate-pulse" : "text-[#94a3b8]"}`}>
                      {formatNumber(Math.floor(planet.titanium))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SilicateIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className={`text-xs font-mono ${Math.floor(planet.silicate) >= planet.storageCapacity ? "text-red-400 font-extrabold animate-pulse" : "text-[#94a3b8]"}`}>
                      {formatNumber(Math.floor(planet.silicate))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IsotopeIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span className={`text-xs font-mono ${Math.floor(planet.isotope) >= planet.storageCapacity ? "text-red-400 font-extrabold animate-pulse" : "text-[#94a3b8]"}`}>
                      {formatNumber(Math.floor(planet.isotope))}
                    </span>
                  </div>
                </div>

                {/* Tags and active recipe name */}
                <div className="flex flex-col gap-1 relative z-10">
                  <div className="flex flex-wrap gap-1">
                    {planet.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border"
                        style={{
                          color: tag.color,
                          borderColor: `${tag.color}25`,
                          backgroundColor: `${tag.color}0a`,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  {attachedTemplate && (
                    <div className="text-[10px] font-mono text-[#00E5FF] uppercase font-bold tracking-tight">
                      ⚙ {attachedTemplate.name}
                    </div>
                  )}
                </div>

                <span className="text-xs font-mono text-[#94a3b8] text-right relative z-10 pointer-events-none">
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
