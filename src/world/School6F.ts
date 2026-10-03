import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { FLOOR_HEIGHT, FLOORS, floorBaseY, getFloorDefinition, type FloorId } from "../game/WorldLayout";
import type { WorldInteraction } from "./types";

export class School6F {
  private roots = new Map<FloorId, TransformNode>();
  private lights = new Map<FloorId, PointLight[]>();
  private interactions: WorldInteraction[] = [];
  private activeFloor: FloorId = 1;
  private flickerFloor: FloorId | null = null;
  private flickerUntil = 0;
  private flickerBase = new Map<PointLight, number>();

  private wall!: PBRMaterial;
  private floorMat!: PBRMaterial;
  private ceiling!: PBRMaterial;
  private door!: PBRMaterial;
  private metal!: PBRMaterial;
  private glass!: PBRMaterial;
  private trim!: PBRMaterial;
  private desk!: PBRMaterial;
  private darkWood!: PBRMaterial;

  constructor(private scene: Scene) {}

  build(): void {
    this.createMaterials();
    for (const def of FLOORS) this.buildFloor(def.floor);
    this.setActiveFloor(1);
  }

  setActiveFloor(floor: FloorId): void {
    this.activeFloor = floor;
    for (const [id, root] of this.roots) root.setEnabled(id === floor);
    for (const [id, lights] of this.lights) {
      for (const light of lights) light.setEnabled(id === floor);
    }
  }

  getActiveFloor(): FloorId {
    return this.activeFloor;
  }

  update(now: number): void {
    if (!this.flickerFloor || now > this.flickerUntil) {
      if (this.flickerFloor) this.restoreLights(this.flickerFloor);
      this.flickerFloor = null;
      return;
    }

    const lights = this.lights.get(this.flickerFloor) ?? [];
    const pulse = Math.sin(now * 0.08) > 0.18 ? 1 : 0.04;
    lights.forEach((light, index) => {
      const base = this.flickerBase.get(light) ?? 0.4;
      light.intensity = index % 2 === 0 ? base * pulse : base * (0.55 + Math.random() * 0.45);
    });
  }

  flickerLights(floor: FloorId, duration = 800): void {
    this.flickerFloor = floor;
    this.flickerUntil = performance.now() + duration;
    for (const light of this.lights.get(floor) ?? []) {
      if (!this.flickerBase.has(light)) this.flickerBase.set(light, light.intensity);
    }
  }

  getNearbyInteraction(position: Vector3, floor: FloorId, maxDistance = 1.75): WorldInteraction | null {
    let best: WorldInteraction | null = null;
    let bestDistance = maxDistance;
    for (const interaction of this.interactions) {
      if (interaction.floor !== floor) continue;
      const dx = interaction.x - position.x;
      const dz = interaction.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < bestDistance) {
        best = interaction;
        bestDistance = distance;
      }
    }
    return best;
  }

  getNearbyLabels(position: Vector3, floor: FloorId): string[] {
    return this.interactions
      .filter((interaction) => interaction.floor === floor && Math.hypot(interaction.x - position.x, interaction.z - position.z) < 8)
      .map((interaction) => interaction.label)
      .slice(0, 5);
  }

  private buildFloor(floor: FloorId): void {
    const root = new TransformNode(`floor-${floor}`, this.scene);
    root.position.y = floorBaseY(floor);
    this.roots.set(floor, root);
    this.lights.set(floor, []);

    this.buildCorridor(floor, root);
    this.buildSpecialRoom(floor, root);
    this.buildStairs(floor, root);
    this.buildFloorLighting(floor, root);

    if (floor === 1) this.buildGym(root);
    if (floor === 6) this.buildSixthFloorDetails(root);
  }

  private buildCorridor(floor: FloorId, root: TransformNode): void {
    this.box(root, `f${floor}-corridor-floor`, new Vector3(6.2, 0.12, 40), new Vector3(0, -0.06, 20), this.floorMat, true);
    this.box(root, `f${floor}-corridor-ceiling`, new Vector3(6.2, 0.10, 40), new Vector3(0, 3.12, 20), this.ceiling, false);
    this.box(root, `f${floor}-right-wall`, new Vector3(0.18, 3.2, 40), new Vector3(3.1, 1.55, 20), this.wall, true);

    const doorCenters = [7, 13.5, 20, 26.5, 33];
    const half = 0.76;
    let cursor = 0;
    doorCenters.forEach((z, index) => {
      const start = z - half;
      if (start > cursor) {
        this.box(root, `f${floor}-left-wall-${index}`, new Vector3(0.18, 3.2, start - cursor), new Vector3(-3.1, 1.55, (start + cursor) / 2), this.wall, true);
      }
      cursor = z + half;
    });
    if (cursor < 40) {
      this.box(root, `f${floor}-left-wall-end`, new Vector3(0.18, 3.2, 40 - cursor), new Vector3(-3.1, 1.55, (40 + cursor) / 2), this.wall, true);
    }

    for (const z of doorCenters) {
      const specialDoor = z === 20;
      this.box(root, `f${floor}-door-frame-top-${z}`, new Vector3(0.14, 0.12, 1.64), new Vector3(-3.02, 2.32, z), this.metal, false);
      this.box(root, `f${floor}-door-frame-a-${z}`, new Vector3(0.14, 2.34, 0.10), new Vector3(-3.02, 1.15, z - 0.74), this.metal, false);
      this.box(root, `f${floor}-door-frame-b-${z}`, new Vector3(0.14, 2.34, 0.10), new Vector3(-3.02, 1.15, z + 0.74), this.metal, false);
      if (!specialDoor) {
        this.box(root, `f${floor}-door-${z}`, new Vector3(0.10, 2.25, 1.35), new Vector3(-3.02, 1.12, z), this.door, true);
      } else {
        const leaf = this.box(root, `f${floor}-special-door-leaf`, new Vector3(0.10, 2.25, 1.35), new Vector3(-3.72, 1.12, z - 0.62), this.door, false);
        leaf.rotation.y = Math.PI / 2;
      }
    }

    for (const z of [5, 10, 15, 20, 25, 30, 35]) {
      this.box(root, `f${floor}-window-${z}`, new Vector3(0.06, 1.2, 2.45), new Vector3(3.0, 1.75, z), this.glass, false);
      this.box(root, `f${floor}-window-v-${z}`, new Vector3(0.09, 1.25, 0.05), new Vector3(2.95, 1.75, z), this.metal, false);
      this.box(root, `f${floor}-window-h-${z}`, new Vector3(0.09, 0.05, 2.5), new Vector3(2.95, 1.75, z), this.metal, false);
      this.box(root, `f${floor}-sill-${z}`, new Vector3(0.22, 0.08, 2.6), new Vector3(2.93, 1.12, z), this.trim, false);
    }

    for (let z = 2; z < 40; z += 2) {
      this.box(root, `f${floor}-floor-seam-${z}`, new Vector3(5.8, 0.008, 0.02), new Vector3(0, 0.008, z), this.trim, false);
    }
    this.box(root, `f${floor}-skirt-left`, new Vector3(0.05, 0.16, 40), new Vector3(-3.0, 0.08, 20), this.trim, false);
    this.box(root, `f${floor}-skirt-right`, new Vector3(0.05, 0.16, 40), new Vector3(3.0, 0.08, 20), this.trim, false);

    // Floor-specific clutter gives each level a different silhouette.
    if (floor === 1) this.buildLockers(root, 28, 4);
    if (floor === 2) this.buildLockers(root, 8, 6);
    if (floor === 3) this.buildUtilityCarts(root, 30);
    if (floor === 4) this.buildBench(root, 9);
    if (floor === 5) this.buildBench(root, 31);
    if (floor === 6) this.buildArchiveCabinets(root, 10);
  }

  private buildSpecialRoom(floor: FloorId, root: TransformNode): void {
    const roomCenterX = -6.3;
    const centerZ = 20;
    this.box(root, `f${floor}-special-floor`, new Vector3(6.4, 0.12, 7.0), new Vector3(roomCenterX, -0.06, centerZ), this.floorMat, true);
    this.box(root, `f${floor}-special-ceiling`, new Vector3(6.4, 0.1, 7.0), new Vector3(roomCenterX, 3.12, centerZ), this.ceiling, false);
    this.box(root, `f${floor}-special-far-wall`, new Vector3(0.18, 3.2, 7.0), new Vector3(-9.5, 1.55, centerZ), this.wall, true);
    this.box(root, `f${floor}-special-front-wall`, new Vector3(6.4, 3.2, 0.18), new Vector3(roomCenterX, 1.55, 16.5), this.wall, true);
    this.box(root, `f${floor}-special-back-wall`, new Vector3(6.4, 3.2, 0.18), new Vector3(roomCenterX, 1.55, 23.5), this.wall, true);

    if (floor === 1) this.buildInfirmary(root);
    if (floor === 2) this.buildLibrary(root);
    if (floor === 3) this.buildScienceLab(root);
    if (floor === 4) this.buildMathRoom(root);
    if (floor === 5) this.buildBroadcastRoom(root);
    if (floor === 6) this.buildArchiveRoom(root);
  }

  private buildStairs(floor: FloorId, root: TransformNode): void {
    const stepMat = this.pbr(`stairs-${floor}`, new Color3(0.20, 0.22, 0.21), 0.9);
    for (const [side, baseZ] of [["north", 1.4], ["south", 38.6]] as const) {
      for (let i = 0; i < 7; i++) {
        const direction = side === "north" ? 1 : -1;
        this.box(
          root,
          `f${floor}-${side}-step-${i}`,
          new Vector3(2.1, 0.14 + i * 0.01, 0.42),
          new Vector3(0, 0.07 + i * 0.16, baseZ + direction * i * 0.36),
          stepMat,
          true,
        );
      }
    }

    if (floor < 6) {
      this.interactions.push({ id: `stairs_north_up_${floor}`, kind: "stairs_up", floor, x: 0, y: floorBaseY(floor) + 0.9, z: 3.4, label: "上の階へ" });
    }
    if (floor > 1) {
      this.interactions.push({ id: `stairs_north_down_${floor}`, kind: "stairs_down", floor, x: 0, y: floorBaseY(floor) + 0.9, z: 1.4, label: "下の階へ" });
    }
    if (floor < 6) {
      this.interactions.push({ id: `stairs_south_up_${floor}`, kind: "stairs_up", floor, x: 0, y: floorBaseY(floor) + 0.9, z: 36.6, label: "上の階へ" });
    }
    if (floor > 1) {
      this.interactions.push({ id: `stairs_south_down_${floor}`, kind: "stairs_down", floor, x: 0, y: floorBaseY(floor) + 0.9, z: 38.6, label: "下の階へ" });
    }
  }

  private buildFloorLighting(floor: FloorId, root: TransformNode): void {
    const lights = this.lights.get(floor)!;
    const panelMat = new StandardMaterial(`f${floor}-fluoro-mat`, this.scene);
    panelMat.disableLighting = true;
    panelMat.emissiveColor = floor === 5 ? new Color3(0.68, 0.79, 0.73) : new Color3(0.72, 0.84, 0.84);

    [7, 20, 33].forEach((z, index) => {
      this.box(root, `f${floor}-light-panel-${index}`, new Vector3(1.65, 0.05, 0.24), new Vector3(0, 3.05, z), panelMat, false);
      const light = new PointLight(`f${floor}-light-${index}`, new Vector3(0, 2.72, z), this.scene);
      light.parent = root;
      light.diffuse = floor === 5 ? new Color3(0.78, 0.86, 0.78) : new Color3(0.78, 0.90, 0.90);
      light.intensity = floor === 6 && index === 1 ? 0.23 : 0.42;
      light.range = 11;
      lights.push(light);
      this.flickerBase.set(light, light.intensity);
    });
  }

  private buildInfirmary(root: TransformNode): void {
    const sheet = this.pbr("infirmary-sheet", new Color3(0.62, 0.68, 0.65), 0.95);
    for (const z of [18.3, 21.7]) {
      this.box(root, `infirmary-bed-${z}`, new Vector3(2.2, 0.35, 0.9), new Vector3(-7.2, 0.55, z), sheet, true);
      this.box(root, `infirmary-frame-${z}`, new Vector3(2.35, 0.08, 1.0), new Vector3(-7.2, 0.32, z), this.metal, false);
    }
  }

  private buildLibrary(root: TransformNode): void {
    for (const x of [-5.1, -7.0, -8.7]) {
      this.box(root, `library-shelf-${x}`, new Vector3(0.62, 2.3, 5.2), new Vector3(x, 1.15, 20), this.darkWood, true);
    }
    const marker = this.marker(root, "library-clue-marker", new Vector3(-8.65, 1.15, 17.8), new Color3(0.72, 0.18, 0.13));
    marker.scaling = new Vector3(0.7, 0.7, 0.7);
    this.interactions.push({ id: "clue_2f_library", kind: "clue", floor: 2, x: -8.5, y: floorBaseY(2) + 0.9, z: 17.8, label: "返却箱を調べる", data: { digit: "4" } });
  }

  private buildScienceLab(root: TransformNode): void {
    for (const x of [-5.1, -7.2]) {
      this.box(root, `science-bench-${x}`, new Vector3(1.1, 0.78, 4.7), new Vector3(x, 0.39, 20), this.desk, true);
      this.box(root, `science-top-${x}`, new Vector3(1.2, 0.08, 4.9), new Vector3(x, 0.82, 20), this.metal, false);
    }
    this.marker(root, "science-clue-marker", new Vector3(-8.8, 1.35, 20.5), new Color3(0.55, 0.72, 0.76));
    this.interactions.push({ id: "clue_3f_science", kind: "clue", floor: 3, x: -8.55, y: floorBaseY(3) + 0.9, z: 20.5, label: "薬品棚の記録を見る", data: { digit: "1" } });
  }

  private buildMathRoom(root: TransformNode): void {
    const board = this.pbr("math-board", new Color3(0.025, 0.10, 0.075), 0.96);
    this.box(root, "math-blackboard", new Vector3(0.08, 1.3, 4.5), new Vector3(-9.35, 1.7, 20), board, false);
    let i = 0;
    for (const x of [-5.1, -6.6, -8.1]) {
      for (const z of [18, 20, 22]) {
        this.box(root, `math-desk-${i++}`, new Vector3(0.72, 0.7, 0.9), new Vector3(x, 0.36, z), this.desk, true);
      }
    }
    this.marker(root, "math-clue-marker", new Vector3(-9.28, 1.65, 18.2), new Color3(0.83, 0.83, 0.70));
    this.interactions.push({ id: "clue_4f_math", kind: "clue", floor: 4, x: -8.8, y: floorBaseY(4) + 0.9, z: 18.2, label: "黒板の消し残しを見る", data: { digit: "6" } });
  }

  private buildBroadcastRoom(root: TransformNode): void {
    this.box(root, "broadcast-console", new Vector3(1.6, 0.8, 3.8), new Vector3(-7.2, 0.42, 20), this.metal, true);
    for (const z of [18.7, 20, 21.3]) {
      this.box(root, `broadcast-rack-${z}`, new Vector3(0.7, 1.8, 0.8), new Vector3(-8.75, 0.9, z), this.darkWood, true);
    }
    this.marker(root, "broadcast-clue-marker", new Vector3(-8.68, 1.2, 21.3), new Color3(0.66, 0.22, 0.16));
    this.interactions.push({ id: "clue_5f_broadcast", kind: "clue", floor: 5, x: -8.5, y: floorBaseY(5) + 0.9, z: 21.3, label: "古いカセットを調べる", data: { digit: "3" } });
  }

  private buildArchiveRoom(root: TransformNode): void {
    this.buildArchiveCabinets(root, 18.2);
    this.buildArchiveCabinets(root, 21.8);
    this.box(root, "maintenance-terminal", new Vector3(0.55, 1.35, 1.2), new Vector3(-8.9, 0.72, 20), this.metal, true);
    this.marker(root, "terminal-screen", new Vector3(-8.58, 1.23, 20), new Color3(0.08, 0.62, 0.48));
    this.interactions.push({ id: "terminal_6f", kind: "terminal", floor: 6, x: -8.25, y: floorBaseY(6) + 0.9, z: 20, label: "保守端末を操作する" });
  }

  private buildSixthFloorDetails(root: TransformNode): void {
    const clockMat = new StandardMaterial("old-clock-face", this.scene);
    clockMat.diffuseColor = new Color3(0.55, 0.55, 0.49);
    const clock = MeshBuilder.CreateCylinder("old-clock", { height: 0.12, diameter: 0.8, tessellation: 32 }, this.scene);
    clock.rotation.z = Math.PI / 2;
    clock.position = new Vector3(-2.95, 2.15, 31.6);
    clock.material = clockMat;
    clock.parent = root;
    this.interactions.push({ id: "clock_6f", kind: "clock", floor: 6, x: -2.45, y: floorBaseY(6) + 0.9, z: 31.6, label: "止まった時計を見る" });
    this.interactions.push({ id: "west_landing_6f", kind: "dive_route", floor: 6, x: 0, y: floorBaseY(6) + 0.9, z: 38.4, label: "西非常階段から中庭を見る" });
  }

  private buildGym(root: TransformNode): void {
    const gymFloor = this.pbr("gym-floor", new Color3(0.38, 0.23, 0.11), 0.28);
    const gymWall = this.pbr("gym-wall", new Color3(0.47, 0.47, 0.43), 0.95);
    this.box(root, "gym-floor", new Vector3(18, 0.14, 26), new Vector3(0, -0.07, 54), gymFloor, true);
    this.box(root, "gym-ceiling", new Vector3(18, 0.14, 26), new Vector3(0, 6.1, 54), this.ceiling, false);
    this.box(root, "gym-left-wall", new Vector3(0.2, 6.2, 26), new Vector3(-9.0, 3.0, 54), gymWall, true);
    this.box(root, "gym-right-wall", new Vector3(0.2, 6.2, 26), new Vector3(9.0, 3.0, 54), gymWall, true);
    this.box(root, "gym-back-wall", new Vector3(18, 6.2, 0.2), new Vector3(0, 3.0, 67.0), gymWall, true);
    this.box(root, "gym-front-left", new Vector3(5.8, 6.2, 0.2), new Vector3(-6.1, 3.0, 41.0), gymWall, true);
    this.box(root, "gym-front-right", new Vector3(5.8, 6.2, 0.2), new Vector3(6.1, 3.0, 41.0), gymWall, true);

    const courtLine = this.pbr("court-line", new Color3(0.72, 0.69, 0.58), 0.75);
    this.box(root, "court-center", new Vector3(15.5, 0.012, 0.045), new Vector3(0, 0.015, 54), courtLine, false);
    this.box(root, "court-left", new Vector3(0.045, 0.012, 20), new Vector3(-7.7, 0.015, 54), courtLine, false);
    this.box(root, "court-right", new Vector3(0.045, 0.012, 20), new Vector3(7.7, 0.015, 54), courtLine, false);

    for (const [i, z] of [44, 49, 54, 59, 64].entries()) {
      this.box(root, `gym-beam-${i}`, new Vector3(17.7, 0.28, 0.30), new Vector3(0, 5.55, z), this.metal, false);
    }

    const gymLights = this.lights.get(1)!;
    for (const [index, x] of [-4.5, 4.5].entries()) {
      for (const z of [47.5, 59.5]) {
        const light = new PointLight(`gym-light-${index}-${z}`, new Vector3(x, 5.25, z), this.scene);
        light.parent = root;
        light.diffuse = new Color3(0.84, 0.91, 0.96);
        light.intensity = z > 55 && x < 0 ? 0.42 : 0.72;
        light.range = 16;
        gymLights.push(light);
        this.flickerBase.set(light, light.intensity);
        const panel = new StandardMaterial(`gym-panel-mat-${index}-${z}`, this.scene);
        panel.disableLighting = true;
        panel.emissiveColor = new Color3(0.78, 0.87, 0.9);
        this.box(root, `gym-panel-${index}-${z}`, new Vector3(2.4, 0.06, 0.36), new Vector3(x, 5.96, z), panel, false);
      }
    }

    const exitMat = this.pbr("exit-door", new Color3(0.08, 0.18, 0.14), 0.66);
    const exitGlow = new StandardMaterial("exit-glow", this.scene);
    exitGlow.disableLighting = true;
    exitGlow.emissiveColor = new Color3(0.06, 0.82, 0.40);

    this.box(root, "exit-a", new Vector3(2.0, 2.7, 0.12), new Vector3(-3.3, 1.35, 66.86), exitMat, true);
    this.box(root, "exit-b", new Vector3(2.0, 2.7, 0.12), new Vector3(3.3, 1.35, 66.86), exitMat, true);
    this.box(root, "exit-a-sign", new Vector3(1.35, 0.32, 0.08), new Vector3(-3.3, 2.98, 66.8), exitGlow, false);
    this.box(root, "exit-b-sign", new Vector3(1.35, 0.32, 0.08), new Vector3(3.3, 2.98, 66.8), exitGlow, false);

    this.interactions.push({ id: "exit_a", kind: "exit_a", floor: 1, x: -3.3, y: 0.9, z: 65.7, label: "非常口 A" });
    this.interactions.push({ id: "exit_b", kind: "exit_b", floor: 1, x: 3.3, y: 0.9, z: 65.7, label: "非常口 B" });
    this.box(root, "mat-storage", new Vector3(2.8, 1.2, 1.0), new Vector3(-7.2, 0.6, 43), this.pbr("mat-blue", new Color3(0.03, 0.16, 0.42), 0.8), true);
    this.interactions.push({ id: "mat_storage_1f", kind: "mat_pickup", floor: 1, x: -6.4, y: 0.9, z: 43, label: "体育マットを運ぶ" });
    this.interactions.push({ id: "courtyard_1f", kind: "mat_place", floor: 1, x: 7.2, y: 0.9, z: 45, label: "中庭にマットを置く" });
  }

  private buildLockers(root: TransformNode, startZ: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.box(root, `locker-${root.name}-${i}`, new Vector3(0.48, 1.85, 0.72), new Vector3(2.72, 0.92, startZ + i * 0.76), this.metal, true);
    }
  }

  private buildBench(root: TransformNode, z: number): void {
    this.box(root, `bench-seat-${root.name}-${z}`, new Vector3(0.58, 0.12, 2.8), new Vector3(2.5, 0.48, z), this.darkWood, true);
    this.box(root, `bench-leg-a-${root.name}-${z}`, new Vector3(0.14, 0.48, 0.14), new Vector3(2.5, 0.24, z - 0.9), this.metal, false);
    this.box(root, `bench-leg-b-${root.name}-${z}`, new Vector3(0.14, 0.48, 0.14), new Vector3(2.5, 0.24, z + 0.9), this.metal, false);
  }

  private buildUtilityCarts(root: TransformNode, z: number): void {
    for (let i = 0; i < 2; i++) {
      this.box(root, `utility-cart-${i}`, new Vector3(0.72, 0.86, 1.0), new Vector3(2.55, 0.45, z + i * 1.25), this.metal, true);
    }
  }

  private buildArchiveCabinets(root: TransformNode, z: number): void {
    for (let i = 0; i < 4; i++) {
      this.box(root, `archive-${root.name}-${z}-${i}`, new Vector3(0.55, 2.05, 0.9), new Vector3(-8.75, 1.02, z + i * 0.92), this.metal, true);
    }
  }

  private marker(root: TransformNode, name: string, position: Vector3, color: Color3): Mesh {
    const material = new StandardMaterial(`${name}-mat`, this.scene);
    material.disableLighting = true;
    material.emissiveColor = color;
    return this.box(root, name, new Vector3(0.12, 0.32, 0.32), position, material, false);
  }

  private restoreLights(floor: FloorId): void {
    for (const light of this.lights.get(floor) ?? []) {
      light.intensity = this.flickerBase.get(light) ?? light.intensity;
    }
  }

  private createMaterials(): void {
    this.wall = this.pbr("wall", new Color3(0.56, 0.57, 0.53), 0.94);
    this.floorMat = this.pbr("floor", new Color3(0.13, 0.20, 0.19), 0.38);
    this.ceiling = this.pbr("ceiling", new Color3(0.46, 0.47, 0.43), 0.98);
    this.door = this.pbr("door", new Color3(0.10, 0.17, 0.18), 0.78);
    this.metal = this.pbr("metal", new Color3(0.22, 0.24, 0.24), 0.5, 0.24);
    this.glass = this.pbr("night-glass", new Color3(0.012, 0.035, 0.045), 0.16, 0.08);
    this.glass.alpha = 0.82;
    this.trim = this.pbr("trim", new Color3(0.18, 0.23, 0.22), 0.78);
    this.desk = this.pbr("desk", new Color3(0.29, 0.22, 0.13), 0.68);
    this.darkWood = this.pbr("dark-wood", new Color3(0.14, 0.09, 0.05), 0.72);
  }

  private pbr(name: string, color: Color3, roughness = 0.8, metallic = 0): PBRMaterial {
    const material = new PBRMaterial(name, this.scene);
    material.albedoColor = color;
    material.roughness = roughness;
    material.metallic = metallic;
    return material;
  }

  private box(
    root: TransformNode,
    name: string,
    size: Vector3,
    position: Vector3,
    material: PBRMaterial | StandardMaterial,
    collides: boolean,
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, this.scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.checkCollisions = collides;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.parent = root;
    return mesh;
  }
}
