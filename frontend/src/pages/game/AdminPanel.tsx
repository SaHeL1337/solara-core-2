import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Shield, Trash2, AlertTriangle, Users, RefreshCw } from "lucide-react";

type GameUser = {
  id: string;
  flux: number;
  planetCount: number;
  lastUpdate: string;
};

export default function AdminPanel() {
  const [users, setUsers] = useState<GameUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId: string) => {
    if (confirmId !== userId) {
      // First click — ask for confirmation
      setConfirmId(userId);
      return;
    }

    // Second click — actually delete
    setDeletingId(userId);
    setConfirmId(null);

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-[#00E5FF] animate-pulse font-bold tracking-widest uppercase">
          Loading Admin Panel...
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="bg-red-500/10 border border-red-500/30 p-6 flex flex-col items-center gap-3">
          <AlertTriangle className="size-6 text-red-400" />
          <div className="text-red-400 font-bold tracking-wide uppercase text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="size-5 text-red-400" />
            <h1 className="text-xl font-bold text-white tracking-wide uppercase">
              Admin Panel
            </h1>
          </div>
          <p className="text-[#94a3b8] text-xs mt-1 uppercase tracking-wider font-bold">
            Game User Management
          </p>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            fetchUsers();
          }}
          className="flex items-center gap-2 bg-[#1e2028] hover:bg-[#2a2e38] text-[#94a3b8] hover:text-[#e2e8f0] font-bold py-2 px-4 text-xs tracking-wide transition-colors uppercase border border-[#2a2e38]"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-3 flex items-center gap-3">
          <AlertTriangle className="size-4 text-red-400 shrink-0" />
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider">{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="size-4 text-[#00E5FF]" />
            <span className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase">
              Total Players
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#e2e8f0]">
            {users.length}
          </div>
        </div>
        <div className="bg-[#1a1d24] border border-[#2a2e38] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="size-4 text-red-400" />
            <span className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase">
              Total Planets
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#e2e8f0]">
            {users.reduce((sum, u) => sum + u.planetCount, 0)}
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-[#1a1d24] border border-[#2a2e38] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_100px_120px] gap-4 px-6 py-3 bg-[#16181d] border-b border-[#2a2e38] text-[9px] font-bold text-[#64748b] tracking-widest uppercase">
          <div>User ID</div>
          <div className="text-center">Planets</div>
          <div className="text-center">Flux</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Table Body */}
        {users.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center opacity-50 text-center">
            <Users className="size-8 text-[#64748b] mb-3" />
            <div className="text-[#94a3b8] text-xs font-bold tracking-widest uppercase">
              No registered players
            </div>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_100px_100px_120px] gap-4 px-6 py-4 border-b border-[#2a2e38]/50 hover:bg-[#1e2028]/50 transition-colors items-center"
            >
              {/* User ID */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-8 bg-[#16181d] border border-[#2a2e38] flex items-center justify-center shrink-0">
                  <Users className="size-4 text-[#00E5FF]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono text-[#e2e8f0] truncate" title={user.id}>
                    {user.id}
                  </div>
                </div>
              </div>

              {/* Planet Count */}
              <div className="text-center text-xs font-mono text-[#00E5FF]">
                {user.planetCount}
              </div>

              {/* Flux */}
              <div className="text-center text-xs font-mono text-yellow-400">
                {user.flux.toLocaleString("de-DE")}
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleDelete(user.id)}
                  disabled={deletingId === user.id}
                  className={`flex items-center gap-2 py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    confirmId === user.id
                      ? "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30 animate-pulse"
                      : deletingId === user.id
                        ? "bg-[#2a2e38] border-[#2a2e38] text-[#64748b] cursor-not-allowed"
                        : "bg-[#1e2028] border-[#2a2e38] text-[#94a3b8] hover:border-red-500/50 hover:text-red-400"
                  }`}
                >
                  {deletingId === user.id ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  {confirmId === user.id
                    ? "Confirm?"
                    : deletingId === user.id
                      ? "Deleting..."
                      : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
