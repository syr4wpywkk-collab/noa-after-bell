#!/usr/bin/env python3
"""Re-import a generated GLB in a clean Blender scene and sanity-check it."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    parser.add_argument("--min-meshes", type=int, default=100)
    parser.add_argument("--min-materials", type=int, default=6)
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

    report = {
        "glb": str(glb),
        "bytes": glb.stat().st_size,
        "mesh_objects": mesh_count,
        "materials": len(materials),
    }
    print(json.dumps(report, indent=2))

    if mesh_count < args.min_meshes:
        raise SystemExit(f"Expected >= {args.min_meshes} mesh objects, got {mesh_count}")
    if len(materials) < args.min_materials:
        raise SystemExit(f"Expected >= {args.min_materials} materials, got {len(materials)}")


if __name__ == "__main__":
    main()
