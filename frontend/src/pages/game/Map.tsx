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

function createIconMarkup(obj: SpaceObject, currentZoom: number) {
  // Scale factor: base 2 exponent of zoom.
  // e.g. zoom 0 = 1x, zoom -1 = 0.5x, zoom 1 = 2x
  const scale = Math.max(0.1, Math.abs(Math.pow(2, currentZoom)));
  const scaledSize = obj.size * BASE_ICON_SIZE * scale;

  if (obj.imageUrl) {
    return renderToString(
      <div
        className="flex items-center justify-center drop-shadow-xl"
        style={{ width: `${scaledSize}px`, height: `${scaledSize}px` }}
      >
        <img
          src={obj.imageUrl}
          alt={obj.name}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>,
    );
  }

  let IconComponent = Globe;
  if (obj.type === "asteroid") IconComponent = Hexagon;
  if (obj.type === "anomaly") IconComponent = Sparkles;

  return renderToString(
    <div
      className={`flex items-center justify-center ${obj.color} drop-shadow-xl`}
      style={{ width: `${scaledSize}px`, height: `${scaledSize}px` }}
    >
      <IconComponent
        strokeWidth={1.5}
        style={{ width: "100%", height: "100%" }}
      />
    </div>,
  );
}

// A component to display zoom level and coordinates
function MapInfoPanel() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [center, setCenter] = useState(map.getCenter());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setCenter(map.getCenter()),
  });

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-xl text-white pointer-events-auto">
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
        const parsed = (data.data as SpaceObject[]).map((obj) => ({
          ...obj,
          color:
            obj.type === "planet"
              ? PLANET_COLORS[Math.abs(obj.name.length) % PLANET_COLORS.length]
              : obj.type === "asteroid"
                ? "text-stone-500"
                : "text-purple-500",
          imageUrl:
            obj.type === "planet" && obj.name.includes("Prime")
              ? "/assets/map/solara_prime.svg"
              : undefined,
        }));

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

export default function Map() {
  const [zoom, setZoom] = useState(0);
  const [mapObjects, setMapObjects] = useState<SpaceObject[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const { selectedPlanet } = useGame();

  // Custom icons memoized
  const icons = useMemo(() => {
    const iconMap: Record<string, L.DivIcon> = {};
    const scale = Math.max(0.1, Math.abs(Math.pow(2, zoom)));

    mapObjects.forEach((obj) => {
      const scaledSize = obj.size * BASE_ICON_SIZE * scale;
      iconMap[obj.id] = L.divIcon({
        html: createIconMarkup(obj, zoom),
        className: "bg-transparent border-none",
        iconSize: [scaledSize, scaledSize],
        iconAnchor: [scaledSize / 2, scaledSize / 2], // Center the icon
      });
    });
    return iconMap;
  }, [zoom, mapObjects]);

  return (
    <div className="flex-1 w-full relative bg-zinc-950 h-[calc(100vh-64px)] overflow-hidden">
      <MapContainer
        crs={L.CRS.Simple}
        center={[selectedPlanet?.y || 0, selectedPlanet?.x || 0]}
        zoom={5}
        minZoom={4}
        maxZoom={5}
        // @ts-ignore Let Leaflet options pass through
        zoomControl={false} // Disable default zoom control UI to remove the bright white +/- artifact
        className="h-full w-full outline-none z-0"
        style={{ background: "#09090b", cursor: "grab" }}
      >
        <MapDataFetcher
          setZoom={setZoom}
          setMapObjects={setMapObjects}
          setLoadingMap={setLoadingMap}
        />
        <SpaceGridLayer />
        <MapInfoPanel />
        {loadingMap && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-zinc-950/80 text-zinc-300 px-4 py-2 rounded-full text-sm border border-zinc-800 pointer-events-none">
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
                  position={{ x: 0, y: 0 }}
                  onClose={() => {
                    // handled by popup internals natively by clicking map
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
