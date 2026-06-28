import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api from "@/lib/api";

export interface Tag {
  id: string;
  name: string;
  color: string;
  properties: Record<string, any>;
}

export interface PlanetTemplate {
  id: string;
  name: string;
  buildings: string[];
  ships: Record<string, number>;
  tagId: string | null;
  tag?: Tag | null;
  isPredefined?: boolean;
}

// Define strict types for our resources and state
export interface Planet {
  id: string;
  name: string;
  titanium: number;
  silicate: number;
  isotope: number;
  x: number;
  y: number;
  production: {
    titanium: number;
    silicate: number;
    isotope: number;
  };
  population: number;
  populationCapacity: number;
  storageCapacity: number;
  sovereignty: number;
  sovereigntyUpdatedAt: string;
  tags: Tag[];
}

export interface UserState {
  id: string;
  username: string;
  flux: number;
  planets: Planet[];
  isSetupComplete: boolean;
  isDefeated: boolean;
  displayName: string | null;
  playerClass: string | null;
  tags: Tag[];
  templates: PlanetTemplate[];
}

interface GameContextType {
  user: UserState | null;
  selectedPlanet: Planet | null;
  isLoading: boolean;
  isCoreOffline: boolean;
  refreshUser: () => Promise<void>;
  selectPlanet: (planetId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoreOffline, setIsCoreOffline] = useState(false);

  const fetchUser = async () => {
    try {
      const { data } = await api.get("/users/state");
      setUser(data);
      setIsCoreOffline(false);

      // Update selected planet with fresh data without relying on stale closures
      if (data.planets && data.planets.length > 0) {
        setSelectedPlanet((prev) => {
          if (!prev) return data.planets[0];
          const updatedPlanet = data.planets.find(
            (p: Planet) => p.id === prev.id,
          );
          return updatedPlanet || data.planets[0];
        });
      }
    } catch (error: any) {
      console.error("Failed to fetch user state:", error);
      // Check if it's a network error or gateway status
      if (!error.response || [502, 503, 504].includes(error.response.status)) {
        setIsCoreOffline(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    const interval = setInterval(() => {
      fetchUser();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const selectPlanet = (planetId: string) => {
    if (!user) return;
    const planet = user.planets.find((p) => p.id === planetId);
    if (planet) {
      setSelectedPlanet(planet);
    }
  };

  return (
    <GameContext.Provider
      value={{
        user,
        selectedPlanet,
        isLoading,
        isCoreOffline,
        refreshUser: fetchUser,
        selectPlanet,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
