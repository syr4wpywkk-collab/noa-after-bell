import type { FloorId } from "../game/WorldLayout";

export type InteractionKind =
  | "stairs_up"
  | "stairs_down"
  | "clue"
  | "terminal"
  | "clock"
  | "exit_a"
  | "exit_b";

export type WorldInteraction = {
  id: string;
  kind: InteractionKind;
  floor: FloorId;
  x: number;
  y: number;
  z: number;
  label: string;
  data?: Record<string, string>;
};
