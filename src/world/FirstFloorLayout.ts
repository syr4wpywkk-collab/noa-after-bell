export type FirstFloorSide = "left" | "right";
export type FirstFloorRoomKind =
  | "classroom"
  | "toilet"
  | "infirmary"
  | "career"
  | "principal"
  | "staff"
  | "office"
  | "print"
  | "broadcast"
  | "counseling"
  | "meeting";

export type FirstFloorRoom = {
  id: string;
  label: string;
  side: FirstFloorSide;
  kind: FirstFloorRoomKind;
  startZ: number;
  endZ: number;
  doorZ: number;
};

export const FIRST_FLOOR_LENGTH = 92;
export const FIRST_FLOOR_CORRIDOR_HALF_WIDTH = 3.2;
export const FIRST_FLOOR_ROOM_DEPTH = 7.2;
export const FIRST_FLOOR_ROOM_INNER_X = 3.2;
export const FIRST_FLOOR_ROOM_OUTER_X = FIRST_FLOOR_ROOM_INNER_X + FIRST_FLOOR_ROOM_DEPTH;

export const FIRST_FLOOR_ROOMS: readonly FirstFloorRoom[] = [
  { id: "class_1_1", label: "1年1組", side: "left", kind: "classroom", startZ: 4, endZ: 12, doorZ: 10.7 },
  { id: "class_1_2", label: "1年2組", side: "left", kind: "classroom", startZ: 12, endZ: 20, doorZ: 18.7 },
  { id: "class_1_3", label: "1年3組", side: "left", kind: "classroom", startZ: 20, endZ: 28, doorZ: 26.7 },
  { id: "boys_wc", label: "男子トイレ", side: "left", kind: "toilet", startZ: 29, endZ: 37, doorZ: 35.4 },
  { id: "girls_wc", label: "女子トイレ", side: "right", kind: "toilet", startZ: 29, endZ: 37, doorZ: 35.4 },
  { id: "class_1_4", label: "1年4組", side: "left", kind: "classroom", startZ: 37, endZ: 45, doorZ: 43.7 },
  { id: "class_1_5", label: "1年5組", side: "left", kind: "classroom", startZ: 45, endZ: 53, doorZ: 51.7 },
  { id: "class_1_6", label: "1年6組", side: "left", kind: "classroom", startZ: 53, endZ: 61, doorZ: 59.7 },
  { id: "infirmary", label: "保健室", side: "left", kind: "infirmary", startZ: 63, endZ: 71, doorZ: 69.5 },
  { id: "career", label: "進路指導室", side: "left", kind: "career", startZ: 71, endZ: 79, doorZ: 77.5 },
  { id: "counseling", label: "教育相談室", side: "left", kind: "counseling", startZ: 79, endZ: 85, doorZ: 83.8 },
  { id: "meeting", label: "会議室", side: "left", kind: "meeting", startZ: 85, endZ: 92, doorZ: 90.6 },
  { id: "staff", label: "職員室", side: "right", kind: "staff", startZ: 63, endZ: 79, doorZ: 76.8 },
  { id: "principal", label: "校長室", side: "right", kind: "principal", startZ: 79, endZ: 85, doorZ: 83.5 },
  { id: "office", label: "事務室", side: "right", kind: "office", startZ: 85, endZ: 88, doorZ: 87.0 },
  { id: "print", label: "印刷室", side: "right", kind: "print", startZ: 88, endZ: 90, doorZ: 89.1 },
  { id: "broadcast", label: "放送室", side: "right", kind: "broadcast", startZ: 90, endZ: 92, doorZ: 91.1 },
] as const;

export const FIRST_FLOOR_START = {
  // Clear aisle immediately inside 1-6, just before the corridor doorway.
  // This avoids spawning inside the visual desk grid and gives the player an
  // obvious one-stick exit path on mobile.
  x: -4.35,
  y: 0.9,
  z: 59.7,
  yaw: Math.PI / 2,
} as const;

export function firstFloorRoomAt(x: number, z: number): FirstFloorRoom | undefined {
  const side: FirstFloorSide | null =
    x < -FIRST_FLOOR_CORRIDOR_HALF_WIDTH ? "left"
      : x > FIRST_FLOOR_CORRIDOR_HALF_WIDTH ? "right"
        : null;
  if (!side) return undefined;
  return FIRST_FLOOR_ROOMS.find((room) => room.side === side && z >= room.startZ && z <= room.endZ);
}

export function firstFloorZoneAt(x: number, z: number): string {
  const room = firstFloorRoomAt(x, z);
  if (room) return `room:${room.id}`;
  if (z < 2.5) return "north_stairs";
  if (z > FIRST_FLOOR_LENGTH - 2.5) return "south_exit";
  if (z >= 29 && z <= 37) return "washroom_corridor";
  if (z >= 48 && z <= 61 && x > 0) return "student_entrance";
  if (z >= 63) return "administration_corridor";
  if (z >= 37) return "south_classroom_corridor";
  return "north_classroom_corridor";
}

export function firstFloorZoneDisplay(zone: string): string {
  if (zone.startsWith("room:")) {
    const id = zone.slice(5);
    return FIRST_FLOOR_ROOMS.find((room) => room.id === id)?.label ?? "1F 教室";
  }
  switch (zone) {
    case "north_stairs": return "1F 北階段";
    case "south_exit": return "1F 正面玄関";
    case "washroom_corridor": return "1F トイレ前";
    case "student_entrance": return "1F 生徒玄関・下駄箱";
    case "administration_corridor": return "1F 管理棟廊下";
    case "south_classroom_corridor": return "1F 南教室棟廊下";
    default: return "1F 北教室棟廊下";
  }
}
