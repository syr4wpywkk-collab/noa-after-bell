#!/usr/bin/env python3
"""Procedurally build a polished NOA: AFTER BELL school shell in Blender.

Run:
    blender --background --factory-startup \
      --python tools/blender/build_school.py -- \
      --output-dir build/blender

The script intentionally uses only Blender built-ins so CI does not depend on
third-party Python packages or external textures.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy


GENERATOR_VERSION = "0.2.0"
FLOOR_HEIGHT = 4.15
FLOOR_COUNT = 6
CORRIDOR_LENGTH = 40.0
CORRIDOR_WIDTH = 6.2


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="build/blender")
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_material(
    name: str,
    rgba: tuple[float, float, float, float],
    *,
    roughness: float,
    metallic: float = 0.0,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        return mat

    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic

    if emission_strength > 0:
        emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        strength_input = bsdf.inputs.get("Emission Strength")
        if emission_input is not None:
            emission_input.default_value = rgba
        if strength_input is not None:
            strength_input.default_value = emission_strength

    return mat


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float = 0.018,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    if material:
        obj.data.materials.append(material)

    if bevel > 0:
        modifier = obj.modifiers.new(name="micro_bevel", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    if parent is not None:
        obj.parent = parent

    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    if parent is not None:
        obj.parent = parent
    return obj


def add_empty(name: str, z: float) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.location = (0.0, 0.0, z)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def merge_floor_meshes(root: bpy.types.Object) -> None:
    """Merge static meshes by material to keep mobile draw calls low."""
    groups: dict[str, list[bpy.types.Object]] = {}
    for child in list(root.children):
        if child.type != "MESH":
            continue
        material_name = child.data.materials[0].name if child.data.materials else "__none__"
        groups.setdefault(material_name, []).append(child)

    for material_name, objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        active.name = f"{root.name}_{material_name}"
        active.parent = root


def add_door_frame(
    floor_root: bpy.types.Object,
    floor_z: float,
    corridor_y: float,
    trim: bpy.types.Material,
    door: bpy.types.Material,
) -> None:
    x = -CORRIDOR_WIDTH / 2 + 0.05
    add_box(
        f"{floor_root.name}_door_{corridor_y:.1f}",
        (x, corridor_y, floor_z + 1.12),
        (0.10, 1.34, 2.24),
        door,
        bevel=0.012,
        parent=floor_root,
    )
    add_box(
        f"{floor_root.name}_door_frame_top_{corridor_y:.1f}",
        (x + 0.02, corridor_y, floor_z + 2.32),
        (0.14, 1.64, 0.12),
        trim,
        parent=floor_root,
    )
    add_box(
        f"{floor_root.name}_door_frame_a_{corridor_y:.1f}",
        (x + 0.02, corridor_y - 0.74, floor_z + 1.15),
        (0.14, 0.10, 2.34),
        trim,
        parent=floor_root,
    )
    add_box(
        f"{floor_root.name}_door_frame_b_{corridor_y:.1f}",
        (x + 0.02, corridor_y + 0.74, floor_z + 1.15),
        (0.14, 0.10, 2.34),
        trim,
        parent=floor_root,
    )


def add_window_group(
    floor_root: bpy.types.Object,
    floor_z: float,
    corridor_y: float,
    trim: bpy.types.Material,
    glass: bpy.types.Material,
) -> None:
    x = CORRIDOR_WIDTH / 2 - 0.05
    add_box(
        f"{floor_root.name}_window_{corridor_y:.1f}",
        (x, corridor_y, floor_z + 1.72),
        (0.055, 2.5, 1.20),
        glass,
        bevel=0.006,
        parent=floor_root,
    )
    add_box(
        f"{floor_root.name}_window_v_{corridor_y:.1f}",
        (x - 0.025, corridor_y, floor_z + 1.72),
        (0.085, 0.055, 1.26),
        trim,
        bevel=0.008,
        parent=floor_root,
    )
    add_box(
        f"{floor_root.name}_window_h_{corridor_y:.1f}",
        (x - 0.025, corridor_y, floor_z + 1.72),
        (0.085, 2.52, 0.055),
        trim,
        bevel=0.008,
        parent=floor_root,
    )
    add_box(
        f"{floor_root.name}_window_sill_{corridor_y:.1f}",
        (x - 0.09, corridor_y, floor_z + 1.08),
        (0.22, 2.60, 0.08),
        trim,
        bevel=0.012,
        parent=floor_root,
    )


def add_fluorescent_fixture(
    floor_root: bpy.types.Object,
    floor_z: float,
    corridor_y: float,
    metal: bpy.types.Material,
    light_panel: bpy.types.Material,
) -> None:
    add_box(
        f"{floor_root.name}_fluoro_body_{corridor_y:.1f}",
        (0.0, corridor_y, floor_z + 3.02),
        (1.82, 0.32, 0.10),
        metal,
        bevel=0.02,
        parent=floor_root,
    )
    add_box(
        f"{floor_root.name}_fluoro_panel_{corridor_y:.1f}",
        (0.0, corridor_y, floor_z + 2.955),
        (1.62, 0.24, 0.026),
        light_panel,
        bevel=0.008,
        parent=floor_root,
    )


def add_lockers(
    floor_root: bpy.types.Object,
    floor_z: float,
    start_y: float,
    count: int,
    metal: bpy.types.Material,
    trim: bpy.types.Material,
) -> None:
    for index in range(count):
        y = start_y + index * 0.76
        add_box(
            f"{floor_root.name}_locker_{index}",
            (2.72, y, floor_z + 0.92),
            (0.48, 0.72, 1.84),
            metal,
            bevel=0.025,
            parent=floor_root,
        )
        add_box(
            f"{floor_root.name}_locker_handle_{index}",
            (2.465, y + 0.20, floor_z + 1.02),
            (0.018, 0.11, 0.22),
            trim,
            bevel=0.004,
            parent=floor_root,
        )


def add_stair_visuals(
    floor_root: bpy.types.Object,
    floor_index: int,
    floor_z: float,
    stair_mat: bpy.types.Material,
    rail_mat: bpy.types.Material,
) -> None:
    if floor_index >= FLOOR_COUNT:
        return

    # Compact external stair visuals. Runtime navigation remains engine-owned;
    # these meshes are strictly the visual authoring target for future GLB use.
    for side_name, base_y, direction in (
        ("north", -0.6, -1.0),
        ("south", CORRIDOR_LENGTH + 0.6, 1.0),
    ):
        steps = 16
        run = 5.2
        width = 1.55
        lane_x = -0.95 if side_name == "north" else 0.95

        for i in range(steps):
            progress = (i + 1) / steps
            step_h = FLOOR_HEIGHT * progress
            y = base_y + direction * run * ((i + 0.5) / steps)
            add_box(
                f"{floor_root.name}_{side_name}_step_{i:02d}",
                (lane_x, y, floor_z + step_h / 2),
                (width, run / steps + 0.025, step_h),
                stair_mat,
                bevel=0.012,
                parent=floor_root,
            )

        # Rail posts and handrail on the outside edge.
        rail_x = lane_x + (-0.84 if lane_x < 0 else 0.84)
        for i in range(5):
            p = i / 4
            y = base_y + direction * run * p
            z = floor_z + FLOOR_HEIGHT * p + 0.95
            add_cylinder(
                f"{floor_root.name}_{side_name}_rail_post_{i}",
                (rail_x, y, z - 0.42),
                0.035,
                0.84,
                rail_mat,
                parent=floor_root,
            )
        handrail = add_cylinder(
            f"{floor_root.name}_{side_name}_handrail",
            (rail_x, base_y + direction * run / 2, floor_z + FLOOR_HEIGHT / 2 + 0.96),
            0.045,
            math.hypot(run, FLOOR_HEIGHT),
            rail_mat,
            rotation=(math.atan2(run, FLOOR_HEIGHT), 0.0, 0.0),
            parent=floor_root,
        )
        handrail["noa_role"] = "visual_handrail"


def build_school() -> dict[str, int]:
    wall = make_material("M_wall_warm_gray", (0.47, 0.49, 0.46, 1.0), roughness=0.94)
    floor_mat = make_material("M_floor_green_vinyl", (0.105, 0.17, 0.16, 1.0), roughness=0.48)
    ceiling = make_material("M_ceiling", (0.58, 0.59, 0.55, 1.0), roughness=0.98)
    door = make_material("M_door_blue_gray", (0.07, 0.13, 0.15, 1.0), roughness=0.76)
    metal = make_material("M_metal", (0.19, 0.21, 0.22, 1.0), roughness=0.48, metallic=0.32)
    trim = make_material("M_trim", (0.15, 0.18, 0.18, 1.0), roughness=0.72)
    glass = make_material("M_night_glass", (0.02, 0.055, 0.07, 0.72), roughness=0.12)
    glass.diffuse_color = (0.02, 0.055, 0.07, 0.72)
    if hasattr(glass, "surface_render_method"):
        glass.surface_render_method = "DITHERED"
    elif hasattr(glass, "blend_method"):
        glass.blend_method = "BLEND"
    light_panel = make_material(
        "M_fluorescent_panel",
        (0.73, 0.86, 0.88, 1.0),
        roughness=0.34,
        emission_strength=1.7,
    )
    stair_mat = make_material("M_stair", (0.16, 0.18, 0.17, 1.0), roughness=0.88)
    rail_mat = make_material("M_rail", (0.10, 0.11, 0.11, 1.0), roughness=0.44, metallic=0.50)

    for floor_index in range(1, FLOOR_COUNT + 1):
        floor_z = (floor_index - 1) * FLOOR_HEIGHT
        # Meshes below are authored in absolute metric coordinates so the GLB
        # can later align directly with Babylon world dimensions. The empty is
        # therefore an organizational parent only and stays at the origin.
        root = add_empty(f"FLOOR_{floor_index:02d}", 0.0)

        # Structural shell
        add_box(
            f"F{floor_index}_floor",
            (0.0, CORRIDOR_LENGTH / 2, floor_z - 0.06),
            (CORRIDOR_WIDTH, CORRIDOR_LENGTH, 0.12),
            floor_mat,
            bevel=0.012,
            parent=root,
        )
        add_box(
            f"F{floor_index}_ceiling",
            (0.0, CORRIDOR_LENGTH / 2, floor_z + 3.12),
            (CORRIDOR_WIDTH, CORRIDOR_LENGTH, 0.10),
            ceiling,
            bevel=0.008,
            parent=root,
        )
        door_centers = (7.0, 13.5, 20.0, 26.5, 33.0)
        door_half = 0.76
        cursor = 0.0
        for wall_index, door_y in enumerate(door_centers):
            start = door_y - door_half
            if start > cursor:
                add_box(
                    f"F{floor_index}_left_wall_{wall_index}",
                    (-CORRIDOR_WIDTH / 2, (start + cursor) / 2, floor_z + 1.55),
                    (0.18, start - cursor, 3.20),
                    wall,
                    bevel=0.014,
                    parent=root,
                )
            cursor = door_y + door_half
        if cursor < CORRIDOR_LENGTH:
            add_box(
                f"F{floor_index}_left_wall_end",
                (-CORRIDOR_WIDTH / 2, (CORRIDOR_LENGTH + cursor) / 2, floor_z + 1.55),
                (0.18, CORRIDOR_LENGTH - cursor, 3.20),
                wall,
                bevel=0.014,
                parent=root,
            )
        add_box(
            f"F{floor_index}_right_wall",
            (CORRIDOR_WIDTH / 2, CORRIDOR_LENGTH / 2, floor_z + 1.55),
            (0.18, CORRIDOR_LENGTH, 3.20),
            wall,
            bevel=0.014,
            parent=root,
        )

        # Architectural detail
        for y in (7.0, 13.5, 20.0, 26.5, 33.0):
            add_door_frame(root, floor_z, y, trim, door)
        for y in (5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0):
            add_window_group(root, floor_z, y, trim, glass)
        for y in (7.0, 20.0, 33.0):
            add_fluorescent_fixture(root, floor_z, y, metal, light_panel)

        # Baseboards make wall/floor junctions read much better under horror lighting.
        add_box(
            f"F{floor_index}_baseboard_left",
            (-2.99, CORRIDOR_LENGTH / 2, floor_z + 0.08),
            (0.055, CORRIDOR_LENGTH, 0.16),
            trim,
            bevel=0.006,
            parent=root,
        )
        add_box(
            f"F{floor_index}_baseboard_right",
            (2.99, CORRIDOR_LENGTH / 2, floor_z + 0.08),
            (0.055, CORRIDOR_LENGTH, 0.16),
            trim,
            bevel=0.006,
            parent=root,
        )

        # Different clutter silhouettes per floor for visual navigation.
        if floor_index in (1, 2):
            add_lockers(root, floor_z, 27.8 if floor_index == 1 else 8.0, 5, metal, trim)

        add_stair_visuals(root, floor_index, floor_z, stair_mat, rail_mat)
        merge_floor_meshes(root)

    bpy.context.scene["noa_generator"] = "tools/blender/build_school.py"
    bpy.context.scene["noa_generator_version"] = GENERATOR_VERSION
    bpy.context.scene["noa_floor_count"] = FLOOR_COUNT

    return {
        "objects": len(bpy.data.objects),
        "meshes": len(bpy.data.meshes),
        "materials": len(bpy.data.materials),
    }


def export(output_dir: Path, stats: dict[str, int]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    blend_path = output_dir / "school_shell.blend"
    glb_path = output_dir / "school_shell.glb"
    manifest_path = output_dir / "school_shell.manifest.json"

    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path.resolve()))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path.resolve()),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )

    manifest = {
        "generator_version": GENERATOR_VERSION,
        "blender_version": bpy.app.version_string,
        "floor_count": FLOOR_COUNT,
        "corridor_length_m": CORRIDOR_LENGTH,
        "corridor_width_m": CORRIDOR_WIDTH,
        "object_count": stats["objects"],
        "mesh_count": stats["meshes"],
        "material_count": stats["materials"],
        "glb_bytes": glb_path.stat().st_size,
        "blend_bytes": blend_path.stat().st_size,
        "glb": glb_path.name,
        "blend": blend_path.name,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


def main() -> None:
    args = parse_args()
    reset_scene()
    stats = build_school()
    export(Path(args.output_dir), stats)


if __name__ == "__main__":
    main()
