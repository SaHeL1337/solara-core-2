import { SpaceObjectType } from "../../generated/prisma";
import gameConfig from "../../config/game.json";

type Point = { x: number; y: number };

export const generateMapObjectsConfig = {
  totalObjects: 500,
  planetRatio: 0.4,
  asteroidRatio: 0.5,
  blackHoleRatio: 0.1,
  minDistance: 3, // Euclidean/Chebyshev min distance (3 means 5x5 exclusion zone: max(abs(dx), abs(dy)) >= 3)
};

const BUILDING_TYPES = [
  "TITANIUM_MINE",
  "SILICATE_MINE",
  "ISOTOPE_COLLECTOR",
  "SHIPYARD",
  "SHIELD_GENERATOR",
  "HOUSING_BLOCK",
  "GOVERNMENT_BUILDING",
  "STORAGE",
  "TRADING_HUB",
];

const SHIP_TYPES = [
  "MINER",
  "FIGHTER",
  "CRUISER",
  "BATTLESHIP",
  "BOMBER",
  "COLONY_SHIP",
  "SCANNER",
];

export const generateMapObjects = (
  existingObjects: Point[],
  isFirstPlayer: boolean,
  ownerId: string,
) => {
  const occupied = new Set<string>();

  // Mark all existing objects' exclusion zones (min distance 3)
  for (const obj of existingObjects) {
    for (
      let dx = -(generateMapObjectsConfig.minDistance - 1);
      dx <= generateMapObjectsConfig.minDistance - 1;
      dx++
    ) {
      for (
        let dy = -(generateMapObjectsConfig.minDistance - 1);
        dy <= generateMapObjectsConfig.minDistance - 1;
        dy++
      ) {
        occupied.add(`${obj.x + dx},${obj.y + dy}`);
      }
    }
  }

  let cx = 0;
  let cy = 0;

  if (isFirstPlayer) {
    cx = 172; // Set precisely as hinted in previous conversation or just use random
    cy = 255;
  } else {
    // Find outermost object
    let maxDistSq = -1;
    let outerX = 0;
    let outerY = 0;
    for (const obj of existingObjects) {
      const distSq = obj.x * obj.x + obj.y * obj.y;
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        outerX = obj.x;
        outerY = obj.y;
      }
    }

    // Determine direction from origin to outermost object. If at origin, default to X axis.
    let dirX = outerX;
    let dirY = outerY;
    if (dirX === 0 && dirY === 0) {
      dirX = 1;
      dirY = 0;
    }
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    const nX = dirX / len;
    const nY = dirY / len;

    // Try to find a valid spot next to it, moving outwards
    let step = generateMapObjectsConfig.minDistance;
    let placed = false;
    while (!placed) {
      const tryX = Math.round(outerX + nX * step);
      const tryY = Math.round(outerY + nY * step);

      if (!occupied.has(`${tryX},${tryY}`)) {
        cx = tryX;
        cy = tryY;
        placed = true;
      }
      step++;
    }
  }

  const newObjects: any[] = [];

  // Place player planet — using newPlayerSetup from game config
  const setup = gameConfig.newPlayerSetup;
  const configBuildings = Object.entries(setup.buildings).map(([type, level]) => ({
    type,
    level,
  }));
  const configShips = setup.ships
    ? Object.entries(setup.ships).map(([type, count]) => ({
        type,
        count,
      }))
    : [];

  newObjects.push({
    type: SpaceObjectType.PLANET,
    name: "Home Planet",
    titanium: setup.titanium,
    silicate: setup.silicate,
    isotope: setup.isotope,
    x: cx,
    y: cy,
    buildings: configBuildings,
    ships: configShips,
  });

  for (
    let dx = -(generateMapObjectsConfig.minDistance - 1);
    dx <= generateMapObjectsConfig.minDistance - 1;
    dx++
  ) {
    for (
      let dy = -(generateMapObjectsConfig.minDistance - 1);
      dy <= generateMapObjectsConfig.minDistance - 1;
      dy++
    ) {
      occupied.add(`${cx + dx},${cy + dy}`);
    }
  }

  const wormholesPerPlayer = (gameConfig as any).wormholesPerPlayer || 5;

  const targets = {
    PLANET:
      Math.floor(
        generateMapObjectsConfig.totalObjects *
          generateMapObjectsConfig.planetRatio,
      ) - 1 - wormholesPerPlayer, // -1 for player planet, minus wormholes taken from planet pool
    ASTEROID: Math.floor(
      generateMapObjectsConfig.totalObjects *
        generateMapObjectsConfig.asteroidRatio,
    ),
    BLACK_HOLE: Math.floor(
      generateMapObjectsConfig.totalObjects *
        generateMapObjectsConfig.blackHoleRatio,
    ),
    WORMHOLE: wormholesPerPlayer,
  };

  // Create a pool of types to sample from
  const typePool: SpaceObjectType[] = [];
  for (let i = 0; i < targets.PLANET; i++)
    typePool.push(SpaceObjectType.PLANET);
  for (let i = 0; i < targets.ASTEROID; i++)
    typePool.push(SpaceObjectType.ASTEROID);
  for (let i = 0; i < targets.BLACK_HOLE; i++)
    typePool.push(SpaceObjectType.BLACK_HOLE);
  for (let i = 0; i < targets.WORMHOLE; i++)
    typePool.push(SpaceObjectType.WORMHOLE);

  // Shuffle type pool
  for (let i = typePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
  }

  // Now spawn objects in a circle around cx, cy
  let radius = 1;
  let typeIndex = 0;

  while (
    newObjects.length < generateMapObjectsConfig.totalObjects &&
    typeIndex < typePool.length
  ) {
    // Get all coordinates on the current ring
    const points: Point[] = [];
    for (let x = -radius; x <= radius; x++) {
      points.push({ x: cx + x, y: cy + radius }); // Top edge
      points.push({ x: cx + x, y: cy - radius }); // Bottom edge
    }
    for (let y = -radius + 1; y <= radius - 1; y++) {
      points.push({ x: cx + radius, y: cy + y }); // Right edge
      points.push({ x: cx - radius, y: cy + y }); // Left edge
    }

    // Shuffle points to make it random within the ring
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }

    // Try placing objects
    for (const p of points) {
      if (typeIndex >= typePool.length) break;

      if (!occupied.has(`${p.x},${p.y}`)) {
        const objType = typePool[typeIndex++];

        let name = "";
        let buildings: any[] = [];
        let ships: any[] = [];

        if (objType === SpaceObjectType.PLANET) {
          name = "Uncharted Planet";
          // Add dummy buildings
          BUILDING_TYPES.forEach((type) => {
            if (Math.random() > 0.4) {
              buildings.push({
                type,
                level: Math.floor(Math.random() * 10) + 1,
              });
            }
          });
          // Add dummy ships
          SHIP_TYPES.forEach((type) => {
            if (Math.random() > 0.6) {
              ships.push({
                type,
                count: Math.floor(Math.random() * 20) + 1,
              });
            }
          });
        } else if (objType === SpaceObjectType.ASTEROID) {
          name = "Asteroid Field";
        } else if (objType === SpaceObjectType.WORMHOLE) {
          name = "Wormhole";
        } else {
          name = "Black Hole";
        }

        newObjects.push({
          type: objType,
          name: name,
          titanium:
            objType === SpaceObjectType.PLANET
              ? Math.floor(Math.random() * 5000) + 1000
              : objType === SpaceObjectType.ASTEROID
                ? Math.floor(Math.random() * 20000) + 5000
                : 0,
          silicate:
            objType === SpaceObjectType.PLANET
              ? Math.floor(Math.random() * 5000) + 1000
              : objType === SpaceObjectType.ASTEROID
                ? Math.floor(Math.random() * 15000) + 3000
                : 0,
          isotope:
            objType === SpaceObjectType.PLANET
              ? Math.floor(Math.random() * 5000) + 1000
              : objType === SpaceObjectType.ASTEROID
                ? Math.floor(Math.random() * 8000) + 1000
                : 0,
          x: p.x,
          y: p.y,
          buildings,
          ships,
        });

        // Mark as occupied
        for (
          let dx = -(generateMapObjectsConfig.minDistance - 1);
          dx <= generateMapObjectsConfig.minDistance - 1;
          dx++
        ) {
          for (
            let dy = -(generateMapObjectsConfig.minDistance - 1);
            dy <= generateMapObjectsConfig.minDistance - 1;
            dy++
          ) {
            occupied.add(`${p.x + dx},${p.y + dy}`);
          }
        }
      }
    }

    radius++;
  }

  return newObjects;
};

