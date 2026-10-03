export type StairSide = "north" | "south";
export type StairDirection = "up" | "down";

export const STAIR_LANES = {
  north: {
    z: 4.45,
    arrivalZ: 5.0,
    upX: -1.55,
    downX: 1.55,
  },
  south: {
    z: 35.55,
    arrivalZ: 35.0,
    upX: 1.55,
    downX: -1.55,
  },
} as const;

export function stairInteractionPoint(side: StairSide, direction: StairDirection): { x: number; z: number } {
  const lane = STAIR_LANES[side];
  return {
    x: direction === "up" ? lane.upX : lane.downX,
    z: lane.z,
  };
}

export function stairArrivalPoint(interaction: { x: number; z: number }): { x: number; z: number } {
  const lane = interaction.z < 10 ? STAIR_LANES.north : STAIR_LANES.south;
  return { x: interaction.x, z: lane.arrivalZ };
}
