import { useState, useMemo } from "react";
import { useGame, Tag } from "@/context/GameContext";
import { formatNumber } from "@/lib/utils";
import api from "@/lib/api";
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
  Trash2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { TitaniumIcon, SilicateIcon, IsotopeIcon } from "@/components/ui/icons";

type SortField = "name" | "x" | "sovereignty" | "titanium";
type SortDir = "asc" | "desc";

const PRESET_COLORS = [
  { value: "#00E5FF", name: "Cyan" },
  { value: "#ef4444", name: "Red" },
  { value: "#10b981", name: "Green" },
  { value: "#f59e0b", name: "Amber" },
  { value: "#8b5cf6", name: "Purple" },
  { value: "#f97316", name: "Orange" },
];

export default function Planets() {
  const { user, selectedPlanet, selectPlanet, refreshUser } = useGame();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Tag filter state
  const [filterTagId, setFilterTagId] = useState<string>("all");

  // Manage tags modal state
  const [showManageTags, setShowManageTags] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0].value);
  const [tagError, setTagError] = useState<string | null>(null);

  // Tag assign popover state
  const [activePlanetForTags, setActivePlanetForTags] = useState<string | null>(null);

  const planets = useMemo(() => {
    if (!user?.planets) return [];

    let filtered = user.planets;

    // Filter by tag
    if (filterTagId !== "all") {
      filtered = filtered.filter((p) => p.tags?.some((t) => t.id === filterTagId));
    }

    // Filter by search
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

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setTagError(null);

    try {
      await api.post("/tags", {
        name: newTagName.trim(),
        color: newTagColor,
      });
      setNewTagName("");
      await refreshUser();
    } catch (err: any) {
      setTagError(err.response?.data?.error || "Failed to create tag");
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag? It will be removed from all planets.")) return;
    try {
      await api.delete(`/tags/${tagId}`);
      if (filterTagId === tagId) {
        setFilterTagId("all");
      }
      await refreshUser();
    } catch (err: any) {
      console.error(err);
    }
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#00E5FF]" />
          Planet Management
          <span className="text-sm font-mono text-[#64748b] normal-case ml-2">
            {planets.length} planet{planets.length !== 1 ? "s" : ""}
          </span>
        </h1>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Manage tags button */}
          <button
            onClick={() => setShowManageTags(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16181d] border border-[#2a2e38] text-xs font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white hover:border-[#3b4252] transition-colors"
          >
            <TagIcon className="w-3.5 h-3.5" />
            Manage Tags
          </button>

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

      {/* Filter and Search Bar */}
      <div className="bg-[#1a1d24] border border-[#2a2e38] p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
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

        {/* Tag filter */}
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

        {/* Sorting controls */}
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
            No planets match the filters.
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
              <div
                key={planet.id}
                className={`relative flex flex-col justify-between bg-[#1a1d24] border p-4 transition-all hover:border-[#3b4252] group ${
                  isSelected
                    ? "border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    : "border-[#2a2e38]"
                }`}
              >
                {/* Active Selector Click Overlay */}
                <button
                  onClick={() => selectPlanet(planet.id)}
                  className="absolute inset-0 z-0 text-left"
                />

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10">
                    <Check className="w-4 h-4 text-[#00E5FF]" />
                  </div>
                )}

                <div className="relative z-10 pointer-events-none">
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
                </div>

                {/* Tags and Tag Assignment Controls */}
                <div className="relative z-10 mt-3 pt-3 border-t border-[#1e2028] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748b] flex items-center gap-1">
                      <TagIcon className="w-2.5 h-2.5" /> Planet Tags
                    </span>

                    {/* Tag Assign Popover Toggle */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePlanetForTags(
                            activePlanetForTags === planet.id ? null : planet.id
                          );
                        }}
                        className="p-1 border border-[#2a2e38] bg-[#16181d] text-[#64748b] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {/* Tag Assign dropdown */}
                      {activePlanetForTags === planet.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#16181d] border border-[#2a2e38] p-3 shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
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
                            <div className="text-[10px] text-center text-[#64748b] uppercase py-2">
                              No tags created. Use "Manage Tags" to create one.
                            </div>
                          ) : (
                            <div className="max-h-32 overflow-y-auto space-y-1.5">
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
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: tag.color }}
                                    />
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

                  {/* Badges List */}
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
        /* List view */
        <div className="bg-[#1a1d24] border border-[#2a2e38] overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px_1fr_150px_100px] gap-0 text-[9px] font-bold tracking-widest uppercase text-[#64748b] border-b border-[#2a2e38] px-4 py-2">
            <span>Planet</span>
            <span>Position</span>
            <span>Sovereignty</span>
            <span>Resources</span>
            <span>Tags</span>
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
              <div
                key={planet.id}
                className={`grid grid-cols-[1fr_100px_120px_1fr_150px_100px] gap-0 items-center px-4 py-3 border-b border-[#1e2028] transition-colors relative ${
                  isSelected
                    ? "bg-[#00E5FF]/5 border-l-2 border-l-[#00E5FF]"
                    : "hover:bg-[#16181d] border-l-2 border-l-transparent"
                }`}
              >
                {/* Active Selector Overlay */}
                <button
                  onClick={() => selectPlanet(planet.id)}
                  className="absolute inset-0 z-0"
                />

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
                    <div
                      className={`h-full ${sovColor}`}
                      style={{ width: `${planet.sovereignty}%` }}
                    />
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

                {/* Tags Badge list (List mode) */}
                <div className="flex flex-wrap gap-1 relative z-10">
                  {planet.tags && planet.tags.length > 0 ? (
                    planet.tags.map((tag) => (
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
                    ))
                  ) : (
                    <span className="text-[9px] text-[#3b4252] font-medium italic">No tags</span>
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

      {/* Global Manage Tags Modal */}
      {showManageTags && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#111317] border border-[#2a2e38] w-full max-w-md mx-4 p-6 shadow-2xl relative">
            {/* Modal header */}
            <div className="flex justify-between items-center pb-3 border-b border-[#2a2e38] mb-4">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
                <TagIcon className="w-4 h-4 text-[#00E5FF]" /> Manage Tags
              </h2>
              <button
                onClick={() => {
                  setShowManageTags(false);
                  setTagError(null);
                }}
                className="text-[#64748b] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Tag form */}
            <form onSubmit={handleCreateTag} className="space-y-4 pb-4 border-b border-[#2a2e38] mb-4">
              <div>
                <label className="block text-[9px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
                  Create New Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    maxLength={20}
                    className="flex-1 bg-[#0a0b0e] border border-[#2a2e38] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF] text-xs font-bold uppercase tracking-wider hover:bg-[#00E5FF] hover:text-black transition-all"
                  >
                    Create
                  </button>
                </div>
              </div>

              {/* Color preset select */}
              <div>
                <label className="block text-[9px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
                  Tag Color
                </label>
                <div className="flex gap-2.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewTagColor(color.value)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        newTagColor === color.value
                          ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {tagError && (
                <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider bg-red-900/10 border border-red-500/20 p-2 text-center">
                  {tagError}
                </div>
              )}
            </form>

            {/* List of tags */}
            <div>
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#64748b] mb-3">
                Existing Tags ({userTags.length})
              </h3>
              {userTags.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#3b4252] italic">
                  No tags created yet.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {userTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between bg-[#16181d] border border-[#1e2028] p-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-xs font-bold uppercase text-white truncate tracking-wider">
                          {tag.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-[#64748b] hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
