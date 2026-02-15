import { Home, Pickaxe, Rocket, FlaskConical, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@clerk/clerk-react";

export function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: "Overview", path: "/dashboard" },
    { icon: Pickaxe, label: "Buildings", path: "/buildings" },
    { icon: Rocket, label: "Fleet", path: "/fleet" },
    { icon: FlaskConical, label: "Research", path: "/research" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
      <div className="p-6">
        <h1 className="text-3xl font-bold tracking-tighter text-blue-500">
          SOLARA<span className="text-slate-400">CORE</span>
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-blue-600/10 text-blue-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        <SignOutButton />
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest text-center">
          v0.4.2-ALPHA
        </div>
      </div>
    </div>
  );
}
