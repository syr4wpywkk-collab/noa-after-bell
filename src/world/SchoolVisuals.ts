import "@babylonjs/loaders/glTF";
import {
  Color3,
  PointLight,
  Scene,
  SceneLoader,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { FloorId } from "../game/WorldLayout";
import { isInStairwell } from "./StairNavigation";
import { FIRST_FLOOR_START } from "./FirstFloorLayout";

export type SchoolVisualMode = "blender" | "fallback";

export type SchoolVisualLoadResult = {
  mode: SchoolVisualMode;
  meshCount: number;
  materialCount: number;
  reason?: string;
};

const FLOOR_NODE = /^FLOOR_(0[1-6])$/;
const LIGHT_NODE = /^LIGHT_F([1-6])_/;

type MarkerLight = {
  floor: FloorId;
  position: Vector3;
  light: PointLight;
  baseIntensity: number;
};

export class SchoolVisuals {
  private floorRoots = new Map<FloorId, TransformNode>();
  private visibilityKey = "";
  private loaded = false;
  private markerLights: MarkerLight[] = [];
  private flickerFloor: FloorId | null = null;
  private flickerUntil = 0;

  constructor(private scene: Scene) {}

  async load(
    assetRoot = "/assets/generated/",
    fileName = "school_shell.glb",
  ): Promise<SchoolVisualLoadResult> {
    try {
      const result = await SceneLoader.ImportMeshAsync("", assetRoot, fileName, this.scene);

      for (const mesh of result.meshes) {
        mesh.checkCollisions = false;
        mesh.isPickable = false;
        mesh.receiveShadows = true;
      }

      let startLightPosition: Vector3 | null = null;
      for (const node of result.transformNodes) {
        const floorMatch = FLOOR_NODE.exec(node.name);
        if (floorMatch) {
          const floor = Number(floorMatch[1]) as FloorId;
          this.floorRoots.set(floor, node);
        }

        const lightMatch = LIGHT_NODE.exec(node.name);
        if (lightMatch) {
          node.computeWorldMatrix(true);
          const floor = Number(lightMatch[1]) as FloorId;
          const position = node.getAbsolutePosition().clone();
          if (node.name === "LIGHT_F1_CLASS_class_1_6_01") startLightPosition = position.clone();
          const isCorridor = node.name.includes("CORRIDOR");
          const isEmergency = node.name.includes("EMERGENCY");
          const baseIntensity = isEmergency ? 0.28 : isCorridor ? 0.72 : 0.58;
          const light = new PointLight(`runtime-${node.name}`, position, this.scene);
          light.diffuse = isEmergency ? new Color3(0.42, 0.72, 0.48) : new Color3(0.82, 0.90, 0.88);
          light.specular = new Color3(0.22, 0.25, 0.24);
          light.intensity = baseIntensity;
          light.range = isCorridor ? 12.5 : 10.5;
          light.setEnabled(false);
          this.markerLights.push({ floor, position, light, baseIntensity });
        }
      }

      const expectedStartLight = new Vector3(-6.8, 2.68, 57);
      const alignmentError = startLightPosition
        ? Vector3.Distance(startLightPosition, expectedStartLight)
        : Number.POSITIVE_INFINITY;
      const floorOneRoot = this.floorRoots.get(1);
      floorOneRoot?.computeWorldMatrix(true);
      const floorMeshes = floorOneRoot?.getChildMeshes(false) ?? [];
      const maxFloorOneY = floorMeshes.length
        ? Math.max(...floorMeshes.map((mesh) => {
          mesh.computeWorldMatrix(true);
          return mesh.getBoundingInfo().boundingBox.maximumWorld.y;
        }))
        : Number.NEGATIVE_INFINITY;

      if (
        this.floorRoots.size !== 6 ||
        this.markerLights.filter((entry) => entry.floor === 1).length < 10 ||
        alignmentError > 1.25 ||
        maxFloorOneY < 2.5
      ) {
        for (const marker of this.markerLights) marker.light.dispose();
        this.markerLights = [];
        for (const mesh of result.meshes) mesh.dispose(false, true);
        for (const node of result.transformNodes) node.dispose();
        throw new Error(
          `invalid Blender school: floors=${this.floorRoots.size}, 1F lights=${this.markerLights.filter((entry) => entry.floor === 1).length}, alignment=${alignmentError.toFixed(2)}, maxY=${maxFloorOneY.toFixed(2)}`,
        );
      }

      this.loaded = true;
      this.setPlayerContext(1, new Vector3(FIRST_FLOOR_START.x, FIRST_FLOOR_START.y, FIRST_FLOOR_START.z));

      const materialCount = new Set(
        result.meshes
          .map((mesh) => mesh.material?.uniqueId)
          .filter((id): id is number => typeof id === "number"),
      ).size;

      return {
        mode: "blender",
        meshCount: result.meshes.length,
        materialCount,
      };
    } catch (error) {
      this.loaded = false;
      this.floorRoots.clear();
      for (const marker of this.markerLights) marker.light.dispose();
      this.markerLights = [];
      return {
        mode: "fallback",
        meshCount: 0,
        materialCount: 0,
        reason: error instanceof Error ? error.message : "unknown visual load failure",
      };
    }
  }

  setPlayerContext(floor: FloorId, position: Vector3): void {
    if (!this.loaded) return;
    const includeAdjacent = isInStairwell(position.x, position.z);

    for (const marker of this.markerLights) {
      const sameFloor = marker.floor === floor;
      const dx = marker.position.x - position.x;
      const dz = marker.position.z - position.z;
      marker.light.setEnabled(sameFloor && dx * dx + dz * dz < 18 * 18);
    }

    const key = `${floor}:${includeAdjacent ? 1 : 0}`;
    if (key === this.visibilityKey) return;
    this.visibilityKey = key;
    for (const [id, root] of this.floorRoots) {
      root.setEnabled(id === floor || (includeAdjacent && Math.abs(id - floor) <= 1));
    }
  }

  flickerLights(floor: FloorId, duration = 800): void {
    this.flickerFloor = floor;
    this.flickerUntil = performance.now() + duration;
  }

  update(now: number): void {
    for (const marker of this.markerLights) {
      if (this.flickerFloor === marker.floor && now <= this.flickerUntil) {
        const pulse = Math.sin(now * 0.075 + marker.position.z) > 0.15 ? 1 : 0.05;
        marker.light.intensity = marker.baseIntensity * pulse;
      } else {
        marker.light.intensity = marker.baseIntensity;
      }
    }
    if (this.flickerFloor && now > this.flickerUntil) this.flickerFloor = null;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
