import { useGame } from "@/context/GameContext";

export default function Shipyard() {
  const { selectedPlanet } = useGame();

  if (!selectedPlanet) {
    return <div>Select a planet to view the shipyard.</div>;
  }

  return <div>Shipyard</div>;
}
