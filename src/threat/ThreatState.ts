export const THREAT_MODES = ["DORMANT", "PATROL", "SUSPICIOUS", "INVESTIGATE", "CHASE", "SEARCH", "RETURN"] as const;
export type ThreatMode = typeof THREAT_MODES[number];

export type ThreatSnapshot = {
  mode: ThreatMode;
  awareness: number;
  distance: number;
  visible: boolean;
  investigating: boolean;
  pursuitActive: boolean;
};

export type NoiseSignal = {
  strength: number;
  floor: number;
  x: number;
  z: number;
  kind: "footstep" | "sprint" | "notification" | "door";
};
