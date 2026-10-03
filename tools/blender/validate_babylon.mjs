import fs from "node:fs";
import {
  NullEngine,
  Scene,
  SceneLoader,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

const glbPath = process.argv[2];
if (!glbPath) throw new Error("usage: node validate_babylon.mjs <school.glb>");

const bytes = fs.readFileSync(glbPath);
const uri = `data:model/gltf-binary;base64,${bytes.toString("base64")}`;

const engine = new NullEngine();
const scene = new Scene(engine);
const result = await SceneLoader.ImportMeshAsync("", "", uri, scene, undefined, ".glb");

const marker = result.transformNodes.find((node) => node.name === "LIGHT_F1_CLASS_class_1_6_01");
if (!marker) throw new Error("missing 1-6 center light marker in Babylon load");
marker.computeWorldMatrix(true);
const actual = marker.getAbsolutePosition().clone();
const expected = new Vector3(-6.8, 2.68, 57);
const alignment = Vector3.Distance(actual, expected);

const floorRoot = result.transformNodes.find((node) => node.name === "FLOOR_01");
if (!floorRoot) throw new Error("missing FLOOR_01 in Babylon load");
floorRoot.computeWorldMatrix(true);
const meshes = floorRoot.getChildMeshes(false);
const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
for (const mesh of meshes) {
  mesh.computeWorldMatrix(true);
  const box = mesh.getBoundingInfo().boundingBox;
  min.minimizeInPlace(box.minimumWorld);
  max.maximizeInPlace(box.maximumWorld);
}

console.log(JSON.stringify({
  marker: { x: actual.x, y: actual.y, z: actual.z },
  alignmentError: alignment,
  floorBounds: {
    min: { x: min.x, y: min.y, z: min.z },
    max: { x: max.x, y: max.y, z: max.z },
  },
  meshes: meshes.length,
}, null, 2));

if (alignment > 1.25) {
  throw new Error(`Babylon world alignment failed: marker error ${alignment.toFixed(3)}m`);
}
if (max.y < 2.5 || min.y > 0.25) {
  throw new Error(`Babylon 1F vertical bounds invalid: y=${min.y.toFixed(2)}..${max.y.toFixed(2)}`);
}
if (min.z > 1 || max.z < 90) {
  throw new Error(`Babylon 1F depth invalid: z=${min.z.toFixed(2)}..${max.z.toFixed(2)}`);
}

scene.dispose();
engine.dispose();
