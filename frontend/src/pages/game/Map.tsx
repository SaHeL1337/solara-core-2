import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  useMap,
  useMapEvents,
  Marker,
  Popup,
} from "react-leaflet";
import { renderToString } from "react-dom/server";
import { Globe, Hexagon, Sparkles } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGame } from "@/context/GameContext";

import { MapContextMenu, SpaceObject } from "./MapContextMenu";

// The base icon multiplier (how many pixels a size 1 object takes up)
const BASE_ICON_SIZE = 1;

const PLANET_COLORS = [
  "text-blue-400",
  "text-red-500",
  "text-green-400",
  "text-amber-400",
  "text-purple-400",
  "text-cyan-400",
  "text-emerald-400",
];

// Removed DUMMY_OBJECTS logic

function createIconMarkup(obj: SpaceObject, currentZoom: number, isMined: boolean = false) {
  // Scale factor: base 2 exponent of zoom.
  // e.g. zoom 0 = 1x, zoom -1 = 0.5x, zoom 1 = 2x
  const scale = Math.max(0.1, Math.abs(Math.pow(2, currentZoom)));
  
  const isUserPlanet = obj.type === "planet" && obj.name !== "Uncharted Planet";
  const sizeMultiplier = isUserPlanet ? 1.5 : 1;
  const scaledSize = obj.size * BASE_ICON_SIZE * scale * sizeMultiplier;

  if (obj.imageUrl) {
    let customStyle: any = {};
    let customClassName = "flex items-center justify-center drop-shadow-xl";
    if (isMined) {
      customClassName += " relative";
    }

    if (obj.type === "planet") {
      if (isUserPlanet) {
        customStyle = {
          filter: `drop-shadow(0 0 10px rgba(0,229,255,1)) drop-shadow(0 0 20px rgba(0,229,255,0.6)) brightness(1.2)`,
        };
        customClassName = "flex items-center justify-center animate-pulse z-[1000]";
      } else {
        const coordHash = Math.abs(Math.sin(obj.x * 34.5 + obj.y * 89.2)) * 10000;
        const hueRotate = Math.floor(coordHash % 360);
        customStyle = {
          filter: `hue-rotate(${hueRotate}deg) saturate(0.8) opacity(0.85)`,
        };
      }
    }

    return renderToString(
      <div
        className={customClassName}
        style={{ width: `${scaledSize}px`, height: `${scaledSize}px` }}
      >
        <img
          src={obj.imageUrl}
          alt={obj.name}
          className="w-full h-full object-contain pointer-events-none"
          style={customStyle}
        />
        {isMined && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00E5FF]/80 rounded-full animate-ping opacity-75"></div>}
        {isMined && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00E5FF] rounded-full border-[1.5px] border-zinc-950 shadow-[0_0_8px_#00E5FF]"></div>}
      </div>,
    );
  }

  let IconComponent = Globe;
  if (obj.type === "asteroid") IconComponent = Hexagon;
  if (obj.type === "anomaly") IconComponent = Sparkles;

  return renderToString(
    <div
      className={`flex items-center justify-center relative ${obj.color} drop-shadow-xl`}
      style={{ width: `${scaledSize}px`, height: `${scaledSize}px` }}
    >
      <IconComponent
        strokeWidth={1.5}
        style={{ width: "100%", height: "100%" }}
      />
      {isMined && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00E5FF] rounded-full animate-ping opacity-75"></div>}
      {isMined && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00E5FF] rounded-full border border-zinc-950 shadow-[0_0_5px_#00E5FF]"></div>}
    </div>,
  );
}

// A component to display zoom level and coordinates
function MapInfoPanel({ minersAvailable }: { minersAvailable: number | null }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [center, setCenter] = useState(map.getCenter());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setCenter(map.getCenter()),
  });

  return (
    <div className="absolute top-4 left-4 z-1000 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-xl text-white pointer-events-auto">
      <h3 className="text-lg font-bold mb-2 tracking-wide text-zinc-100">
        Nav-Computer
      </h3>
      <div className="text-sm space-y-1 font-mono">
        <div>
          <span className="text-zinc-400">Zoom:</span> {zoom.toFixed(1)}
        </div>
        <div>
          <span className="text-zinc-400">Pos:</span> X:{" "}
          {Math.round(center.lng)} Y: {Math.round(center.lat)}
        </div>
        {minersAvailable !== null && (
          <div className="pt-2 border-t border-zinc-800/80 mt-2">
            <span className="text-zinc-400">MINERs Avail:</span> <span className="text-[#00E5FF] font-bold">{minersAvailable}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// A custom layer that draws a simple grid representing Cartesian Space
function SpaceGridLayer() {
  const map = useMap();
  useEffect(() => {
    const SpaceGrid = L.GridLayer.extend({
      createTile: function () {
        const tile = document.createElement("div");
        tile.style.outline = "1px solid rgba(255, 255, 255, 0.05)";
        tile.style.backgroundColor = "transparent";
        // removed text content to keep it clean as requested
        return tile;
      },
    });

    const layer = new (SpaceGrid as any)({ tileSize: 256 });
    map.addLayer(layer);

    return () => {
      map.removeLayer(layer);
    };
  }, [map]);
  return null;
}

// Removed redundant MapEventsHandler

import api from "@/lib/api";

function MapDataFetcher({
  setZoom,
  setMapObjects,
  setLoadingMap,
}: {
  setZoom: (z: number) => void;
  setMapObjects: (objs: SpaceObject[]) => void;
  setLoadingMap: (l: boolean) => void;
}) {
  const map = useMapEvents({
    moveend: async () => {
      setZoom(map.getZoom());
      const bounds = map.getBounds();
      const minX = Math.floor(bounds.getWest() - 10);
      const maxX = Math.ceil(bounds.getEast() + 10);
      const minY = Math.floor(bounds.getSouth() - 10);
      const maxY = Math.ceil(bounds.getNorth() + 10);
      console.log("Fetching map objects for bounds:", minX, maxX, minY, maxY);
      try {
        setLoadingMap(true);
        const { data } = await api.get(
          `/map/objects?minX=${minX}&maxX=${maxX}&minY=${minY}&maxY=${maxY}`,
        );

        // Map backend formatted objects to add colors/details missing in backend
        const parsed = (data.data as SpaceObject[]).map((obj) => {
          let imageUrl;
          if (obj.type === "planet") {
            if (obj.name !== "Uncharted Planet") {
              imageUrl = "/assets/map/planet_1.svg"; // Complex visual for inhabited planets
            } else {
              const variants = [
                "/assets/map/planet_1.svg",
                "/assets/map/planet_2.svg",
                "/assets/map/planet_3.svg",
                "/assets/map/planet_4.svg",
              ];
              // Hash based on coordinates for consistent variety
              const coordHash = Math.abs(Math.sin(obj.x * 12.9898 + obj.y * 78.233)) * 43758.5453;
              imageUrl = variants[Math.floor(coordHash) % variants.length];
            }
          } else if (obj.type === "asteroid") {
            imageUrl = "/assets/map/asteroid.svg";
          } else if (obj.type === "anomaly") {
            imageUrl = "/assets/map/black_hole.svg";
          }

          // Compute color from coordinates for fallback UI
          const colorHash = Math.abs(Math.sin(obj.x * 4.23 + obj.y * 11.1)) * 10000;
          const planetColorIndex = Math.floor(colorHash) % PLANET_COLORS.length;

          return {
            ...obj,
            color:
              obj.type === "planet"
                ? PLANET_COLORS[planetColorIndex]
                : obj.type === "asteroid"
                  ? "text-stone-500"
                  : "text-purple-500",
            imageUrl,
          };
        });

        setMapObjects(parsed);
      } catch (error) {
        console.error("Failed to fetch map chunk:", error);
      } finally {
        setLoadingMap(false);
      }
    },
    zoomend: () => setZoom(map.getZoom()),
  });

  // Run once on mount to get initial view
  useEffect(() => {
    map.fire("moveend");
  }, [map]);

  return null;
}

function MapCenterer({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [center[0], center[1], map]);
  return null;
}

export default function Map() {
  const [zoom, setZoom] = useState(0);
  const [mapObjects, setMapObjects] = useState<SpaceObject[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const { selectedPlanet } = useGame();

  const searchParams = new URLSearchParams(window.location.search);
  const paramX = searchParams.get("x");
  const paramY = searchParams.get("y");
  
  const initialCenter: [number, number] = paramX !== null && paramY !== null
    ? [parseInt(paramY, 10), parseInt(paramX, 10)]
    : [selectedPlanet?.y || 0, selectedPlanet?.x || 0];

  const [minersAvailable, setMinersAvailable] = useState<number | null>(null);
  const [activeMiningTargets, setActiveMiningTargets] = useState<Set<string>>(new Set());

  // Fetch miners
  useEffect(() => {
    if (selectedPlanet) {
      api.get(`/ships/ships?planetId=${selectedPlanet.id}`).then((res) => {
        const ships = res.data.data.current;
        const miner = ships.find((s: any) => s.type === "MINER");
        setMinersAvailable(miner ? miner.count : 0);
      }).catch(console.error);
    }
  }, [selectedPlanet]);

  // Fetch current mining targets
  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const { data } = await api.get("/fleet/movements");
        const miningIds = new Set<string>();
        const movements = Array.isArray(data.data) ? data.data : (data.data.active || []);
        movements.forEach((m: any) => {
          if (m.missionType === "MINE" && (m.status === "EN_ROUTE" || m.status === "RETURNING") && m.targetId) {
            miningIds.add(m.targetId);
          }
        });
        setActiveMiningTargets(miningIds);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMovements();
    const interval = setInterval(fetchMovements, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMiningStarted = (targetId: string, usedMiners: number) => {
    setActiveMiningTargets((prev) => new Set(prev).add(targetId));
    setMinersAvailable((prev) => (prev !== null ? prev - usedMiners : null));
  };

  // Custom icons memoized
  const icons = useMemo(() => {
    const iconMap: Record<string, L.DivIcon> = {};
    const scale = Math.max(0.1, Math.abs(Math.pow(2, zoom)));

    mapObjects.forEach((obj) => {
      const scaledSize = obj.size * BASE_ICON_SIZE * scale;
      const isMined = activeMiningTargets.has(obj.id);
      iconMap[obj.id] = L.divIcon({
        html: createIconMarkup(obj, zoom, isMined),
        className: "bg-transparent border-none",
        iconSize: [scaledSize, scaledSize],
        iconAnchor: [scaledSize / 2, scaledSize / 2], // Center the icon
      });
    });
    return iconMap;
  }, [zoom, mapObjects, activeMiningTargets]);

  return (
    <div className="flex-1 w-full relative bg-zinc-950 h-[calc(100vh-64px)] overflow-hidden">
      <MapContainer
        crs={L.CRS.Simple}
        center={initialCenter}
        zoom={5}
        minZoom={4}
        maxZoom={5}
        // @ts-ignore Let Leaflet options pass through
        zoomControl={false} // Disable default zoom control UI to remove the bright white +/- artifact
        className="h-full w-full outline-none z-0"
        style={{ background: "#09090b", cursor: "grab" }}
      >
        <MapCenterer center={initialCenter} />
        <MapDataFetcher
          setZoom={setZoom}
          setMapObjects={setMapObjects}
          setLoadingMap={setLoadingMap}
        />
        <SpaceGridLayer />
        <MapInfoPanel minersAvailable={minersAvailable} />
        {loadingMap && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 bg-zinc-950/80 text-zinc-300 px-4 py-2 rounded-full text-sm border border-zinc-800 pointer-events-none">
            Scanning Sector...
          </div>
        )}

        {mapObjects.map((obj) => (
          <Marker key={obj.id} position={[obj.y, obj.x]} icon={icons[obj.id]}>
            <Popup
              className="custom-map-popup"
              closeButton={false}
              autoPanPadding={[50, 50]}
            >
              <div className="bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl p-4 text-white w-64 backdrop-blur-md">
                <MapContextMenu
                  object={obj}
                  onMiningStarted={handleMiningStarted}
                  onClose={() => {
                    // Handled inside via useMap().closePopup()
                  }}
                />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* No manual floating context overlay rendering required since we use Popup */}
    </div>
  );
}
