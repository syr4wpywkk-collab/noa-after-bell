/**
 * Cinematic, 3D set-dressing based on the two concept frames:
 * moonlit Japanese classroom and the corridor outside.
 *
 * Geometry is genuinely 3D; no claim is made that a single image
 * reconstructs unseen surfaces. Everything is collision-free and
 * layered over the existing Blender school shell.
 */
import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { FloorId } from "../game/WorldLayout";

export class CinematicDressing {
  private readonly root: TransformNode;
  private readonly moon: PointLight;

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode("reference-concept-first-floor", scene);
    const metal = this.material("metal-frame", new Color3(0.075, 0.092, 0.101), 0.66);
    const wood = this.material("worn-wood", new Color3(0.20, 0.12, 0.068), 0.81);
    const chalk = this.material("deep-green-blackboard", new Color3(0.018, 0.067, 0.056), 0.96);
    const porcelain = this.material("fluorescent-body", new Color3(0.44, 0.46, 0.43), 0.85);
    const sheen = this.material("corridor-wet-sheen", new Color3(0.12, 0.23, 0.26), 0.22);
    sheen.alpha = 0.20;

    // 1-6: the existing playable spawn room. Match the concept image
    // without changing the deterministic map and collision layout.
    this.box("green-board", new Vector3(0.08, 1.42, 4.8), new Vector3(-10.19, 1.68, 57.0), chalk);
    this.box("chalk-tray", new Vector3(0.24, 0.06, 4.9), new Vector3(-10.05, 0.95, 57.0), metal);
    this.box("teacher-desk", new Vector3(0.72, 0.73, 1.5), new Vector3(-9.38, 0.37, 60.15), wood);
    this.box("teacher-desk-top", new Vector3(0.78, 0.07, 1.58), new Vector3(-9.38, 0.77, 60.15), wood);

    // These wall labels and the clock are actual planes in the 3D room,
    // not fixed screen overlays.
    this.sign("motto", "自律   創造   友愛", new Vector3(-10.08, 2.71, 57), 2.65, 0.35, Math.PI / 2, "#b4b3a5", "#201f1b", 46);
    this.sign("classroom-sign", "１年６組", new Vector3(-3.07, 2.51, 59.7), 1.12, 0.36, Math.PI / 2, "#e0dcd1", "#1a2329", 76);
    this.sign("board-date", "１０月１６日（金）", new Vector3(-10.12, 2.17, 55.3), 1.07, 0.25, Math.PI / 2, "#b1c8b5", "#183a32", 43);
    this.sign("clock-dial", "02 : 17", new Vector3(-10.08, 2.60, 60.1), 0.68, 0.42, Math.PI / 2, "#c1c9bc", "#12191b", 53);

    // Physical ceiling fixture plus emissive tube (an independent mesh).
    const luminous = new StandardMaterial("concept-fluoro-emissive", scene);
    luminous.disableLighting = true;
    luminous.emissiveColor = new Color3(0.72, 0.77, 0.72);
    this.box("fluorescent-housing", new Vector3(0.20, 0.08, 2.0), new Vector3(-7.1, 3.0, 57.6), porcelain);
    this.box("fluorescent-tube", new Vector3(0.07, 0.025, 1.84), new Vector3(-7.1, 2.94, 57.6), luminous);

    // Moon-lit haze through the distant window, and reflective corridor
    // strips aligned to the actual 1F corridor rather than a fake skybox.
    this.moon = new PointLight("concept-moon-window", new Vector3(-9.65, 2.52, 55.0), scene);
    this.moon.diffuse = new Color3(0.28, 0.43, 0.65);
    this.moon.specular = new Color3(0.16, 0.22, 0.32);
    this.moon.intensity = 0.40;
    this.moon.range = 9;
    for (let z = 54.2; z <= 61.2; z += 1.15) {
      this.box("corridor-floor-reflection-" + z.toFixed(2),
        new Vector3(0.32, 0.003, 0.64), new Vector3(0.62, 0.006, z), sheen);
    }
    for (const z of [54.8, 58.8, 62.8]) {
      this.box("corridor-window-crossbar-" + z,
        new Vector3(0.07, 0.052, 1.55), new Vector3(3.00, 1.92, z), metal);
    }
    this.sign("corridor-notice", "最終下校　１８：３０", new Vector3(-3.04, 1.94, 56.7), 1.25, 0.38, Math.PI / 2, "#c9c7b9", "#232c31", 47);
    this.root.setEnabled(false);
  }

  setFloor(floor: FloorId): void {
    this.root.setEnabled(floor === 1);
    this.moon.setEnabled(floor === 1);
  }

  private material(name: string, color: Color3, roughness: number): PBRMaterial {
    const material = new PBRMaterial("concept-" + name, this.scene);
    material.albedoColor = color;
    material.roughness = roughness;
    material.metallic = 0.02;
    return material;
  }

  private box(name: string, size: Vector3, position: Vector3, material: PBRMaterial | StandardMaterial): void {
    const mesh = MeshBuilder.CreateBox("concept-" + name,
      {width:size.x,height:size.y,depth:size.z}, this.scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.checkCollisions = false;
    mesh.isPickable = false;
    mesh.parent = this.root;
  }

  private sign(
    name: string, value: string, position: Vector3, width: number, height: number,
    angle: number, foreground: string, background: string, fontSize: number,
  ): void {
    const canvas = new DynamicTexture("concept-" + name + "-texture",
      { width: 1024, height: 256 }, this.scene, false);
    canvas.hasAlpha = false;
    canvas.drawText(value, null, 156,
      "bold " + fontSize + "px sans-serif", foreground, background, true);
    const mat = new StandardMaterial("concept-" + name + "-material", this.scene);
    mat.diffuseTexture = canvas;
    mat.emissiveColor = new Color3(0.16, 0.16, 0.16);
    mat.backFaceCulling = false;
    const mesh = MeshBuilder.CreatePlane("concept-" + name,
      {width,height}, this.scene);
    mesh.rotation.y = angle;
    mesh.position.copyFrom(position);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.parent = this.root;
  }
}
