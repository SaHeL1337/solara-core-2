import { useState } from "react";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Tag as TagIcon, Trash2, AlertCircle, Globe } from "lucide-react";

const PRESET_COLORS = [
  { value: "#00E5FF", name: "Cyan" },
  { value: "#ef4444", name: "Red" },
  { value: "#10b981", name: "Green" },
  { value: "#f59e0b", name: "Amber" },
  { value: "#8b5cf6", name: "Purple" },
  { value: "#f97316", name: "Orange" },
];

export default function Tags() {
  const { user, refreshUser } = useGame();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0].value);
  const [tagError, setTagError] = useState<string | null>(null);

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
      toast.success(`Tag "${newTagName.trim()}" created successfully`);
      await refreshUser();
    } catch (err: any) {
      setTagError(err.response?.data?.error || "Failed to create tag");
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag? It will be removed from all planets and templates.")) return;
    try {
      await api.delete(`/tags/${tagId}`);
      toast.success("Tag deleted successfully");
      await refreshUser();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete tag");
    }
  };

  if (!user) {
    return <div className="p-4 text-[#94a3b8]">Loading...</div>;
  }

  const userTags = user.tags || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#2a2e38] pb-3">
        <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-[#00E5FF]" />
          Planetary Tags Management
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left: Create Tag Form */}
        <form onSubmit={handleCreateTag} className="bg-[#1a1d24] border border-[#2a2e38] p-5 space-y-4 shadow-lg">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest border-b border-[#2a2e38] pb-2">
            Create Custom Tag
          </h2>

          <div>
            <label className="block text-[9px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
              Tag Name
            </label>
            <input
              type="text"
              placeholder="E.g. Mining Sector..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              maxLength={20}
              className="w-full bg-[#0a0b0e] border border-[#2a2e38] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold tracking-widest uppercase text-[#64748b] mb-1.5">
              Tag Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewTagColor(color.value)}
                  className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center ${
                    newTagColor === color.value
                      ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {newTagColor === color.value && <CheckIcon />}
                </button>
              ))}
            </div>
          </div>

          {tagError && (
            <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider bg-red-900/10 border border-red-500/20 p-2.5 text-center flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {tagError}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black text-xs font-bold uppercase tracking-wider transition-all"
          >
            Create New Tag
          </button>
        </form>

        {/* Right: Existing Tags */}
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest border-b border-[#2a2e38] pb-2">
            Active Custom Tags ({userTags.length})
          </h2>

          {userTags.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#3b4252] italic uppercase">
              No tags created yet. Fill the left form to initialize one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userTags.map((tag) => {
                // Count planets with this tag
                const planetsWithTag = user.planets?.filter((p) => p.tags?.some((t) => t.id === tag.id)) || [];

                return (
                  <div
                    key={tag.id}
                    className="bg-[#16181d] border border-[#2a2e38] p-4 flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        <span className="text-xs font-bold uppercase text-white truncate tracking-wider">
                          {tag.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-[#64748b] hover:text-red-400 p-1 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] text-[#64748b] flex items-center gap-1.5 border-t border-[#1e2028] pt-2 mt-1 uppercase font-semibold">
                      <Globe className="w-3 h-3" />
                      <span>Linked Planets: <span className="text-white font-mono">{planetsWithTag.length}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={3}
      stroke="white"
      className="w-4 h-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
