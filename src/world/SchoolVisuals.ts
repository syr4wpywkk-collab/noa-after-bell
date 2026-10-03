import "@babylonjs/loaders/glTF";
import {
  Scene,
  SceneLoader,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { FloorId } from "../game/WorldLayout";
import { isInStairwell } from "./StairNavigation";

export type SchoolVisualMode = "blender" | "fallback";

export type SchoolVisualLoadResult = {
  mode: SchoolVisualMode;
  meshCount: number;
  materialCount: number;
  reason?: string;
};

const FLOOR_NODE = /^FLOOR_(0[1-6])$/;

export class SchoolVisuals {
  private floorRoots = new Map<FloorId, TransformNode>();
  private visibilityKey = "";
  private loaded = false;

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

      for (const node of result.transformNodes) {
        const match = FLOOR_NODE.exec(node.name);
        if (!match) continue;
        const floor = Number(match[1]) as FloorId;
        this.floorRoots.set(floor, node);
      }

      if (this.floorRoots.size !== 6) {
        for (const mesh of result.meshes) mesh.dispose(false, true);
        for (const node of result.transformNodes) node.dispose();
        throw new Error(`expected 6 Blender floor roots, found ${this.floorRoots.size}`);
      }

      this.loaded = true;
      this.setPlayerContext(1, new Vector3(0, 0.9, 6));

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
    const key = `${floor}:${includeAdjacent ? 1 : 0}`;
    if (key === this.visibilityKey) return;
    this.visibilityKey = key;

    for (const [id, root] of this.floorRoots) {
      root.setEnabled(id === floor || (includeAdjacent && Math.abs(id - floor) <= 1));
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
