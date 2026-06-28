import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Sidebar } from "@/components/ui/sidebar";
import ResourceHeader from "@/components/game/ResourceHeader";
import { setupInterceptors } from "@/lib/api";
import { GameProvider, useGame } from "@/context/GameContext";
import PlayerSetup from "@/pages/game/PlayerSetup";
import CoreOffline from "@/pages/game/CoreOffline";

function GameContent() {
  const location = useLocation();
  const { user, isLoading, isCoreOffline } = useGame();

  if (isCoreOffline) {
    return <CoreOffline />;
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  // Gate: Show setup screen if player hasn't completed setup
  if (user && !user.isSetupComplete) {
    return <PlayerSetup />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar /> {/* Your game menu */}
      <div className="flex-1 flex flex-col">
        <ResourceHeader /> {/* Your Gold, Wood, etc. */}
        <main
          className={`flex-1 overflow-auto ${location.pathname === "/map" ? "p-0 overflow-hidden" : "p-6"}`}
        >
          <Outlet /> {/* This is where Dashboard or Buildings will appear */}
        </main>
      </div>
    </div>
  );
}

export default function GameLayout() {
  const { getToken } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setupInterceptors(getToken);
    setIsReady(true);
  }, [getToken]);

  if (!isReady)
    return (
      <div className="h-screen bg-background flex items-center justify-center text-white">
        Loading...
      </div>
    );

  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

