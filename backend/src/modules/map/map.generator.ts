import { SpaceObjectType } from "../../generated/prisma/enums";

type Point = { x: number; y: number };

export const generateMapObjectsConfig = {
  totalObjects: 10000,
  planetRatio: 0.4,
  asteroidRatio: 0.5,
  blackHoleRatio: 0.1,
  minDistance: 3, // Euclidean/Chebyshev min distance (3 means 5x5 exclusion zone: max(abs(dx), abs(dy)) >= 3)
};

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
    cx = Math.floor(Math.random() * 201) - 100; // -100 to 100
    cy = Math.floor(Math.random() * 201) - 100;
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

  // Place player planet
  newObjects.push({
    type: SpaceObjectType.PLANET,
    name: "Planet " + ownerId.substring(ownerId.length - 5),
    titanium: 1000,
    silicate: 1000,
    isotope: 1000,
    x: cx,
    y: cy,
    // Note: the planet's relation to User is handled separately in Prisma,
    // or by mapping this specific first object correctly
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

  const targets = {
    PLANET:
      Math.floor(
        generateMapObjectsConfig.totalObjects *
          generateMapObjectsConfig.planetRatio,
      ) - 1, // -1 for player planet
    ASTEROID: Math.floor(
      generateMapObjectsConfig.totalObjects *
        generateMapObjectsConfig.asteroidRatio,
    ),
    BLACK_HOLE: Math.floor(
      generateMapObjectsConfig.totalObjects *
        generateMapObjectsConfig.blackHoleRatio,
    ),
  };

  // Create a pool of types to sample from
  const typePool: SpaceObjectType[] = [];
  for (let i = 0; i < targets.PLANET; i++)
    typePool.push(SpaceObjectType.PLANET);
  for (let i = 0; i < targets.ASTEROID; i++)
    typePool.push(SpaceObjectType.ASTEROID);
  for (let i = 0; i < targets.BLACK_HOLE; i++)
    typePool.push(SpaceObjectType.BLACK_HOLE);

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
        if (objType === SpaceObjectType.PLANET) {
          name = "Uncharted Planet";
        } else if (objType === SpaceObjectType.ASTEROID) {
          name = "Asteroid Field";
        } else {
          name = "Black Hole";
        }

        newObjects.push({
          type: objType,
          name: name,
          titanium:
            objType === SpaceObjectType.PLANET
              ? Math.floor(Math.random() * 500) + 100
              : 0,
          silicate:
            objType === SpaceObjectType.PLANET
              ? Math.floor(Math.random() * 500) + 100
              : 0,
          isotope:
            objType === SpaceObjectType.PLANET
              ? Math.floor(Math.random() * 500) + 100
              : 0,
          x: p.x,
          y: p.y,
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
