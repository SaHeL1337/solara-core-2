import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  MapContainer,
  useMap,
  useMapEvents,
  Marker,
} from "react-leaflet";
import { renderToString } from "react-dom/server";
import { Globe, Hexagon, Sparkles } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGame } from "@/context/GameContext";

import { MapDetailPanel, SpaceObject } from "./MapContextMenu";

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

function createIconMarkup(obj: SpaceObject, currentZoom: number, isMined: boolean = false, isScanned: boolean = false, isSelected: boolean = false) {
  // Scale factor: base 2 exponent of zoom.
  const scale = Math.max(0.1, Math.abs(Math.pow(2, currentZoom)));
  
  const isUserPlanet = obj.type === "planet" && obj.name !== "Uncharted Planet";
  const sizeMultiplier = isUserPlanet ? 1.5 : 1;
  const scaledSize = obj.size * BASE_ICON_SIZE * scale * sizeMultiplier;

  if (obj.imageUrl) {
    let customStyle: any = {};
    let customClassName = "flex items-center justify-center drop-shadow-xl relative";

    if (obj.type === "planet") {
      if (isUserPlanet) {
        customStyle = {
          filter: `drop-shadow(0 0 10px rgba(0,229,255,1)) drop-shadow(0 0 20px rgba(0,229,255,0.6)) brightness(1.2)`,
        };
        customClassName = "flex items-center justify-center animate-pulse z-[1000] relative";
      } else {
        const coordHash = Math.abs(Math.sin(obj.x * 34.5 + obj.y * 89.2)) * 10000;
        const hueRotate = Math.floor(coordHash % 360);
        customStyle = {
          filter: `hue-rotate(${hueRotate}deg) saturate(0.8) opacity(0.85)`,
        };
      }
    }

    // Override with selection glow
    if (isSelected) {
      customStyle = {
        ...customStyle,
        filter: `${customStyle.filter || ""} drop-shadow(0 0 12px rgba(0,229,255,0.9)) brightness(1.3)`.trim(),
      };
    }

    return renderToString(
      <div
        className={customClassName}
        style={{ width: `${scaledSize}px`, height: `${scaledSize}px` }}
      >
        {isSelected && (
          <div style={{
            position: "absolute",
            inset: "-8px",
            border: "2px solid rgba(0,229,255,0.6)",
            borderRadius: "50%",
            boxShadow: "0 0 20px rgba(0,229,255,0.4), 0 0 40px rgba(0,229,255,0.15), inset 0 0 15px rgba(0,229,255,0.1)",
            animation: "pulse 2s ease-in-out infinite",
          }} />
        )}
        <img
          src={obj.imageUrl}
          alt={obj.name}
          className="w-full h-full object-contain pointer-events-none"
          style={customStyle}
        />
        {isMined && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00E5FF]/80 rounded-full animate-ping opacity-75"></div>}
        {isMined && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00E5FF] rounded-full border-[1.5px] border-zinc-950 shadow-[0_0_8px_#00E5FF]"></div>}
        
        {/* Scan Status Indicators */}
        {isScanned && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-emerald-500 animate-[ping_2s_linear_infinite] pointer-events-none"></div>}
        {isScanned && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 border border-emerald-500/50 text-emerald-400 text-[8px] px-1 py-0.5 rounded shadow-lg z-[1001]">Scanning</div>}
        
        {!isScanned && obj.scanStatus === "success" && (
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[1.5px] border-zinc-950 shadow-[0_0_6px_#10B981] flex items-center justify-center text-[8px] text-zinc-950 font-extrabold select-none z-[1001]">
            ✓
          </div>
        )}
        {!isScanned && obj.scanStatus === "failed" && (
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-[1.5px] border-zinc-950 shadow-[0_0_6px_#F43F5E] flex items-center justify-center text-[8px] text-white font-extrabold select-none z-[1001]">
            ×
          </div>
        )}
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
      {isSelected && (
        <div style={{
          position: "absolute",
          inset: "-8px",
          border: "2px solid rgba(0,229,255,0.6)",
          borderRadius: "50%",
          boxShadow: "0 0 20px rgba(0,229,255,0.4), 0 0 40px rgba(0,229,255,0.15)",
          animation: "pulse 2s ease-in-out infinite",
        }} />
      )}
      <IconComponent
        strokeWidth={1.5}
        style={{ width: "100%", height: "100%" }}
      />
      {isMined && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00E5FF] rounded-full animate-ping opacity-75"></div>}
      {isMined && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00E5FF] rounded-full border border-zinc-950 shadow-[0_0_5px_#00E5FF]"></div>}
      
      {/* Scan Status Indicators */}
      {isScanned && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-emerald-500 animate-[ping_2s_linear_infinite] pointer-events-none"></div>}
      {isScanned && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 border border-emerald-500/50 text-emerald-400 text-[8px] px-1 py-0.5 rounded shadow-lg z-[1001]">Scanning</div>}
      
      {!isScanned && obj.scanStatus === "success" && (
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[1.5px] border-zinc-950 shadow-[0_0_6px_#10B981] flex items-center justify-center text-[8px] text-zinc-950 font-extrabold select-none z-[1001]">
          ✓
        </div>
      )}
      {!isScanned && obj.scanStatus === "failed" && (
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-[1.5px] border-zinc-950 shadow-[0_0_6px_#F43F5E] flex items-center justify-center text-[8px] text-white font-extrabold select-none z-[1001]">
          ×
        </div>
      )}
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

import api from "@/lib/api";

function MapDataFetcher({
  setZoom,
  setMapObjects,
  setLoadingMap,
  refreshTrigger,
}: {
  setZoom: (z: number) => void;
  setMapObjects: (objs: SpaceObject[]) => void;
  setLoadingMap: (l: boolean) => void;
  refreshTrigger: number;
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
              imageUrl = "/assets/map/planet_1.svg";
            } else {
              const variants = [
                "/assets/map/planet_1.svg",
                "/assets/map/planet_2.svg",
                "/assets/map/planet_3.svg",
                "/assets/map/planet_4.svg",
              ];
              const coordHash = Math.abs(Math.sin(obj.x * 12.9898 + obj.y * 78.233)) * 43758.5453;
              imageUrl = variants[Math.floor(coordHash) % variants.length];
            }
          } else if (obj.type === "asteroid") {
            imageUrl = "/assets/map/asteroid.svg";
          } else if (obj.type === "anomaly") {
            imageUrl = "/assets/map/black_hole.svg";
          }

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

  // Run once on mount and on refreshTrigger update to get initial view / update view
  useEffect(() => {
    map.fire("moveend");
  }, [map, refreshTrigger]);

  return null;
}

function MapCenterer({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [center[0], center[1], map]);
  return null;
}

/**
 * Smoothly pans/flies the map to a target when it changes.
 */
function MapFlyer({ target, panelOpen }: { target: [number, number] | null; panelOpen: boolean }) {
  const map = useMap();
  const lastTarget = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!target) return;
    lastTarget.current = target;

    const mapSize = map.getSize();
    const targetPoint = map.latLngToContainerPoint(L.latLng(target[0], target[1]));
    
    // Shift target to the left (center of the remaining 70% of screen)
    // Adding to targetPoint.x shifts the focused center coordinates to the right,
    // which visually positions the selected object to the left at 35% screen width.
    const offsetPixels = panelOpen ? mapSize.x * 0.15 : 0;
    const offsetPoint = L.point(targetPoint.x + offsetPixels, targetPoint.y);
    const offsetLatLng = map.containerPointToLatLng(offsetPoint);

    map.flyTo(offsetLatLng, map.getZoom(), { duration: 0.5, easeLinearity: 0.5 });
  }, [target, panelOpen, map]);

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
  const [activeScanTargets, setActiveScanTargets] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Selected object for side panel
  const [selectedObject, setSelectedObject] = useState<SpaceObject | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

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

  const activeMissionsRef = useRef<string[]>([]);

  // Fetch current mining targets
  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const { data } = await api.get("/fleet/movements");
        const miningIds = new Set<string>();
        const scanIds = new Set<string>();
        const currentActiveMissions: string[] = [];

        const movements = Array.isArray(data.data) ? data.data : (data.data.active || []);
        movements.forEach((m: any) => {
          if (m.missionType === "MINE" && (m.status === "EN_ROUTE" || m.status === "RETURNING") && m.targetId) {
            miningIds.add(m.targetId);
          }
          if (m.missionType === "SCAN" && m.status === "EN_ROUTE" && m.targetId) {
            scanIds.add(m.targetId);
          }
          if (["SCAN", "CONQUER", "ATTACK"].includes(m.missionType) && m.status === "EN_ROUTE") {
            currentActiveMissions.push(m.id);
          }
        });

        let changed = false;
        
        // If a previously active mission completed, trigger map reload
        const hasCompletedMission = activeMissionsRef.current.some(
          (id) => !currentActiveMissions.includes(id)
        );
        activeMissionsRef.current = currentActiveMissions;

        if (hasCompletedMission) {
          changed = true;
        }

        setActiveScanTargets((prev) => {
          if (prev.size !== scanIds.size) {
            changed = true;
          } else {
            for (const id of scanIds) {
              if (!prev.has(id)) {
                changed = true;
                break;
              }
            }
          }
          return scanIds;
        });

        setActiveMiningTargets(miningIds);

        if (changed) {
          setRefreshTrigger((prev) => prev + 1);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMovements();
    const interval = setInterval(fetchMovements, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMiningStarted = (targetId: string, usedMiners: number) => {
    setActiveMiningTargets((prev) => new Set(prev).add(targetId));
    setMinersAvailable((prev) => (prev !== null ? prev - usedMiners : null));
  };

  const handleScannerStarted = (targetId: string) => {
    setActiveScanTargets((prev) => new Set(prev).add(targetId));
  };

  const handleObjectClick = useCallback((obj: SpaceObject) => {
    setSelectedObject(obj);
    setFlyTarget([obj.y, obj.x]);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedObject(null);
    setFlyTarget(null);
  }, []);

  // Custom icons memoized
  const icons = useMemo(() => {
    const iconMap: Record<string, L.DivIcon> = {};
    const scale = Math.max(0.1, Math.abs(Math.pow(2, zoom)));

    mapObjects.forEach((obj) => {
      const scaledSize = obj.size * BASE_ICON_SIZE * scale;
      const isMined = activeMiningTargets.has(obj.id);
      const isScanned = activeScanTargets.has(obj.id);
      const isSelected = selectedObject?.id === obj.id;
      iconMap[obj.id] = L.divIcon({
        html: createIconMarkup(obj, zoom, isMined, isScanned, isSelected),
        className: "bg-transparent border-none",
        iconSize: [scaledSize, scaledSize],
        iconAnchor: [scaledSize / 2, scaledSize / 2],
      });
    });
    return iconMap;
  }, [zoom, mapObjects, activeMiningTargets, activeScanTargets, selectedObject?.id]);

  const panelOpen = selectedObject !== null;

  return (
    <div className="flex-1 w-full relative bg-zinc-950 h-[calc(100vh-80px)] overflow-hidden">
      {/* Map area — always full width */}
      <div className="w-full h-full relative">
        <MapContainer
          crs={L.CRS.Simple}
          center={initialCenter}
          zoom={5}
          minZoom={4}
          maxZoom={5}
          // @ts-ignore Let Leaflet options pass through
          zoomControl={false}
          className="h-full w-full outline-none z-0"
          style={{ background: "#09090b", cursor: "grab" }}
        >
          <MapCenterer center={initialCenter} />
          <MapFlyer target={flyTarget} panelOpen={panelOpen} />
          <MapDataFetcher
            setZoom={setZoom}
            setMapObjects={setMapObjects}
            setLoadingMap={setLoadingMap}
            refreshTrigger={refreshTrigger}
          />
          <SpaceGridLayer />
          <MapInfoPanel minersAvailable={minersAvailable} />
          {loadingMap && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 bg-zinc-950/80 text-zinc-300 px-4 py-2 rounded-full text-sm border border-zinc-800 pointer-events-none">
              Scanning Sector...
            </div>
          )}

          {mapObjects.map((obj) => (
            <Marker
              key={obj.id}
              position={[obj.y, obj.x]}
              icon={icons[obj.id]}
              eventHandlers={{
                click: () => handleObjectClick(obj),
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Side Panel — absolute overlay from right */}
      <div
        className={`absolute top-0 right-0 h-full transition-all duration-300 ease-out overflow-hidden z-[1000] shadow-2xl bg-[#111317] ${
          panelOpen ? "w-[30%] min-w-[320px] border-l border-[#1e2028]" : "w-0 border-l-0"
        }`}
      >
        {selectedObject && (
          <MapDetailPanel
            key={selectedObject.id}
            object={selectedObject}
            onMiningStarted={handleMiningStarted}
            onScannerStarted={handleScannerStarted}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
}
