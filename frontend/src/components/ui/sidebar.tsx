import { Rocket, Map, LayoutGrid, Building2, Medal } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SignOutButton } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { PlanetSelector } from "@/components/game/PlanetSelector";

export function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutGrid, label: "Overview", path: "/dashboard" },
    { icon: Building2, label: "Buildings", path: "/buildings" },
    { icon: Rocket, label: "Shipyard", path: "/shipyard" },
    { icon: Medal, label: "Fleet", path: "/fleet" },
    { icon: Map, label: "Map", path: "/map" },
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
      </nav>

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
