import { useEffect, useState, useCallback, useRef } from "react";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";
import ShipList from "@/components/game/ShipList";
import ShipQueueList from "@/components/game/ShipQueueList";

export default function Shipyard() {
  const { selectedPlanet, refreshUser } = useGame();

  const [availableShips, setAvailableShips] = useState<Record<string, any>>({});
  const [currentShips, setCurrentShips] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isQueueing, setIsQueueing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const prevPlanetId = useRef<string | null>(null);

  const fetchShips = useCallback(async () => {
    if (!selectedPlanet?.id) return;
    try {
      const { data } = await api.get(
        `/ships/ships?planetId=${selectedPlanet.id}`,
      );
      setAvailableShips(data.data.available);
      setCurrentShips(data.data.current);
      setQueue(data.data.queue);
    } catch (err) {
      console.error("Failed to fetch ships", err);
    }
  }, [selectedPlanet?.id]);

  useEffect(() => {
    const loadData = async () => {
      if (prevPlanetId.current !== selectedPlanet?.id) {
        setIsLoading(true);
        setAvailableShips({});
        setCurrentShips([]);
        setQueue([]);
      }

      await fetchShips();

      setIsLoading(false);
      if (selectedPlanet?.id) {
        prevPlanetId.current = selectedPlanet.id;
      }
    };
    if (selectedPlanet) {
      loadData();
    }
  }, [selectedPlanet?.id, fetchShips]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (queue.length > 0 && queue[0].startedAt) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [queue]);

  useEffect(() => {
    if (queue.length > 0 && queue[0].startedAt) {
      const q = queue[0];
      const start = new Date(q.startedAt).getTime();
      const elapsedSec = Math.floor((now - start) / 1000);

      const totalRemSec =
        (q.quantity - q.completedCount) * q.durationSec -
        (elapsedSec % q.durationSec);

      if (elapsedSec > 0 && elapsedSec % q.durationSec === 0) {
        // an individual ship finished in the queue
        fetchShips();
        refreshUser();
      }

      if (totalRemSec <= 0) {
        // queue completely finished
        fetchShips();
        refreshUser();
      }
    }
  }, [now, queue, fetchShips, refreshUser]);

  const handleQueueShips = async (type: string, quantity: number) => {
    if (!selectedPlanet) return;
    try {
      setIsQueueing(true);
      await api.post("/ships/queue", {
        planetId: selectedPlanet.id,
        shipType: type,
        quantity,
      });
      await fetchShips();
      await refreshUser();
    } catch (err) {
      console.error("Failed to queue ships", err);
    } finally {
      setIsQueueing(false);
    }
  };

  if (!selectedPlanet) {
    return (
      <div className="p-4 text-slate-300">
        Select a planet to view the shipyard.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-slate-300">Loading shipyard...</div>;
  }

  return (
    <div className="space-y-8">
      <ShipQueueList queue={queue} availableShips={availableShips} now={now} />
      <ShipList
        selectedPlanet={selectedPlanet}
        availableShips={availableShips}
        currentShips={currentShips}
        onQueueShips={handleQueueShips}
        isQueueing={isQueueing}
      />
    </div>
  );
}
