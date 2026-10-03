import { FLOOR_HEIGHT, type FloorId } from "../game/WorldLayout";

export type StairSide = "north" | "south";

export const STAIR_HALF_RISE = FLOOR_HEIGHT / 2;
export const STAIR_STEPS_PER_FLIGHT = 10;
export const STAIR_FLIGHT_WIDTH = 2.05;
export const STAIR_LANE_OFFSET = 1.15;
export const STAIRWELL_ENTRY_DEPTH = 3.2;

export type StairFlight = {
  x: number;
  startZ: number;
  endZ: number;
  startY: number;
  endY: number;
};

export type StairGeometry = {
  side: StairSide;
  entryZ: number;
  outerZ: number;
  topZ: number;
  first: StairFlight;
  second: StairFlight;
  midLandingZ: number;
  topLandingZ: number;
};

export function stairGeometry(side: StairSide): StairGeometry {
  const north = side === "north";
  const entryZ = north ? 0.55 : 39.45;
  const outerZ = north ? -4.35 : 44.35;
  const topZ = north ? -0.15 : 40.15;
  const firstX = north ? -STAIR_LANE_OFFSET : STAIR_LANE_OFFSET;
  const secondX = -firstX;

  return {
    side,
    entryZ,
    outerZ,
    topZ,
    first: {
      x: firstX,
      startZ: entryZ,
      endZ: outerZ,
      startY: 0,
      endY: STAIR_HALF_RISE,
    },
    second: {
      x: secondX,
      startZ: outerZ,
      endZ: topZ,
      startY: STAIR_HALF_RISE,
      endY: FLOOR_HEIGHT,
    },
    midLandingZ: outerZ,
    topLandingZ: (topZ + (north ? 0.55 : 39.45)) / 2,
  };
}

export function isInStairwell(z: number): boolean {
  return z < STAIRWELL_ENTRY_DEPTH || z > 40 - STAIRWELL_ENTRY_DEPTH;
}

export function visibleFloorsForTraversal(floor: FloorId, inStairwell: boolean): FloorId[] {
  if (!inStairwell) return [floor];
  const floors = [floor - 1, floor, floor + 1]
    .filter((value) => value >= 1 && value <= 6) as FloorId[];
  return floors;
}
