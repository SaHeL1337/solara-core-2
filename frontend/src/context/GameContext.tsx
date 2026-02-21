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

      // Select first planet by default if none selected or if current selection is invalid
      if (data.planets && data.planets.length > 0) {
        if (
          !selectedPlanet ||
          !data.planets.find((p: Planet) => p.id === selectedPlanet.id)
        ) {
          setSelectedPlanet(data.planets[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
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
