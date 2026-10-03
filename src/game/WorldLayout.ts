import { firstFloorZoneAt, firstFloorZoneDisplay } from "../world/FirstFloorLayout";
export type FloorId = 1 | 2 | 3 | 4 | 5 | 6;

export const FLOOR_HEIGHT = 4.15;

export type FloorDefinition = {
  floor: FloorId;
  label: string;
  department: string;
  specialRoom: string;
  atmosphere: string;
};

export const FLOORS: readonly FloorDefinition[] = [
  { floor: 1, label: "1F", department: "1年教室・管理棟", specialRoom: "職員室・保健室・進路指導室", atmosphere: "6教室・トイレ・生徒玄関・管理諸室" },
  { floor: 2, label: "2F", department: "教職員", specialRoom: "職員室・放送室", atmosphere: "印刷室・監視モニター" },
  { floor: 3, label: "3F", department: "情報・生徒指導", specialRoom: "コンピュータ室", atmosphere: "ガラス連絡廊下" },
  { floor: 4, label: "4F", department: "理科", specialRoom: "化学実験室", atmosphere: "物理室・標本室" },
  { floor: 5, label: "5F", department: "進路・自習", specialRoom: "個別自習ブース", atmosphere: "進路資料・安全区画" },
  { floor: 6, label: "6F", department: "芸術・天文", specialRoom: "資料室・保守端末", atmosphere: "音楽室・美術室・西非常階段" },
] as const;

export function floorBaseY(floor: FloorId): number {
  return (floor - 1) * FLOOR_HEIGHT;
}

export function getFloorDefinition(floor: FloorId): FloorDefinition {
  return FLOORS[floor - 1];
}

export function describeZone(floor: FloorId, x: number, z: number): string {
  if (floor === 1) return firstFloorZoneAt(x, z);
  if (z < 5) return "north_stairs";
  if (z > 35) return "south_stairs";
  if (x < -3.15 && z > 16 && z < 24) {
    const room = getFloorDefinition(floor).specialRoom;
    return `special_room:${room}`;
  }
  if (z > 29) return "south_corridor";
  if (z > 14) return "central_corridor";
  return "north_corridor";
}

export function zoneDisplayName(floor: FloorId, zone: string): string {
  if (floor === 1) return firstFloorZoneDisplay(zone);
  const def = getFloorDefinition(floor);
  if (zone === "north_stairs") return `${def.label} 北階段`;
  if (zone === "south_stairs") return `${def.label} 南階段`;
  if (zone.startsWith("special_room:")) return `${def.label} ${zone.split(":")[1]}`;
  if (zone === "north_corridor") return `${def.label} 北廊下`;
  if (zone === "south_corridor") return `${def.label} 南廊下`;
  return `${def.label} 中央廊下`;
}
