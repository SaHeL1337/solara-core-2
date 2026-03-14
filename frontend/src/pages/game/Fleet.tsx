import { useGame } from "@/context/GameContext";

export default function Fleet() {
  const { selectedPlanet } = useGame();

  if (!selectedPlanet) {
    return <div>Select a planet to view the fleet.</div>;
  }

  return <div>Fleet</div>;
}
