export type DetectionInput = {
  distance: number;
  flashlight: boolean;
  moving: boolean;
  sprinting: boolean;
  lineOfSight: boolean;
  hiding: boolean;
  safeZone: boolean;
};

export function detectionRate(input: DetectionInput): number {
  if (input.safeZone) return -0.7;
  const range = Math.max(0, 1 - input.distance / (input.flashlight ? 25 : 13));
  const movement = input.sprinting ? 0.5 : input.moving ? 0.15 : -0.12;
  const light = input.flashlight ? 0.32 : 0;
  const sight = input.lineOfSight ? 0.3 : -0.32;
  const cover = input.hiding ? -0.7 : 0;
  return range + movement + light + sight + cover - 0.34;
}
