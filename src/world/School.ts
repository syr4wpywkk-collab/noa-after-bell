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
    const floor = this.pbr("floor", new Color3(0.14, 0.18, 0.18), 0.42);
    const ceiling = this.pbr("ceiling", new Color3(0.42, 0.43, 0.40), 0.98);
    const gymFloor = this.pbr("gym-floor", new Color3(0.29, 0.20, 0.12), 0.32);
    const door = this.pbr("door", new Color3(0.10, 0.18, 0.20), 0.78);
    const metal = this.pbr("metal", new Color3(0.22, 0.25, 0.25), 0.48, 0.28);
    const glass = this.pbr("night-glass", new Color3(0.015, 0.035, 0.045), 0.18, 0.08);
    glass.alpha = 0.84;

    // Main corridor: 6m wide, 48m long.
    this.box("corridor-floor", new Vector3(6.2, 0.12, 48), new Vector3(0, -0.06, 24), floor, true);
    this.box("corridor-ceiling", new Vector3(6.2, 0.12, 48), new Vector3(0, 3.25, 24), ceiling, false);
    this.box("corridor-left", new Vector3(0.18, 3.3, 48), new Vector3(-3.1, 1.6, 24), wall, true);
    this.box("corridor-right", new Vector3(0.18, 3.3, 48), new Vector3(3.1, 1.6, 24), wall, true);

    // Doors and classroom hints on the left.
    for (const z of [7, 15, 23, 31, 39, 46]) {
      this.box(`door-${z}`, new Vector3(0.08, 2.25, 1.25), new Vector3(-3.0, 1.12, z), door, false);
      this.box(`door-frame-top-${z}`, new Vector3(0.09, 0.09, 1.5), new Vector3(-2.94, 2.3, z), metal, false);
      this.box(`room-plate-${z}`, new Vector3(0.05, 0.26, 0.48), new Vector3(-2.93, 2.08, z + 0.95), metal, false);
    }

    // Windows on the right. They only reflect darkness for now.
    for (const z of [6, 12, 18, 24, 30, 36, 42]) {
      this.box(`window-${z}`, new Vector3(0.07, 1.15, 2.5), new Vector3(3.0, 1.72, z), glass, false);
      this.box(`window-bar-${z}`, new Vector3(0.09, 1.25, 0.05), new Vector3(2.94, 1.72, z), metal, false);
    }

    // Notice boards and lockers make the hall feel lived-in.
    this.box("notice-board", new Vector3(0.06, 1.15, 2.6), new Vector3(-2.98, 1.75, 11), this.pbr("board", new Color3(0.18, 0.12, 0.07), 0.86), false);
    for (let i = 0; i < 5; i++) {
      this.box(`locker-${i}`, new Vector3(0.46, 1.8, 0.72), new Vector3(2.76, 0.9, 27 + i * 0.74), metal, false);
    }

    // Gym: intentionally much wider than the corridor.
    this.box("gym-floor", new Vector3(18, 0.14, 24), new Vector3(0, -0.07, 60), gymFloor, true);
    this.box("gym-ceiling", new Vector3(18, 0.16, 24), new Vector3(0, 6.25, 60), ceiling, false);
    this.box("gym-left", new Vector3(0.2, 6.3, 24), new Vector3(-9.1, 3.1, 60), wall, true);
    this.box("gym-right", new Vector3(0.2, 6.3, 24), new Vector3(9.1, 3.1, 60), wall, true);
    this.box("gym-back", new Vector3(18.2, 6.3, 0.2), new Vector3(0, 3.1, 72.1), wall, true);

    // Transition shoulders between corridor and gym.
    this.box("gym-front-left", new Vector3(6, 6.3, 0.2), new Vector3(-6, 3.1, 48.05), wall, true);
    this.box("gym-front-right", new Vector3(6, 6.3, 0.2), new Vector3(6, 3.1, 48.05), wall, true);

    // Exit door + glowing emergency sign at the far end.
    this.box("exit-door", new Vector3(2.3, 2.7, 0.12), new Vector3(0, 1.35, 71.95), door, false);
    const exitMat = new StandardMaterial("exit-emissive", this.scene);
    exitMat.disableLighting = true;
    exitMat.emissiveColor = new Color3(0.05, 0.72, 0.38);
    this.box("exit-sign", new Vector3(1.65, 0.38, 0.08), new Vector3(0, 3.02, 71.92), exitMat, false);

    // Corridor lights. Only some have actual PointLights to stay mobile friendly.
    for (let z = 4, i = 0; z < 48; z += 6, i++) {
      const panel = this.lightPanel(`hall-panel-${i}`, new Vector3(0, 3.13, z), new Vector3(1.45, 0.04, 0.28));
      if (i % 2 === 0) {
        const point = new PointLight(`hall-light-${i}`, new Vector3(0, 2.75, z), this.scene);
        point.diffuse = new Color3(0.78, 0.88, 0.90);
        point.intensity = i === 4 ? 0.24 : 0.38;
        point.range = 10.5;
        if (i === 4) this.flicker = { light: point, panel };
      }
    }

    // Gym lights are colder and more exposed.
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

    // Basketball goals as silhouettes.
    const hoopMat = this.pbr("hoop-metal", new Color3(0.16, 0.17, 0.18), 0.36, 0.5);
    for (const z of [53.5, 66.5]) {
      this.box(`goal-post-${z}`, new Vector3(0.12, 3.2, 0.12), new Vector3(0, 1.6, z), hoopMat, false);
      this.box(`goal-board-${z}`, new Vector3(2.0, 1.15, 0.08), new Vector3(0, 3.15, z), glass, false);
    }
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
