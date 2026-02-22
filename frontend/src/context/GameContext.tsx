import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api from "@/lib/api";

// Define strict types for our resources and state
export interface Planet {
  id: string;
  name: string;
  titanium: number;
  silicate: number;
  isotope: number;
  // Add other planet properties as needed (e.g., coordinates, type)
}

export interface UserState {
  id: string;
  username: string;
  flux: number;
  planets: Planet[];
}

interface GameContextType {
  user: UserState | null;
  selectedPlanet: Planet | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  selectPlanet: (planetId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data } = await api.get("/users/state");
      setUser(data);

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
    } catch (error) {
      console.error("Failed to fetch user state:", error);
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
