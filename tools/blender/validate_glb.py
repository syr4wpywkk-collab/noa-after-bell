#!/usr/bin/env python3
"""Re-import a generated GLB in a clean Blender scene and sanity-check it."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy
import mathutils


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    parser.add_argument("--min-meshes", type=int, default=100)
    parser.add_argument("--min-materials", type=int, default=6)
    parser.add_argument("--max-mb", type=float, default=6.0)
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    glb = Path(args.glb)
    if not glb.exists() or glb.stat().st_size < 1024:
        raise SystemExit(f"GLB missing or unexpectedly small: {glb}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(glb.resolve()))

    mesh_count = sum(1 for obj in bpy.context.scene.objects if obj.type == "MESH")
    materials = {slot.material.name for obj in bpy.context.scene.objects for slot in obj.material_slots if slot.material}
    world_ys = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ mathutils.Vector(corner)
            world_ys.append(world_corner.y)
    floor_nodes = {obj.name for obj in bpy.context.scene.objects if obj.name.startswith("FLOOR_")}
    expected_floors = {f"FLOOR_{floor_id:02d}" for floor_id in range(1, 7)}

    report = {
        "glb": str(glb),
        "bytes": glb.stat().st_size,
        "mesh_objects": mesh_count,
        "materials": len(materials),
        "floor_roots": len(expected_floors & floor_nodes),
        "blender_y_min": min(world_ys) if world_ys else None,
        "blender_y_max": max(world_ys) if world_ys else None,
    }
    print(json.dumps(report, indent=2))

    if mesh_count < args.min_meshes:
        raise SystemExit(f"Expected >= {args.min_meshes} mesh objects, got {mesh_count}")
    if len(materials) < args.min_materials:
        raise SystemExit(f"Expected >= {args.min_materials} materials, got {len(materials)}")
    if not expected_floors.issubset(floor_nodes):
        missing = sorted(expected_floors - floor_nodes)
        raise SystemExit(f"Missing floor roots: {missing}")
    if glb.stat().st_size > args.max_mb * 1024 * 1024:
        raise SystemExit(f"GLB exceeds mobile budget of {args.max_mb:.1f} MB")
    if not world_ys or min(world_ys) > -44.0:
        raise SystemExit("Exported world is not aligned to Babylon +Z; expected Blender Y to extend below -44 m")


if __name__ == "__main__":
    main()
