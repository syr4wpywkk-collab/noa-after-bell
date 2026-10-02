import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

type FlickerFixture = {
  light: PointLight;
  panel: StandardMaterial;
};

export class School {
  private flicker?: FlickerFixture;
  private lastFlicker = 0;
  private flickerUntil = 0;

  constructor(private scene: Scene) {}

  build(): void {
    const wall = this.pbr("wall", new Color3(0.58, 0.59, 0.55), 0.92);
    const floor = this.pbr("floor", new Color3(0.14, 0.18, 0.18), 0.36);
    const ceiling = this.pbr("ceiling", new Color3(0.42, 0.43, 0.40), 0.98);
    const gymFloor = this.pbr("gym-floor", new Color3(0.29, 0.20, 0.12), 0.26);
    const door = this.pbr("door", new Color3(0.10, 0.18, 0.20), 0.78);
    const metal = this.pbr("metal", new Color3(0.22, 0.25, 0.25), 0.48, 0.28);
    const glass = this.pbr("night-glass", new Color3(0.015, 0.035, 0.045), 0.18, 0.08);
    const trim = this.pbr("trim", new Color3(0.20, 0.24, 0.23), 0.76);
    const darkWood = this.pbr("dark-wood", new Color3(0.17, 0.10, 0.055), 0.68);
    const deskTop = this.pbr("desk-top", new Color3(0.30, 0.23, 0.14), 0.68);
    const board = this.pbr("blackboard", new Color3(0.035, 0.095, 0.070), 0.90);
    glass.alpha = 0.82;

    this.buildCorridor(wall, floor, ceiling, door, metal, glass, trim);
    this.buildOpenClassroom(wall, floor, ceiling, door, metal, glass, darkWood, deskTop, board);
    this.buildGym(wall, ceiling, gymFloor, door, metal, glass, trim);
  }

  update(now: number): void {
    if (!this.flicker) return;

    if (now - this.lastFlicker > 5200) {
      this.lastFlicker = now;
      this.flickerUntil = now + 620;
    }

    if (now < this.flickerUntil) {
      const pulse = Math.sin(now * 0.11) > 0.15 ? 1 : 0.05;
      this.flicker.light.intensity = 0.24 * pulse;
      this.flicker.panel.emissiveColor = new Color3(0.72 * pulse, 0.82 * pulse, 0.84 * pulse);
    } else {
      this.flicker.light.intensity = 0.24;
      this.flicker.panel.emissiveColor = new Color3(0.72, 0.82, 0.84);
    }
  }

  private buildCorridor(
    wall: PBRMaterial,
    floor: PBRMaterial,
    ceiling: PBRMaterial,
    door: PBRMaterial,
    metal: PBRMaterial,
    glass: PBRMaterial,
    trim: PBRMaterial
  ): void {
    this.box("corridor-floor", new Vector3(6.2, 0.12, 48), new Vector3(0, -0.06, 24), floor, true);
    this.box("corridor-ceiling", new Vector3(6.2, 0.12, 48), new Vector3(0, 3.25, 24), ceiling, false);
    this.box("corridor-right", new Vector3(0.18, 3.3, 48), new Vector3(3.1, 1.6, 24), wall, true);

    // The left wall is segmented around actual door openings.
    const doorCenters = [7, 15, 23, 31, 39, 46];
    const openingHalf = 0.76;
    let cursor = 0;

    doorCenters.forEach((z, index) => {
      const start = z - openingHalf;
      if (start > cursor) {
        this.box(
          `corridor-left-segment-${index}`,
          new Vector3(0.18, 3.3, start - cursor),
          new Vector3(-3.1, 1.6, (cursor + start) / 2),
          wall,
          true
        );
      }
      cursor = z + openingHalf;
    });

    if (cursor < 48) {
      this.box(
        "corridor-left-segment-end",
        new Vector3(0.18, 3.3, 48 - cursor),
        new Vector3(-3.1, 1.6, (cursor + 48) / 2),
        wall,
        true
      );
    }

    for (const z of doorCenters) {
      const isOpenClassroom = z === 23;
      const doorMesh = this.box(
        `door-${z}`,
        new Vector3(0.08, 2.25, 1.25),
        isOpenClassroom ? new Vector3(-3.66, 1.12, z - 0.58) : new Vector3(-3.02, 1.12, z),
        door,
        !isOpenClassroom
      );

      if (isOpenClassroom) doorMesh.rotation.y = Math.PI / 2;

      this.box(`door-frame-top-${z}`, new Vector3(0.12, 0.10, 1.62), new Vector3(-3.03, 2.30, z), metal, false);
      this.box(`door-frame-a-${z}`, new Vector3(0.12, 2.34, 0.10), new Vector3(-3.03, 1.17, z - 0.74), metal, false);
      this.box(`door-frame-b-${z}`, new Vector3(0.12, 2.34, 0.10), new Vector3(-3.03, 1.17, z + 0.74), metal, false);
      this.box(`room-plate-${z}`, new Vector3(0.05, 0.26, 0.48), new Vector3(-2.93, 2.08, z + 0.98), metal, false);

      if (!isOpenClassroom) {
        this.box(`door-glass-${z}`, new Vector3(0.05, 0.52, 0.34), new Vector3(-2.97, 1.72, z - 0.31), glass, false);
      }
    }

    // Window rhythm and mullions.
    for (const z of [6, 12, 18, 24, 30, 36, 42]) {
      this.box(`window-${z}`, new Vector3(0.07, 1.15, 2.5), new Vector3(3.0, 1.72, z), glass, false);
      this.box(`window-bar-v-${z}`, new Vector3(0.09, 1.25, 0.05), new Vector3(2.94, 1.72, z), metal, false);
      this.box(`window-bar-h-${z}`, new Vector3(0.09, 0.05, 2.56), new Vector3(2.94, 1.72, z), metal, false);
      this.box(`window-sill-${z}`, new Vector3(0.22, 0.08, 2.7), new Vector3(2.93, 1.10, z), trim, false);
    }

    // Floor seams and skirting subtly sell the scale.
    for (let z = 2; z < 48; z += 2) {
      this.box(`floor-seam-${z}`, new Vector3(5.8, 0.008, 0.018), new Vector3(0, 0.008, z), trim, false);
    }
    this.box("skirting-left", new Vector3(0.05, 0.16, 48), new Vector3(-3.0, 0.08, 24), trim, false);
    this.box("skirting-right", new Vector3(0.05, 0.16, 48), new Vector3(3.0, 0.08, 24), trim, false);

    // Notice board, lockers and a low bench.
    this.box("notice-board", new Vector3(0.06, 1.15, 2.6), new Vector3(-2.98, 1.75, 11), this.pbr("notice-cork", new Color3(0.18, 0.12, 0.07), 0.86), false);
    for (let i = 0; i < 5; i++) {
      this.box(`locker-${i}`, new Vector3(0.46, 1.8, 0.72), new Vector3(2.76, 0.9, 27 + i * 0.74), metal, false);
    }
    this.box("hall-bench-seat", new Vector3(0.55, 0.12, 2.8), new Vector3(2.55, 0.48, 9.3), trim, false);
    this.box("hall-bench-leg-a", new Vector3(0.16, 0.48, 0.16), new Vector3(2.55, 0.24, 8.35), metal, false);
    this.box("hall-bench-leg-b", new Vector3(0.16, 0.48, 0.16), new Vector3(2.55, 0.24, 10.25), metal, false);

    // Fluorescent fixtures. Only alternate panels get real lights.
    for (let z = 4, i = 0; z < 48; z += 6, i++) {
      const panel = this.lightPanel(`hall-panel-${i}`, new Vector3(0, 3.13, z), new Vector3(1.45, 0.04, 0.28));
      this.box(`hall-fixture-${i}`, new Vector3(1.62, 0.07, 0.38), new Vector3(0, 3.17, z), trim, false);

      if (i % 2 === 0) {
        const point = new PointLight(`hall-light-${i}`, new Vector3(0, 2.75, z), this.scene);
        point.diffuse = new Color3(0.78, 0.88, 0.90);
        point.intensity = i === 4 ? 0.24 : 0.38;
        point.range = 10.5;
        if (i === 4) this.flicker = { light: point, panel };
      }
    }
  }

  private buildOpenClassroom(
    wall: PBRMaterial,
    floor: PBRMaterial,
    ceiling: PBRMaterial,
    door: PBRMaterial,
    metal: PBRMaterial,
    glass: PBRMaterial,
    darkWood: PBRMaterial,
    deskTop: PBRMaterial,
    board: PBRMaterial
  ): void {
    const centerZ = 23;
    const roomCenterX = -6.65;

    this.box("classroom-floor", new Vector3(7.0, 0.12, 7.4), new Vector3(roomCenterX, -0.06, centerZ), floor, true);
    this.box("classroom-ceiling", new Vector3(7.0, 0.12, 7.4), new Vector3(roomCenterX, 3.25, centerZ), ceiling, false);
    this.box("classroom-far-wall", new Vector3(0.18, 3.3, 7.4), new Vector3(-10.15, 1.6, centerZ), wall, true);
    this.box("classroom-front-wall", new Vector3(7.0, 3.3, 0.18), new Vector3(roomCenterX, 1.6, 19.3), wall, true);
    this.box("classroom-back-wall", new Vector3(7.0, 3.3, 0.18), new Vector3(roomCenterX, 1.6, 26.7), wall, true);

    // Doorway throat to make the room feel structurally connected to the corridor.
    this.box("classroom-entry-left", new Vector3(1.0, 3.3, 0.18), new Vector3(-3.62, 1.6, 22.18), wall, true);
    this.box("classroom-entry-right", new Vector3(1.0, 3.3, 0.18), new Vector3(-3.62, 1.6, 23.82), wall, true);

    // Blackboard and teacher desk.
    this.box("classroom-blackboard", new Vector3(0.07, 1.25, 4.4), new Vector3(-10.03, 1.78, centerZ), board, false);
    this.box("teacher-desk-top", new Vector3(0.82, 0.08, 1.55), new Vector3(-8.95, 0.76, centerZ), deskTop, false);
    this.box("teacher-desk-body", new Vector3(0.55, 0.72, 1.32), new Vector3(-8.95, 0.39, centerZ), metal, true);

    // Nine desks: enough visual density without murdering mobile draw calls.
    const deskXs = [-5.0, -6.45, -7.9];
    const deskZs = [20.7, 22.7, 24.7];

    let deskIndex = 0;
    for (const x of deskXs) {
      for (const z of deskZs) {
        const top = this.box(
          `student-desk-top-${deskIndex}`,
          new Vector3(0.72, 0.055, 1.02),
          new Vector3(x, 0.73, z),
          deskTop,
          false
        );
        top.rotation.y = 0.02 * ((deskIndex % 3) - 1);

        this.box(`student-desk-leg-a-${deskIndex}`, new Vector3(0.06, 0.70, 0.06), new Vector3(x - 0.27, 0.35, z - 0.36), metal, true);
        this.box(`student-desk-leg-b-${deskIndex}`, new Vector3(0.06, 0.70, 0.06), new Vector3(x + 0.27, 0.35, z - 0.36), metal, true);

        this.box(`chair-seat-${deskIndex}`, new Vector3(0.55, 0.06, 0.55), new Vector3(x + 0.72, 0.49, z), darkWood, false);
        this.box(`chair-back-${deskIndex}`, new Vector3(0.06, 0.72, 0.55), new Vector3(x + 0.98, 0.82, z), darkWood, false);
        deskIndex++;
      }
    }

    // A row of dark exterior windows at the far side of the classroom.
    for (const z of [20.4, 22.15, 23.9, 25.65]) {
      this.box(`classroom-window-${z}`, new Vector3(0.07, 1.18, 1.5), new Vector3(-10.02, 1.75, z), glass, false);
    }

    // One dead fluorescent panel: readable by flashlight, but not actually lighting the room.
    const deadPanel = new StandardMaterial("classroom-dead-panel", this.scene);
    deadPanel.disableLighting = true;
    deadPanel.emissiveColor = new Color3(0.07, 0.085, 0.085);
    this.box("classroom-dead-light", new Vector3(1.55, 0.04, 0.3), new Vector3(-6.7, 3.13, centerZ), deadPanel, false);

    // Door leaf resting inside the classroom.
    const leaf = this.box("classroom-open-door-leaf", new Vector3(0.08, 2.25, 1.25), new Vector3(-3.66, 1.12, 22.42), door, false);
    leaf.rotation.y = Math.PI / 2;
  }

  private buildGym(
    wall: PBRMaterial,
    ceiling: PBRMaterial,
    gymFloor: PBRMaterial,
    door: PBRMaterial,
    metal: PBRMaterial,
    glass: PBRMaterial,
    trim: PBRMaterial
  ): void {
    this.box("gym-floor", new Vector3(18, 0.14, 24), new Vector3(0, -0.07, 60), gymFloor, true);
    this.box("gym-ceiling", new Vector3(18, 0.16, 24), new Vector3(0, 6.25, 60), ceiling, false);
    this.box("gym-left", new Vector3(0.2, 6.3, 24), new Vector3(-9.1, 3.1, 60), wall, true);
    this.box("gym-right", new Vector3(0.2, 6.3, 24), new Vector3(9.1, 3.1, 60), wall, true);
    this.box("gym-back", new Vector3(18.2, 6.3, 0.2), new Vector3(0, 3.1, 72.1), wall, true);

    this.box("gym-front-left", new Vector3(6, 6.3, 0.2), new Vector3(-6, 3.1, 48.05), wall, true);
    this.box("gym-front-right", new Vector3(6, 6.3, 0.2), new Vector3(6, 3.1, 48.05), wall, true);

    // Structural roof beams create strong flashlight silhouettes.
    for (const [i, z] of [51, 56, 61, 66, 71].entries()) {
      this.box(`gym-beam-${i}`, new Vector3(17.8, 0.28, 0.32), new Vector3(0, 5.72, z), metal, false);
      this.box(`gym-beam-left-drop-${i}`, new Vector3(0.22, 1.1, 0.22), new Vector3(-8.4, 5.2, z), metal, false);
      this.box(`gym-beam-right-drop-${i}`, new Vector3(0.22, 1.1, 0.22), new Vector3(8.4, 5.2, z), metal, false);
    }

    // Court markings built from very thin meshes.
    const line = this.pbr("court-line", new Color3(0.70, 0.68, 0.58), 0.72);
    const courtY = 0.012;
    this.box("court-center-line", new Vector3(15.2, 0.012, 0.045), new Vector3(0, courtY, 60), line, false);
    this.box("court-side-left", new Vector3(0.045, 0.012, 18), new Vector3(-7.6, courtY, 60), line, false);
    this.box("court-side-right", new Vector3(0.045, 0.012, 18), new Vector3(7.6, courtY, 60), line, false);
    this.box("court-base-a", new Vector3(15.2, 0.012, 0.045), new Vector3(0, courtY, 51), line, false);
    this.box("court-base-b", new Vector3(15.2, 0.012, 0.045), new Vector3(0, courtY, 69), line, false);

    const centerCircle = MeshBuilder.CreateTorus("court-center-circle", {
      diameter: 3.25,
      thickness: 0.045,
      tessellation: 48
    }, this.scene);
    centerCircle.position = new Vector3(0, 0.025, 60);
    centerCircle.rotation.x = Math.PI / 2;
    centerCircle.material = line;
    centerCircle.isPickable = false;

    // Wall pads and benches create scale near the floor.
    const padding = this.pbr("gym-padding", new Color3(0.075, 0.11, 0.12), 0.88);
    for (const z of [53, 57, 61, 65, 69]) {
      this.box(`gym-pad-left-${z}`, new Vector3(0.09, 1.9, 3.2), new Vector3(-8.98, 0.95, z), padding, false);
      this.box(`gym-pad-right-${z}`, new Vector3(0.09, 1.9, 3.2), new Vector3(8.98, 0.95, z), padding, false);
    }
    this.box("gym-bench-a", new Vector3(3.8, 0.12, 0.52), new Vector3(-5.8, 0.46, 50.7), trim, false);
    this.box("gym-bench-b", new Vector3(3.8, 0.12, 0.52), new Vector3(5.8, 0.46, 50.7), trim, false);

    // Exit door + glowing emergency sign.
    this.box("exit-door", new Vector3(2.3, 2.7, 0.12), new Vector3(0, 1.35, 71.95), door, false);
    const exitMat = new StandardMaterial("exit-emissive", this.scene);
    exitMat.disableLighting = true;
    exitMat.emissiveColor = new Color3(0.05, 0.72, 0.38);
    this.box("exit-sign", new Vector3(1.65, 0.38, 0.08), new Vector3(0, 3.02, 71.92), exitMat, false);

    // Colder gym lighting.
    const gymLights = [
      new Vector3(-4.5, 5.55, 55),
      new Vector3(4.5, 5.55, 55),
      new Vector3(-4.5, 5.55, 65),
      new Vector3(4.5, 5.55, 65)
    ];

    gymLights.forEach((position, i) => {
      this.lightPanel(`gym-panel-${i}`, new Vector3(position.x, 6.05, position.z), new Vector3(2.25, 0.05, 0.42));
      const light = new PointLight(`gym-light-${i}`, position, this.scene);
      light.diffuse = new Color3(0.83, 0.90, 0.95);
      light.intensity = i === 2 ? 0.48 : 0.68;
      light.range = 15;
    });

    const hoopMat = this.pbr("hoop-metal", new Color3(0.16, 0.17, 0.18), 0.36, 0.5);
    for (const z of [53.5, 66.5]) {
      this.box(`goal-post-${z}`, new Vector3(0.12, 3.2, 0.12), new Vector3(0, 1.6, z), hoopMat, false);
      this.box(`goal-board-${z}`, new Vector3(2.0, 1.15, 0.08), new Vector3(0, 3.15, z), glass, false);
    }
  }

  private pbr(name: string, color: Color3, roughness = 0.8, metallic = 0): PBRMaterial {
    const material = new PBRMaterial(name, this.scene);
    material.albedoColor = color;
    material.roughness = roughness;
    material.metallic = metallic;
    return material;
  }

  private box(
    name: string,
    size: Vector3,
    position: Vector3,
    material: PBRMaterial | StandardMaterial,
    collides: boolean
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(name, {
      width: size.x,
      height: size.y,
      depth: size.z
    }, this.scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.checkCollisions = collides;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    return mesh;
  }

  private lightPanel(name: string, position: Vector3, size: Vector3): StandardMaterial {
    const mat = new StandardMaterial(`${name}-mat`, this.scene);
    mat.disableLighting = true;
    mat.emissiveColor = new Color3(0.72, 0.82, 0.84);
    this.box(name, size, position, mat, false);
    return mat;
  }
}
