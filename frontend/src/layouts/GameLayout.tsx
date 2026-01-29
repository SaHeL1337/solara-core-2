import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/ui/sidebar";
import ResourceHeader from "@/components/game/ResourceHeader";

export default function GameLayout() {
  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <Sidebar /> {/* Your game menu */}
      <div className="flex-1 flex flex-col">
        <ResourceHeader /> {/* Your Gold, Wood, etc. */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet /> {/* This is where Dashboard or Buildings will appear */}
        </main>
      </div>
    </div>
  );
}
