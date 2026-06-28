import { useState, useEffect } from "react";
import { Rocket, Map, LayoutGrid, Building2, Medal, Shield, Mail, Copy, Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SignOutButton, useUser } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { PlanetSelector } from "@/components/game/PlanetSelector";
import api from "@/lib/api";

export function Sidebar() {
  const location = useLocation();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data } = await api.get("/users/is-admin");
        setIsAdmin(data.isAdmin);
      } catch (err) {
        // Not admin or error — hide admin panel
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const menuItems = [
    { icon: LayoutGrid, label: "Overview", path: "/dashboard" },
    { icon: Building2, label: "Buildings", path: "/buildings" },
    { icon: Rocket, label: "Shipyard", path: "/shipyard" },
    { icon: Medal, label: "Fleet", path: "/fleet" },
    { icon: Map, label: "Map", path: "/map" },
    { icon: Mail, label: "Messages", path: "/messages" },
  ];

  return (
    <div className="w-64 border-r border-[#1e2028] bg-[#16181d] flex flex-col pt-6">
      <div className="px-6 pb-6 border-b border-[#1e2028]/50">
        {/* LOGO area - like in images 2 & 3 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#00E5FF]">
            Solara<span className="text-[#00E5FF]/80">Core</span>
          </h1>
        </div>
        
        {/* Planet Selector / Sector Info */}
        <PlanetSelector />
      </div>

      <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-6 py-3 transition-colors text-sm font-medium border-l-2",
                isActive
                  ? "bg-[#1e2028] text-[#00E5FF] border-[#00E5FF]"
                  : "border-transparent text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2028]/50",
              )}
            >
              <item.icon className={cn("size-5", isActive ? "text-[#00E5FF]" : "text-[#94a3b8]")} />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}

        {/* Admin Panel — only shown for game admins */}
        {isAdmin && (
          <>
            <div className="mx-6 my-2 border-t border-[#2a2e38]/50" />
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-4 px-6 py-3 transition-colors text-sm font-medium border-l-2",
                location.pathname.startsWith("/admin")
                  ? "bg-[#1e2028] text-red-400 border-red-400"
                  : "border-transparent text-red-400/60 hover:text-red-400 hover:bg-[#1e2028]/50",
              )}
            >
              <Shield className={cn("size-5", location.pathname.startsWith("/admin") ? "text-red-400" : "text-red-400/60")} />
              <span className="tracking-wide">Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* User ID display */}
      {user?.id && (
        <div className="px-6 pb-3">
          <button
            onClick={copyUserId}
            className="w-full flex items-center gap-2 bg-[#111317] border border-[#2a2e38] hover:border-[#3b4252] py-2 px-3 text-left transition-colors group"
            title={`Click to copy: ${user.id}`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold text-[#64748b] tracking-widest uppercase mb-0.5">
                User ID
              </div>
              <div className="text-[10px] font-mono text-[#94a3b8] truncate">
                {user.id}
              </div>
            </div>
            {copied ? (
              <Check className="size-3 text-green-400 shrink-0" />
            ) : (
              <Copy className="size-3 text-[#64748b] group-hover:text-[#94a3b8] shrink-0 transition-colors" />
            )}
          </button>
        </div>
      )}

      <div className="p-6">
        <SignOutButton>
          <button className="w-full bg-[#1e2028] hover:bg-[#2a2e38] text-[#94a3b8] hover:text-[#e2e8f0] font-bold py-3 text-sm tracking-wide transition-colors uppercase border border-[#2a2e38]">
            Logout
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
