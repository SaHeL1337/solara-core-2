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

function generateRandomObjects(count: number): SpaceObject[] {
  const objects: SpaceObject[] = [];
  const types: ("planet" | "asteroid" | "anomaly")[] = [
    "planet",
    "planet",
    "planet",
    "asteroid",
    "asteroid",
    "anomaly",
  ];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    // cluster them closely in a +/- 50 range (100x100 grid)
    const x = Math.floor(Math.random() * 100) - 50;
    const y = Math.floor(Math.random() * 100) - 50;
    const size =
      type === "planet" ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.5;
    const color =
      type === "planet"
        ? PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)]
        : type === "asteroid"
          ? "text-stone-500"
          : "text-purple-500";

    const isPlayerOwned = type === "planet" && Math.random() > 0.8;

    // 30% chance a planet has the custom SVG
    const useSvg = type === "planet" && Math.random() > 0.7;

    objects.push({
      id: `obj-${i}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${Math.floor(Math.random() * 999)}`,
      x,
      y,
      color,
      size,
      owner: isPlayerOwned ? "Player" : undefined,
      imageUrl: useSvg ? "/assets/map/solara_prime.svg" : undefined,
    });
  }
  return objects;
}

// Generate ~50 objects in a condensed area
const DUMMY_OBJECTS: SpaceObject[] = generateRandomObjects(600);

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
      className={`flex items-center justify-center ${obj.color} drop-shadow-xl animate-pulse`}
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

function MapEventsHandler({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoom(map.getZoom());
    },
  });
  return null;
}

export default function Map() {
  const [zoom, setZoom] = useState(0);

  // Custom icons memoized
  const icons = useMemo(() => {
    const iconMap: Record<string, L.DivIcon> = {};
    const scale = Math.max(0.1, Math.abs(Math.pow(2, zoom)));

    DUMMY_OBJECTS.forEach((obj) => {
      const scaledSize = obj.size * BASE_ICON_SIZE * scale;
      iconMap[obj.id] = L.divIcon({
        html: createIconMarkup(obj, zoom),
        className: "bg-transparent border-none",
        iconSize: [scaledSize, scaledSize],
        iconAnchor: [scaledSize / 2, scaledSize / 2], // Center the icon
      });
    });
    return iconMap;
  }, [zoom]);

  return (
    <div className="flex-1 w-full relative bg-zinc-950 h-[calc(100vh-64px)] overflow-hidden">
      <MapContainer
        crs={L.CRS.Simple}
        center={[0, 0]}
        zoom={0}
        minZoom={-2}
        maxZoom={5}
        // @ts-ignore Let Leaflet options pass through
        zoomControl={false} // Disable default zoom control UI to remove the bright white +/- artifact
        className="h-full w-full outline-none z-0"
        style={{ background: "#09090b", cursor: "grab" }}
      >
        <MapEventsHandler onZoom={(z: number) => setZoom(z)} />
        <SpaceGridLayer />
        <MapInfoPanel />

        {DUMMY_OBJECTS.map((obj) => (
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
