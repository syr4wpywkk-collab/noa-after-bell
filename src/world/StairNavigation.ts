import { FLOOR_HEIGHT, type FloorId } from "../game/WorldLayout";

export type StairSide = "north" | "south";

export const PLAYER_CENTER_HEIGHT = 0.9;
export const STAIR_STEP_COUNT = 14;
export const STAIR_RAMP_HALF_WIDTH = 0.78;
export const STAIRWELL_HALF_WIDTH = 1.9;

export const STAIRWELLS = {
  north: {
    rampX: -0.92,
    returnX: 0.92,
    lowerZ: -0.35,
    upperZ: -5.15,
  },
  south: {
    rampX: 0.92,
    returnX: -0.92,
    lowerZ: 40.35,
    upperZ: 45.15,
  },
} as const;

export type StairRampSample = {
  side: StairSide;
  progress: number;
  lowerFloor: FloorId;
  playerY: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function progressFor(side: StairSide, z: number): number | null {
  const stair = STAIRWELLS[side];
  const minZ = Math.min(stair.lowerZ, stair.upperZ) - 0.08;
  const maxZ = Math.max(stair.lowerZ, stair.upperZ) + 0.08;
  if (z < minZ || z > maxZ) return null;
  return clamp((z - stair.lowerZ) / (stair.upperZ - stair.lowerZ), 0, 1);
}

export function sampleStairRamp(x: number, z: number, currentY: number): StairRampSample | null {
  for (const side of ["north", "south"] as const) {
    const stair = STAIRWELLS[side];
    if (Math.abs(x - stair.rampX) > STAIR_RAMP_HALF_WIDTH) continue;
    const progress = progressFor(side, z);
    if (progress === null) continue;

    const relativeFloor = (currentY - PLAYER_CENTER_HEIGHT) / FLOOR_HEIGHT;
    const lowerIndex = clamp(Math.round(relativeFloor - progress), 0, 4);
    const playerY = PLAYER_CENTER_HEIGHT + (lowerIndex + progress) * FLOOR_HEIGHT;

    // This also prevents entering the middle of a ramp from the side and
    // snapping several metres vertically. Normal traversal changes only a
    // small amount per frame, so the legitimate path stays well inside this.
    if (Math.abs(playerY - currentY) > 0.9) return null;

    return {
      side,
      progress,
      lowerFloor: (lowerIndex + 1) as FloorId,
      playerY,
    };
  }
  return null;
}

export function floorFromPlayerHeight(playerY: number): FloorId {
  const index = clamp(
    Math.round((playerY - PLAYER_CENTER_HEIGHT) / FLOOR_HEIGHT),
    0,
    5,
  );
  return (index + 1) as FloorId;
}

export function isInStairwell(x: number, z: number): boolean {
  if (Math.abs(x) > STAIRWELL_HALF_WIDTH) return false;
  const north = STAIRWELLS.north;
  const south = STAIRWELLS.south;
  return (
    (z >= Math.min(north.lowerZ, north.upperZ) - 0.65 && z <= Math.max(north.lowerZ, north.upperZ) + 0.65) ||
    (z >= Math.min(south.lowerZ, south.upperZ) - 0.65 && z <= Math.max(south.lowerZ, south.upperZ) + 0.65)
  );
}

export function stairRunLength(side: StairSide): number {
  const stair = STAIRWELLS[side];
  return Math.abs(stair.upperZ - stair.lowerZ);
}

export function stairProgressZ(side: StairSide, progress: number): number {
  const stair = STAIRWELLS[side];
  return stair.lowerZ + (stair.upperZ - stair.lowerZ) * clamp(progress, 0, 1);
}
