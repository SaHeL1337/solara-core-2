import { useState, useMemo, useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { formatNumber } from "@/lib/utils";
import api from "@/lib/api";
import { simulateTemplate } from "@/lib/templateSim";
import { toast } from "sonner";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Wrench,
  Sparkles,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  ArrowLeft,
  Tag as TagIcon,
} from "lucide-react";

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

const SHIP_NAMES: Record<string, string> = {
  MINER: "Miner",
  FIGHTER: "Fighter",
  CRUISER: "Cruiser",
  BATTLESHIP: "Battleship",
  BOMBER: "Bomber",
  COLONY_SHIP: "Colony Ship",
  SCANNER: "Scanner Probe",
};

export default function Templates() {
  const { user, refreshUser } = useGame();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isNew = location.pathname.endsWith("/new");
  const isEditing = !!id || isNew;

  // Templates creator states
  const [templateName, setTemplateName] = useState("");
  const [templateTagId, setTemplateTagId] = useState<string | null>(null);
  const [templateBuildings, setTemplateBuildings] = useState<string[]>([]);
  const [templateShips, setTemplateShips] = useState<Record<string, number>>({
    MINER: 0,
    FIGHTER: 0,
    CRUISER: 0,
    BATTLESHIP: 0,
    BOMBER: 0,
    COLONY_SHIP: 0,
    SCANNER: 0,
  });

  // Drag and Drop internal states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Dynamic API Configuration States
  const [buildingsConfig, setBuildingsConfig] = useState<Record<string, any>>({});
  const [shipsConfig, setShipsConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    api.get("/templates/config")
      .then((res) => {
        setBuildingsConfig(res.data.data.buildings || {});
        setShipsConfig(res.data.data.ships || {});
      })
      .catch((err) => {
        console.error("Failed to fetch templates configuration", err);
      });
  }, []);

  // Hydrate form when ID or isNew path changes
  useEffect(() => {
    if (id && user?.templates) {
      const match = user.templates.find((t) => t.id === id);
      if (match) {
        setTemplateName(match.name);
        setTemplateTagId(match.tagId);
        setTemplateBuildings(match.buildings);
        setTemplateShips({
          MINER: match.ships.MINER || 0,
          FIGHTER: match.ships.FIGHTER || 0,
          CRUISER: match.ships.CRUISER || 0,
          BATTLESHIP: match.ships.BATTLESHIP || 0,
          BOMBER: match.ships.BOMBER || 0,
          COLONY_SHIP: match.ships.COLONY_SHIP || 0,
          SCANNER: match.ships.SCANNER || 0,
        });
      }
    } else if (isNew) {
      setTemplateName("");
      setTemplateTagId(null);
      setTemplateBuildings([]);
      setTemplateShips({
        MINER: 0,
        FIGHTER: 0,
        CRUISER: 0,
        BATTLESHIP: 0,
        BOMBER: 0,
        COLONY_SHIP: 0,
        SCANNER: 0,
      });
    }
  }, [id, isNew, user?.templates]);

  // Live client-side simulation trace
  const simulation = useMemo(() => {
    if (Object.keys(buildingsConfig).length === 0 || Object.keys(shipsConfig).length === 0) {
      return {
        valid: true,
        errors: [],
        trace: [],
        theoreticalRemainingHousing: 0,
      };
    }
    return simulateTemplate(templateBuildings, templateShips, buildingsConfig, shipsConfig);
  }, [templateBuildings, templateShips, buildingsConfig, shipsConfig]);

  // check if a building can be appended
  const canAppendBuilding = (type: string) => {
    if (Object.keys(buildingsConfig).length === 0 || Object.keys(shipsConfig).length === 0) {
      return false;
    }
    // Check if level exceeds maximum allowed limit
    const currentLevel = templateBuildings.filter((b) => b === type).length;
    const config = buildingsConfig[type];
    const max = config?.maxLevel || 40;
    if (currentLevel >= max) return false;

    // Simulate appending this building to the current end
    const tempSeq = [...templateBuildings, type];
    const testSim = simulateTemplate(tempSeq, templateShips, buildingsConfig, shipsConfig);
    const newStepIndex = tempSeq.length;
    const hasNewError = testSim.errors.some((err) => err.startsWith(`Step ${newStepIndex}:`));
    return !hasNewError;
  };

  // theoretical limits based on available housing
  const maxShipsPossible = useMemo(() => {
    if (Object.keys(buildingsConfig).length === 0 || Object.keys(shipsConfig).length === 0) {
      return {
        MINER: 0,
        FIGHTER: 0,
        CRUISER: 0,
        BATTLESHIP: 0,
        BOMBER: 0,
        COLONY_SHIP: 0,
        SCANNER: 0,
      };
    }
    // Calculate remaining housing of the template *before* considering already selected ships
    const testSimEmptyShips = simulateTemplate(templateBuildings, {
      MINER: 0,
      FIGHTER: 0,
      CRUISER: 0,
      BATTLESHIP: 0,
      BOMBER: 0,
      COLONY_SHIP: 0,
      SCANNER: 0,
    }, buildingsConfig, shipsConfig);

    const housingSurplus = Math.max(0, testSimEmptyShips.theoreticalRemainingHousing);
    const shipPopCosts: Record<string, number> = {
      MINER: shipsConfig.MINER?.cost?.population || 1,
      FIGHTER: shipsConfig.FIGHTER?.cost?.population || 1,
      CRUISER: shipsConfig.CRUISER?.cost?.population || 5,
      BATTLESHIP: shipsConfig.BATTLESHIP?.cost?.population || 20,
      BOMBER: shipsConfig.BOMBER?.cost?.population || 20,
      COLONY_SHIP: shipsConfig.COLONY_SHIP?.cost?.population || 50,
      SCANNER: shipsConfig.SCANNER?.cost?.population || 1,
    };

    const maxes: Record<string, number> = {};
    Object.entries(shipPopCosts).forEach(([type, cost]) => {
      maxes[type] = Math.floor(housingSurplus / cost);
    });
    return maxes;
  }, [templateBuildings, buildingsConfig, shipsConfig]);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!simulation.valid) {
      toast.error("Template violates building/ship rules. Check simulation diagnostics.");
      return;
    }

    try {
      if (id) {
        await api.put(`/templates/${id}`, {
          name: templateName.trim(),
          buildings: templateBuildings,
          ships: templateShips,
          tagId: templateTagId === "none" ? null : templateTagId,
        });
        toast.success("Template updated successfully");
      } else {
        await api.post("/templates", {
          name: templateName.trim(),
          buildings: templateBuildings,
          ships: templateShips,
          tagId: templateTagId === "none" ? null : templateTagId,
        });
        toast.success("Template created successfully");
      }
      navigate("/templates");
      await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this build template?")) return;
    try {
      await api.delete(`/templates/${templateId}`);
      toast.success("Template deleted successfully");
      await refreshUser();
    } catch (err: any) {
      toast.error("Failed to delete template");
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...templateBuildings];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setTemplateBuildings(updated);
    setDraggedIndex(null);
  };

  if (!user) {
    return <div className="p-4 text-[#94a3b8]">Loading...</div>;
  }

  const userTags = user.tags || [];
  const userTemplates = user.templates || [];

  return (
    <div className="space-y-4">
      {/* List Mode */}
      {!isEditing && (
        <>
          <div className="flex justify-between items-center border-b border-[#2a2e38] pb-3">
            <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#00E5FF]" />
              Planet Build Templates
            </h1>
            <button
              onClick={() => navigate("/templates/new")}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF] text-[10px] font-bold uppercase tracking-wider hover:bg-[#00E5FF] hover:text-black transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userTemplates.length === 0 ? (
              <div className="col-span-2 bg-[#1a1d24] border border-[#2a2e38] p-12 text-center">
                <Wrench className="w-8 h-8 text-[#2a2e38] mx-auto mb-3" />
                <p className="text-sm text-[#64748b] uppercase">No templates created yet. Click "New Template" above.</p>
              </div>
            ) : (
              userTemplates.map((template) => {
                const tagColor = template.tag?.color || "#64748b";
                return (
                  <div
                    key={template.id}
                    className="bg-[#1a1d24] border border-[#2a2e38] p-5 flex flex-col justify-between gap-4 shadow-lg hover:border-[#3b4252] transition-colors"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">{template.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <TagIcon className="w-3 h-3 text-[#64748b]" />
                            {template.tag ? (
                              <span
                                className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border"
                                style={{
                                  color: tagColor,
                                  borderColor: `${tagColor}30`,
                                  backgroundColor: `${tagColor}05`,
                                }}
                              >
                                Tag: {template.tag.name}
                              </span>
                            ) : (
                              <span className="text-[8px] font-medium text-[#64748b] italic">Not tagged</span>
                            )}
                          </div>
                        </div>

                        {!template.isPredefined ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => navigate(`/templates/edit/${template.id}`)}
                              className="px-2.5 py-1 bg-[#16181d] border border-[#2a2e38] text-[9px] font-bold uppercase tracking-widest text-[#94a3b8] hover:text-white hover:border-[#3b4252]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-1 border border-[#2a2e38] hover:border-red-500 bg-[#16181d] text-[#64748b] hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#00E5FF]/10 text-[#00E5FF] text-[8px] font-bold uppercase tracking-widest border border-[#00E5FF]/20">
                            Predefined
                          </span>
                        )}
                      </div>

                      {/* Template steps with tiny thumbnails */}
                      <div className="mt-4 space-y-2">
                        <span className="block text-[8px] font-bold tracking-widest uppercase text-[#64748b]">
                          Build Order ({template.buildings.length} steps)
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                          {template.buildings.map((type, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[8px] bg-[#16181d] border border-[#2a2e38] text-[#94a3b8] uppercase font-bold"
                            >
                              <img
                                src={`/buildings/${type.toLowerCase()}.png`}
                                alt={type}
                                className="w-4.5 h-4.5 object-cover"
                              />
                              <span>{idx + 1}. {BUILDING_NAMES[type] || type}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Template fleet target with tiny thumbnails */}
                      <div className="mt-4 space-y-2">
                        <span className="block text-[8px] font-bold tracking-widest uppercase text-[#64748b]">
                          Fleet Target
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {Object.entries(template.ships)
                            .filter(([_, count]) => count > 0)
                            .map(([shipType, count]) => (
                              <div key={shipType} className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] uppercase font-bold">
                                <img
                                  src={`/ships/${shipType.toLowerCase()}.png`}
                                  alt={shipType}
                                  className="w-4 h-4 object-cover border border-[#2a2e38]"
                                />
                                <span className="font-mono text-[#00E5FF]">{count}x</span>
                                <span>{SHIP_NAMES[shipType] || shipType}</span>
                              </div>
                            ))}
                          {Object.values(template.ships).every((count) => count === 0) && (
                            <span className="text-[8px] text-[#3b4252] font-medium italic">No fleet target</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Editor / Creator Mode */}
      {isEditing && (
        <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#2a2e38] pb-3">
            <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              {id ? "Adjust Build Template" : "Initialize Planet Template"}
            </h2>
            <button
              onClick={() => navigate("/templates")}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1d24] border border-[#2a2e38] text-[9px] font-bold uppercase tracking-wider text-[#94a3b8] hover:text-white"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </div>

          {/* Grid Layout: Config panel left, Simulation trace right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Left: Template Form configuration */}
            <div className="space-y-6 bg-[#1a1d24] border border-[#2a2e38] p-5">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
                    Template Name
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Mineral Hub Base..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-[#0a0b0e] border border-[#2a2e38] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
                    Link to Planet Tag
                  </label>
                  <select
                    value={templateTagId || "none"}
                    onChange={(e) => setTemplateTagId(e.target.value === "none" ? null : e.target.value)}
                    className="w-full bg-[#0a0b0e] border border-[#2a2e38] px-3 py-2 text-xs text-[#94a3b8] focus:outline-none focus:border-[#00E5FF] uppercase font-bold"
                  >
                    <option value="none">No tag connection</option>
                    {userTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Building sequence builder */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Building Build Order</h3>
                  <p className="text-[10px] text-[#64748b] mt-0.5">
                    Select a building to append. Buildings that cannot be built at the current stage due to resource storage or housing limitations are greyed out.
                  </p>
                </div>

                {/* Available buildings buttons with images, overall levels and conditional greyed-out state */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(BUILDING_NAMES).map(([type, name]) => {
                    const canAdd = canAppendBuilding(type);
                    const currentLevel = templateBuildings.filter((b) => b === type).length;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={!canAdd}
                        onClick={() => setTemplateBuildings((prev) => [...prev, type])}
                        className={`flex items-center gap-2.5 p-2 bg-[#16181d] border text-left transition-colors relative ${canAdd
                          ? "border-[#2a2e38] text-[#94a3b8] hover:border-[#00E5FF]/45 hover:text-white"
                          : "border-red-950/20 text-[#3b4252] cursor-not-allowed opacity-35"
                          }`}
                      >
                        <div className="w-8 h-8 bg-[#0a0b0e] border border-[#2a2e38] overflow-hidden shrink-0">
                          <img
                            src={`/buildings/${type.toLowerCase()}.png`}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <div className="flex justify-between items-baseline gap-1.5 w-full">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider truncate">{name}</span>
                            <span className="text-[11px] font-mono font-bold text-[#00E5FF] shrink-0 bg-[#00E5FF]/10 px-1 border border-[#00E5FF]/20">
                              {currentLevel}
                            </span>
                          </div>
                          {!canAdd && (
                            <div className="text-[7px] font-mono text-red-500 uppercase tracking-tight mt-0.5">Blocked</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Buildings Order list (VERTICAL LIST ONLY WITH DRAG AND DROP & IMAGES) */}
                <div className="bg-[#0a0b0e] border border-[#2a2e38] p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748b]">Template Steps (Drag to re-order)</span>
                    {templateBuildings.length > 0 && (
                      <button
                        onClick={() => setTemplateBuildings([])}
                        className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                    {templateBuildings.map((type, idx) => {
                      const occurrences = templateBuildings.slice(0, idx + 1).filter((t) => t === type).length;
                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, idx)}
                          className="flex items-center justify-between p-2.5 bg-[#1a1d24] border border-[#2a2e38] hover:border-[#3b4252] transition-colors cursor-grab active:cursor-grabbing group select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] text-[#64748b] font-mono font-bold shrink-0">[{idx + 1}]</span>
                            <div className="w-8 h-8 bg-[#0a0b0e] border border-[#2a2e38] overflow-hidden shrink-0">
                              <img
                                src={`/buildings/${type.toLowerCase()}.png`}
                                alt={BUILDING_NAMES[type] || type}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="truncate">
                              <span className="mr-2 px-1.5 py-0.5 bg-[#00E5FF]/10 text-[#00E5FF] text-[14px] font-extrabold uppercase border border-[#00E5FF]/20">
                                {occurrences}
                              </span>
                              <span className="text-[11px] uppercase font-bold text-white tracking-wider">
                                {BUILDING_NAMES[type] || type}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTemplateBuildings((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-zinc-500 hover:text-red-400 p-1 transition-colors shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {templateBuildings.length === 0 && (
                      <div className="text-center py-8 text-xs text-[#3b4252] italic uppercase">
                        Template contains no building actions. Append buildings above.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Fleet */}
              <div className="space-y-3 pt-3 border-t border-[#2a2e38]">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Target Fleet Garrison</h3>
                  <p className="text-[10px] text-[#64748b] mt-0.5">
                    Specify target ship quantities. The diagnostic sidebar on the right will dynamically compute housing updates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(SHIP_NAMES).map(([type, name]) => {
                    const count = templateShips[type] || 0;
                    const maxVal = maxShipsPossible[type] || 0;
                    const meta = shipsConfig[type] || {};
                    const popCost = meta.cost?.population || 0;
                    return (
                      <div key={type} className="bg-[#16181d] border border-[#2a2e38] p-4 flex flex-col justify-between gap-3 shadow-md">
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex gap-3 items-center min-w-0">
                            <div className="w-12 h-12 bg-[#0a0b0e] border border-[#2a2e38] overflow-hidden shrink-0">
                              <img
                                src={`/ships/${type.toLowerCase()}.png`}
                                alt={name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs uppercase font-extrabold tracking-wider text-white truncate">{name}</div>
                              <div className="text-[10px] text-[#64748b] mt-0.5">Crew: {popCost}</div>
                            </div>
                          </div>

                          {/* Precise Number Input */}
                          <input
                            type="number"
                            min="0"
                            value={count || ""}
                            placeholder="0"
                            onChange={(e) =>
                              setTemplateShips((prev) => ({
                                ...prev,
                                [type]: Math.max(0, parseInt(e.target.value, 10) || 0),
                              }))
                            }
                            className="w-16 bg-[#0a0b0e] border border-[#2a2e38] px-2 py-1 text-center text-[#00E5FF] font-mono text-xs font-bold focus:outline-none focus:border-[#00E5FF] select-none"
                          />
                        </div>

                        {/* Slider Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setTemplateShips((prev) => ({ ...prev, [type]: Math.max(0, count - 1) }))
                            }
                            className="w-8 h-8 flex items-center justify-center border border-[#2a2e38] text-[#94a3b8] hover:text-[#00E5FF] hover:border-[#00E5FF] transition-colors bg-[#0a0b0e]"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(50, count + maxVal)}
                            value={count}
                            onChange={(e) =>
                              setTemplateShips((prev) => ({
                                ...prev,
                                [type]: parseInt(e.target.value, 10) || 0,
                              }))
                            }
                            className="flex-1 accent-[#00E5FF] h-1.5 bg-[#0a0b0e] rounded-full appearance-none cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setTemplateShips((prev) => ({ ...prev, [type]: count + 1 }))
                            }
                            className="w-8 h-8 flex items-center justify-center border border-[#2a2e38] text-[#94a3b8] hover:text-[#00E5FF] hover:border-[#00E5FF] transition-colors bg-[#0a0b0e]"
                          >
                            +
                          </button>
                        </div>

                        {/* Helper text */}
                        <div className="text-[10px] flex justify-between items-center border-t border-[#1e2028] pt-2">
                          {maxVal > 0 ? (
                            <span className="text-[#64748b] uppercase tracking-wider font-semibold">
                              Surplus Max: <span className="text-emerald-400 font-mono font-bold">+{maxVal}</span>
                            </span>
                          ) : (
                            <span className="text-red-400 uppercase tracking-wider font-bold">
                              Housing Capacity Full
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3 border-t border-[#2a2e38]">
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!simulation.valid}
                  className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all ${simulation.valid
                    ? "bg-[#00E5FF] text-black hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                    }`}
                >
                  Save Template
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/templates")}
                  className="px-6 py-3 border border-[#2a2e38] text-[#64748b] hover:text-white text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Right: Simulation diagnostics panel */}
            <div className="space-y-4 bg-[#111317] border border-[#2a2e38] p-5 lg:sticky lg:top-24">
              <div className="border-b border-[#2a2e38] pb-3 mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Template Diagnostics</h3>
                {simulation.valid ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-extrabold uppercase border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)] animate-pulse">
                    ✓ Valid
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[8px] font-extrabold uppercase border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                    × Invalid
                  </span>
                )}
              </div>

              {/* Simulation status bar info */}
              <div className="space-y-3 bg-[#0a0b0e] border border-[#2a2e38] p-4 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] uppercase font-bold tracking-wider">Remaining Housing</span>
                  <span className={`font-mono font-bold ${simulation.theoreticalRemainingHousing >= 0 ? "text-[#00E5FF]" : "text-red-400"
                    }`}>
                    {simulation.theoreticalRemainingHousing.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] uppercase font-bold tracking-wider">Storage Capacity Achieved</span>
                  <span className="text-white font-mono font-bold">
                    {(simulation.trace[simulation.trace.length - 1]?.storage || 10000).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Errors container */}
              {simulation.errors.length > 0 && (
                <div className="bg-red-950/20 border border-red-500/20 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" /> Simulation Errors
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 text-[10px] leading-relaxed text-red-300 font-medium">
                    {simulation.errors.map((err, idx) => (
                      <div key={idx} className="flex gap-1.5 items-start">
                        <span className="text-[#64748b]">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trace log checklist */}
              <div className="space-y-2">
                <span className="block text-[8px] font-bold tracking-widest uppercase text-[#64748b]">
                  Simulation Trace Log
                </span>
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px]">
                  {simulation.trace.map((step) => {
                    const isStepError = simulation.errors.some((err) => err.startsWith(`Step ${step.step}:`));
                    return (
                      <div
                        key={step.step}
                        className={`flex items-center justify-between p-2 border ${isStepError
                          ? "bg-red-900/10 border-red-500/30 text-red-400"
                          : "bg-[#16181d] border-[#1e2028] text-[#94a3b8]"
                          }`}
                      >
                        <div className="min-w-0">
                          <span className="text-zinc-600 font-bold mr-1.5">[{step.step}]</span>
                          <span className="text-zinc-300 font-bold">{step.description}</span>
                        </div>
                        <div className="text-right shrink-0 text-zinc-500 text-[8px]">
                          H: {step.housingLeft} | S: {formatNumber(step.storage)}
                        </div>
                      </div>
                    );
                  })}
                  {simulation.trace.length === 0 && (
                    <div className="text-center text-zinc-600 italic py-4 uppercase">
                      Trace empty. No steps simulated.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
