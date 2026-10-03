#!/usr/bin/env python3
"""Generate NOA: AFTER BELL v0.6 school visuals.

v0.6 deliberately concentrates art density on the first floor:
six classrooms, toilets, student entrance, infirmary, career guidance,
staff/principal/office rooms, and supporting administration spaces.

Upper floors remain lightweight placeholders so gameplay architecture stays
intact while the first floor becomes the visual benchmark.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy


GENERATOR_VERSION = "0.6.0"
FLOOR_HEIGHT = 4.15
FLOOR_COUNT = 6
FIRST_FLOOR_LENGTH = 92.0
CORRIDOR_HALF = 3.2
ROOM_DEPTH = 7.2

ROOMS = [
    ("class_1_1", "classroom", "left", 4.0, 12.0, 10.7),
    ("class_1_2", "classroom", "left", 12.0, 20.0, 18.7),
    ("class_1_3", "classroom", "left", 20.0, 28.0, 26.7),
    ("boys_wc", "toilet", "left", 29.0, 37.0, 35.4),
    ("girls_wc", "toilet", "right", 29.0, 37.0, 35.4),
    ("class_1_4", "classroom", "left", 37.0, 45.0, 43.7),
    ("class_1_5", "classroom", "left", 45.0, 53.0, 51.7),
    ("class_1_6", "classroom", "left", 53.0, 61.0, 59.7),
    ("infirmary", "infirmary", "left", 63.0, 71.0, 69.5),
    ("career", "career", "left", 71.0, 79.0, 77.5),
    ("counseling", "counseling", "left", 79.0, 85.0, 83.8),
    ("meeting", "meeting", "left", 85.0, 92.0, 90.6),
    ("staff", "staff", "right", 63.0, 79.0, 76.8),
    ("principal", "principal", "right", 79.0, 85.0, 83.5),
    ("office", "office", "right", 85.0, 88.0, 87.0),
    ("print", "print", "right", 88.0, 90.0, 89.1),
    ("broadcast", "broadcast", "right", 90.0, 92.0, 91.1),
]


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="build/blender")
    return parser.parse_args(argv)


def game_to_blender_location(location: tuple[float, float, float]) -> tuple[float, float, float]:
    x, game_z, game_y = location
    return (x, -game_z, game_y)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name: str, rgba: tuple[float, float, float, float], roughness: float, metallic: float = 0.0, emission: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission > 0:
            emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            strength_input = bsdf.inputs.get("Emission Strength")
            if emission_input is not None:
                emission_input.default_value = rgba
            if strength_input is not None:
                strength_input.default_value = emission
    mat.diffuse_color = rgba
    return mat


def add_box(name: str, loc: tuple[float, float, float], dims: tuple[float, float, float], mat: bpy.types.Material, parent: bpy.types.Object, bevel: float = 0.01) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=game_to_blender_location(loc))
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("micro_bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        mod.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.parent = parent
    return obj


def add_cylinder(name: str, loc: tuple[float, float, float], radius: float, depth: float, mat: bpy.types.Material, parent: bpy.types.Object, rotation=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=game_to_blender_location(loc), rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def add_empty(name: str, parent: bpy.types.Object | None = None, loc=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.location = game_to_blender_location(loc)
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def add_light_marker(root: bpy.types.Object, name: str, x: float, z: float, y: float = 2.7) -> None:
    add_empty(name, root, (x, z, y))


def add_door_frame(root, name, side, z, mats, door_leaf=True):
    sign = -1 if side == "left" else 1
    x = sign * (CORRIDOR_HALF - 0.03)
    mats_trim, mats_door = mats["trim"], mats["door"]
    add_box(f"{name}_door_top", (x, z, 2.34), (0.14, 1.82, 0.12), mats_trim, root)
    add_box(f"{name}_door_jamb_a", (x, z - 0.86, 1.17), (0.14, 0.10, 2.34), mats_trim, root)
    add_box(f"{name}_door_jamb_b", (x, z + 0.86, 1.17), (0.14, 0.10, 2.34), mats_trim, root)
    if door_leaf:
        # Sliding leaf parked beside the opening, common in Japanese classrooms.
        add_box(f"{name}_door_leaf", (x - sign * 0.04, z - 1.35, 1.14), (0.09, 1.45, 2.20), mats_door, root, 0.008)


def add_facade_segment(root, name, side, z0, z1, kind, mats):
    if z1 <= z0:
        return
    sign = -1 if side == "left" else 1
    x = sign * CORRIDOR_HALF
    length = z1 - z0
    z = (z0 + z1) / 2
    if kind == "classroom":
        add_box(f"{name}_low", (x, z, 0.43), (0.18, length, 0.86), mats["wall"], root)
        add_box(f"{name}_glass", (x, z, 1.68), (0.055, max(0.02, length - 0.05), 1.52), mats["glass"], root, 0.004)
        add_box(f"{name}_top", (x, z, 2.78), (0.18, length, 0.68), mats["wall"], root)
        add_box(f"{name}_rail", (x - sign * 0.03, z, 0.92), (0.10, length, 0.07), mats["trim"], root)
    elif kind == "toilet":
        add_box(f"{name}_tile", (x, z, 1.12), (0.18, length, 2.24), mats["tile"], root)
        add_box(f"{name}_clerestory", (x, z, 2.55), (0.055, max(0.02, length - 0.05), 0.54), mats["glass"], root, 0.004)
    else:
        add_box(f"{name}_wall", (x, z, 1.55), (0.18, length, 3.10), mats["wall"], root)


def add_room_shell(root, room, mats):
    rid, kind, side, z0, z1, door_z = room
    sign = -1 if side == "left" else 1
    center_x = sign * (CORRIDOR_HALF + ROOM_DEPTH / 2)
    outer_x = sign * (CORRIDOR_HALF + ROOM_DEPTH)
    center_z = (z0 + z1) / 2
    depth = z1 - z0

    floor_mat = mats["tile_floor"] if kind == "toilet" else mats["floor"]
    add_box(f"{rid}_floor", (center_x, center_z, -0.06), (ROOM_DEPTH, depth, 0.12), floor_mat, root, 0.004)
    add_box(f"{rid}_ceiling", (center_x, center_z, 3.12), (ROOM_DEPTH, depth, 0.10), mats["ceiling"], root, 0.004)
    add_box(f"{rid}_outer", (outer_x, center_z, 1.55), (0.18, depth, 3.10), mats["wall"], root)
    add_box(f"{rid}_front", (center_x, z0, 1.55), (ROOM_DEPTH, 0.18, 3.10), mats["wall"], root)
    add_box(f"{rid}_back", (center_x, z1, 1.55), (ROOM_DEPTH, 0.18, 3.10), mats["wall"], root)

    gap = 0.90
    add_facade_segment(root, f"{rid}_facade_a", side, z0, max(z0, door_z - gap), kind, mats)
    add_facade_segment(root, f"{rid}_facade_b", side, min(z1, door_z + gap), z1, kind, mats)
    add_door_frame(root, rid, side, door_z, mats, door_leaf=True)

    # Room number/name plaque silhouette.
    plaque_x = sign * (CORRIDOR_HALF - 0.14)
    add_box(f"{rid}_plaque", (plaque_x, door_z - 1.12, 2.18), (0.05, 0.48, 0.30), mats["paper"], root, 0.006)


def add_desk(root, prefix, x, z, mats, rotation=False):
    add_box(f"{prefix}_top", (x, z, 0.72), (0.72, 0.50, 0.07), mats["desk"], root, 0.01)
    for dx in (-0.28, 0.28):
        for dz in (-0.18, 0.18):
            add_box(f"{prefix}_leg_{dx}_{dz}", (x + dx, z + dz, 0.36), (0.045, 0.045, 0.66), mats["metal"], root, 0.003)
    add_box(f"{prefix}_chair", (x + 0.62, z, 0.46), (0.45, 0.46, 0.08), mats["desk"], root, 0.006)
    add_box(f"{prefix}_chair_back", (x + 0.80, z, 0.75), (0.06, 0.46, 0.54), mats["desk"], root, 0.006)


def furnish_classroom(root, room, mats, variant):
    rid, _, side, z0, z1, _ = room
    sign = -1 if side == "left" else 1
    outer_x = sign * (CORRIDOR_HALF + ROOM_DEPTH)
    center_z = (z0 + z1) / 2

    # Blackboard on outer wall and teacher desk.
    board_x = outer_x - sign * 0.12
    add_box(f"{rid}_blackboard", (board_x, center_z, 1.72), (0.08, 4.2, 1.25), mats["blackboard"], root, 0.004)
    add_box(f"{rid}_chalk_rail", (board_x - sign * 0.06, center_z, 1.05), (0.16, 4.25, 0.06), mats["trim"], root, 0.004)
    teacher_x = sign * (CORRIDOR_HALF + 1.15)
    add_box(f"{rid}_teacher_desk", (teacher_x, center_z - 2.4, 0.43), (1.20, 0.72, 0.82), mats["desk"], root, 0.012)

    # 20 student desks. Tiny offsets make classes feel used rather than cloned.
    xs = [sign * (CORRIDOR_HALF + v) for v in (2.0, 3.15, 4.30, 5.45)]
    zs = [z0 + 1.25, z0 + 2.55, z0 + 3.85, z0 + 5.15, z0 + 6.45]
    idx = 0
    for row, zz in enumerate(zs):
        for col, xx in enumerate(xs):
            nudge = 0.05 * math.sin((variant + 1) * (row + 2) * (col + 1))
            add_desk(root, f"{rid}_desk_{idx:02d}", xx, zz + nudge, mats)
            idx += 1

    # Storage and colorful noticeboard.
    add_box(f"{rid}_locker", (outer_x - sign * 0.42, z1 - 0.75, 0.95), (0.70, 1.20, 1.90), mats["wood"], root, 0.012)
    notice_z = z0 + 0.85
    add_box(f"{rid}_noticeboard", (outer_x - sign * 0.11, notice_z, 1.75), (0.08, 1.10, 1.20), mats["notice"], root, 0.006)
    for i in range(3):
        add_box(f"{rid}_notice_{i}", (outer_x - sign * 0.16, notice_z - 0.32 + i * 0.32, 1.72), (0.025, 0.22, 0.30), mats["paper_accent" if (i + variant) % 2 else "paper"], root, 0.002)

    # Three fluorescent fixtures + markers.
    for i, zz in enumerate((z0 + 1.6, center_z, z1 - 1.6)):
        add_box(f"{rid}_fluoro_{i}", (sign * (CORRIDOR_HALF + ROOM_DEPTH / 2), zz, 3.02), (1.65, 0.30, 0.08), mats["light_body"], root, 0.008)
        add_box(f"{rid}_fluoro_panel_{i}", (sign * (CORRIDOR_HALF + ROOM_DEPTH / 2), zz, 2.965), (1.50, 0.23, 0.025), mats["light_panel"], root, 0.004)
        add_light_marker(root, f"LIGHT_F1_CLASS_{rid}_{i:02d}", sign * (CORRIDOR_HALF + ROOM_DEPTH / 2), zz, 2.68)


def furnish_toilet(root, room, mats):
    rid, _, side, z0, z1, _ = room
    sign = -1 if side == "left" else 1
    center_x = sign * (CORRIDOR_HALF + ROOM_DEPTH / 2)
    outer_x = sign * (CORRIDOR_HALF + ROOM_DEPTH)
    # Sinks / mirrors along outer wall.
    for i, zz in enumerate((z0 + 1.2, z0 + 2.5, z0 + 3.8)):
        add_box(f"{rid}_sink_{i}", (outer_x - sign * 0.62, zz, 0.82), (0.75, 0.70, 0.16), mats["ceramic"], root, 0.04)
        add_box(f"{rid}_mirror_{i}", (outer_x - sign * 0.12, zz, 1.65), (0.06, 0.62, 0.92), mats["mirror"], root, 0.004)
    # Cubicles toward the back.
    for i in range(3):
        zz = z1 - 1.0 - i * 1.45
        add_box(f"{rid}_stall_{i}", (center_x + sign * 1.8, zz, 1.15), (0.10, 1.30, 2.30), mats["tile"], root, 0.006)
        add_box(f"{rid}_toilet_{i}", (center_x + sign * 2.55, zz, 0.40), (0.48, 0.70, 0.46), mats["ceramic"], root, 0.06)
    if rid == "boys_wc":
        for i, zz in enumerate((z0 + 4.8, z0 + 5.9, z0 + 7.0)):
            add_box(f"{rid}_urinal_{i}", (outer_x - sign * 0.36, zz, 0.62), (0.42, 0.50, 0.72), mats["ceramic"], root, 0.08)
    add_light_marker(root, f"LIGHT_F1_TOILET_{rid}", center_x, (z0 + z1) / 2, 2.65)


def furnish_admin(root, room, mats):
    rid, kind, side, z0, z1, _ = room
    sign = -1 if side == "left" else 1
    center_x = sign * (CORRIDOR_HALF + ROOM_DEPTH / 2)
    outer_x = sign * (CORRIDOR_HALF + ROOM_DEPTH)
    center_z = (z0 + z1) / 2

    if kind == "staff":
        idx = 0
        for xoff in (1.5, 2.8, 4.1, 5.4):
            for zz in (z0 + 2.0, z0 + 4.6, z0 + 7.2, z0 + 9.8, z0 + 12.4):
                add_desk(root, f"staff_desk_{idx:02d}", sign * (CORRIDOR_HALF + xoff), zz, mats)
                idx += 1
        for i in range(5):
            add_box(f"staff_file_{i}", (outer_x - sign * 0.45, z0 + 1.0 + i * 2.7, 1.05), (0.72, 1.08, 2.10), mats["metal"], root, 0.01)
        add_box("staff_board", (outer_x - sign * 0.11, center_z, 1.72), (0.08, 4.4, 1.25), mats["board_white"], root, 0.004)
    elif kind == "infirmary":
        for i, zz in enumerate((z0 + 1.55, z0 + 4.0, z0 + 6.45)):
            add_box(f"infirmary_bed_{i}", (center_x + sign * 1.2, zz, 0.52), (2.15, 0.90, 0.36), mats["bed"], root, 0.06)
            add_box(f"infirmary_pillow_{i}", (center_x + sign * 1.65, zz, 0.75), (0.48, 0.62, 0.18), mats["fabric"], root, 0.06)
            add_box(f"infirmary_curtain_{i}", (center_x - sign * 0.05, zz + 0.62, 1.55), (0.05, 0.06, 2.4), mats["curtain"], root, 0.003)
        add_box("infirmary_desk", (outer_x - sign * 1.2, z0 + 1.2, 0.43), (1.3, 0.72, 0.82), mats["desk"], root)
    elif kind == "career":
        for i in range(5):
            add_box(f"career_shelf_{i}", (outer_x - sign * 0.45, z0 + 0.8 + i * 1.35, 1.05), (0.72, 1.10, 2.10), mats["wood"], root, 0.012)
        add_box("career_table", (center_x, center_z, 0.42), (1.8, 2.2, 0.78), mats["desk"], root, 0.012)
    elif kind == "principal":
        add_box("principal_desk", (outer_x - sign * 1.3, center_z, 0.46), (1.7, 0.85, 0.86), mats["darkwood"], root, 0.012)
        add_box("principal_sofa_a", (center_x - sign * 0.8, z0 + 1.7, 0.46), (1.0, 2.2, 0.82), mats["sofa"], root, 0.08)
        add_box("principal_sofa_b", (center_x - sign * 0.8, z1 - 1.7, 0.46), (1.0, 2.2, 0.82), mats["sofa"], root, 0.08)
        add_box("principal_table", (center_x + sign * 0.55, center_z, 0.38), (1.2, 1.6, 0.68), mats["darkwood"], root, 0.012)
    elif kind == "meeting":
        add_box("meeting_table", (center_x, center_z, 0.42), (2.1, max(2.2, z1 - z0 - 2.0), 0.78), mats["desk"], root, 0.015)
        for zz in (z0 + 1.0, center_z, z1 - 1.0):
            add_box(f"meeting_chair_{zz}_a", (center_x - 1.45, zz, 0.48), (0.52, 0.52, 0.86), mats["chair"], root, 0.04)
            add_box(f"meeting_chair_{zz}_b", (center_x + 1.45, zz, 0.48), (0.52, 0.52, 0.86), mats["chair"], root, 0.04)
    elif kind == "counseling":
        add_box("counseling_sofa", (center_x + sign * 1.1, center_z, 0.45), (1.0, 2.4, 0.82), mats["sofa"], root, 0.08)
        add_box("counseling_table", (center_x - sign * 0.6, center_z, 0.36), (1.1, 1.2, 0.64), mats["desk"], root)
    elif kind == "office":
        add_box("office_counter", (center_x, center_z, 0.58), (1.0, 2.2, 1.05), mats["desk"], root, 0.012)
        add_box("office_cabinet", (outer_x - sign * 0.45, center_z, 1.05), (0.72, 1.4, 2.10), mats["metal"], root, 0.01)
    elif kind == "print":
        add_box("print_copier", (center_x, center_z, 0.72), (1.15, 1.10, 1.32), mats["copier"], root, 0.05)
    elif kind == "broadcast":
        add_box("broadcast_console", (center_x, center_z, 0.56), (1.45, 1.35, 1.02), mats["metal"], root, 0.012)
        add_box("broadcast_window", (outer_x - sign * 0.12, center_z, 1.72), (0.06, 1.35, 1.0), mats["glass"], root, 0.004)

    add_light_marker(root, f"LIGHT_F1_ADMIN_{rid}", center_x, center_z, 2.66)


def add_student_entrance(root, mats):
    # Right-side shoe-changing vestibule opposite 1-5/1-6.
    center_x = 6.0
    center_z = 55.6
    add_box("entrance_floor", (center_x, center_z, -0.06), (5.6, 6.8, 0.12), mats["entry_floor"], root, 0.004)
    add_box("entrance_ceiling", (center_x, center_z, 3.12), (5.6, 6.8, 0.10), mats["ceiling"], root, 0.004)
    add_box("entrance_outer_glass", (8.8, center_z, 1.55), (0.08, 6.8, 3.0), mats["glass"], root, 0.004)
    # Shoe lockers.
    for row, zz in enumerate((53.2, 54.6, 56.6, 58.0)):
        for col in range(6):
            x = 4.3 + col * 0.62
            add_box(f"shoe_{row}_{col}", (x, zz, 0.72), (0.54, 0.52, 1.35), mats["shoe"], root, 0.008)
    # Threshold/step and exit signage.
    add_box("entrance_step", (8.35, center_z, 0.06), (0.7, 6.0, 0.12), mats["concrete"], root, 0.006)
    add_box("entrance_exit_sign", (8.55, center_z, 2.72), (0.10, 1.25, 0.30), mats["emergency"], root, 0.004)
    add_light_marker(root, "LIGHT_F1_ENTRANCE_00", center_x, center_z, 2.65)
    add_light_marker(root, "LIGHT_F1_EMERGENCY_ENTRANCE", 8.0, center_z, 2.45)


def add_corridor_details(root, mats):
    # Baseboards.
    add_box("corridor_base_left", (-3.08, FIRST_FLOOR_LENGTH / 2, 0.08), (0.06, FIRST_FLOOR_LENGTH, 0.16), mats["trim"], root, 0.004)
    add_box("corridor_base_right", (3.08, FIRST_FLOOR_LENGTH / 2, 0.08), (0.06, FIRST_FLOOR_LENGTH, 0.16), mats["trim"], root, 0.004)
    # Bulletin boards, extinguisher cabinet, clock blocks.
    for i, zz in enumerate((8.0, 18.0, 40.0, 48.0, 66.0, 82.0)):
        add_box(f"bulletin_{i}", (3.02, zz, 1.62), (0.07, 2.0, 1.05), mats["notice"], root, 0.004)
        for j in range(4):
            add_box(f"bulletin_{i}_paper_{j}", (2.97, zz - 0.70 + j * 0.45, 1.60), (0.02, 0.30, 0.48), mats["paper_accent" if (i + j) % 2 else "paper"], root, 0.002)
    add_box("fire_extinguisher_box", (2.85, 25.0, 0.72), (0.44, 0.55, 1.20), mats["red"], root, 0.012)
    add_box("distribution_panel", (2.92, 74.5, 1.52), (0.20, 1.25, 1.42), mats["metal"], root, 0.008)

    # Corridor fixtures and light markers.
    for i, zz in enumerate((5.5, 13.5, 21.5, 29.5, 37.5, 45.5, 53.5, 61.5, 69.5, 77.5, 85.5)):
        add_box(f"corridor_light_body_{i}", (0.0, zz, 3.02), (1.82, 0.32, 0.10), mats["light_body"], root, 0.012)
        add_box(f"corridor_light_panel_{i}", (0.0, zz, 2.96), (1.62, 0.24, 0.025), mats["light_panel"], root, 0.004)
        add_light_marker(root, f"LIGHT_F1_CORRIDOR_{i:02d}", 0.0, zz, 2.70)


def build_first_floor(root, mats):
    add_box("F1_corridor_floor", (0.0, FIRST_FLOOR_LENGTH / 2, -0.06), (CORRIDOR_HALF * 2, FIRST_FLOOR_LENGTH, 0.12), mats["floor"], root, 0.004)
    add_box("F1_corridor_ceiling", (0.0, FIRST_FLOOR_LENGTH / 2, 3.12), (CORRIDOR_HALF * 2, FIRST_FLOOR_LENGTH, 0.10), mats["ceiling"], root, 0.004)

    # Wall gaps not covered by rooms.
    def room_at(side, z):
        return next((r for r in ROOMS if r[2] == side and r[3] <= z <= r[4]), None)

    for side in ("left", "right"):
        sign = -1 if side == "left" else 1
        x = sign * CORRIDOR_HALF
        cursor = 0.0
        intervals = sorted([(r[3], r[4]) for r in ROOMS if r[2] == side])
        for idx, (z0, z1) in enumerate(intervals):
            if z0 > cursor:
                add_box(f"F1_{side}_gapwall_{idx}", (x, (cursor + z0) / 2, 1.55), (0.18, z0 - cursor, 3.10), mats["wall"], root)
            cursor = max(cursor, z1)
        if cursor < FIRST_FLOOR_LENGTH:
            add_box(f"F1_{side}_gapwall_end", (x, (cursor + FIRST_FLOOR_LENGTH) / 2, 1.55), (0.18, FIRST_FLOOR_LENGTH - cursor, 3.10), mats["wall"], root)

    for index, room in enumerate(ROOMS):
        add_room_shell(root, room, mats)
        if room[1] == "classroom":
            furnish_classroom(root, room, mats, index)
        elif room[1] == "toilet":
            furnish_toilet(root, room, mats)
        else:
            furnish_admin(root, room, mats)

    add_student_entrance(root, mats)
    add_corridor_details(root, mats)


def build_upper_floor(root, floor_id, mats):
    z0 = (floor_id - 1) * FLOOR_HEIGHT
    # Local mesh Z is floor height because roots remain at origin for direct Babylon alignment.
    add_box(f"F{floor_id}_floor", (0.0, 20.0, z0 - 0.06), (6.2, 40.0, 0.12), mats["floor"], root, 0.004)
    add_box(f"F{floor_id}_ceiling", (0.0, 20.0, z0 + 3.12), (6.2, 40.0, 0.10), mats["ceiling"], root, 0.004)
    add_box(f"F{floor_id}_left", (-3.1, 20.0, z0 + 1.55), (0.18, 40.0, 3.10), mats["wall"], root)
    add_box(f"F{floor_id}_right", (3.1, 20.0, z0 + 1.55), (0.18, 40.0, 3.10), mats["wall"], root)
    for i, zz in enumerate((7.0, 20.0, 33.0)):
        add_box(f"F{floor_id}_light_{i}", (0.0, zz, z0 + 3.0), (1.7, 0.30, 0.08), mats["light_panel"], root, 0.008)


def add_stair_visuals(root, floor_id, mats):
    if floor_id >= FLOOR_COUNT:
        return
    floor_y = (floor_id - 1) * FLOOR_HEIGHT
    for side_name, lower_z, upper_z, lane_x in (
        ("north", -0.35, -5.15, -0.92),
        ("south", 40.35, 45.15, 0.92),
    ):
        if floor_id == 1 and side_name == "south":
            continue
        run = abs(upper_z - lower_z)
        direction = 1.0 if upper_z > lower_z else -1.0
        for i in range(14):
            progress = (i + 1) / 14
            height = FLOOR_HEIGHT * progress
            zz = lower_z + direction * run * ((i + 0.5) / 14)
            add_box(f"F{floor_id}_{side_name}_step_{i}", (lane_x, zz, floor_y + height / 2), (1.48, run / 14 + 0.03, height), mats["stair"], root, 0.006)
        rail_x = lane_x + (-0.84 if lane_x < 0 else 0.84)
        for i in range(5):
            p = i / 4
            zz = lower_z + direction * run * p
            yy = floor_y + FLOOR_HEIGHT * p + 0.55
            add_cylinder(f"F{floor_id}_{side_name}_railpost_{i}", (rail_x, zz, yy), 0.035, 1.05, mats["metal"], root)


def merge_floor_meshes(root):
    groups = {}
    for child in list(root.children):
        if child.type != "MESH":
            continue
        mat_name = child.data.materials[0].name if child.data.materials else "__none__"
        groups.setdefault(mat_name, []).append(child)
    for mat_name, objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        active.name = f"{root.name}_{mat_name}"
        active.parent = root


def build_school():
    mats = {
        "wall": material("M_wall_ivory", (0.56, 0.56, 0.50, 1), 0.94),
        "floor": material("M_floor_green_vinyl", (0.12, 0.20, 0.18, 1), 0.46),
        "tile_floor": material("M_floor_toilet_tile", (0.32, 0.38, 0.38, 1), 0.64),
        "entry_floor": material("M_floor_entry_terrazzo", (0.33, 0.32, 0.29, 1), 0.72),
        "ceiling": material("M_ceiling", (0.63, 0.63, 0.58, 1), 0.98),
        "door": material("M_door_bluegreen", (0.08, 0.20, 0.20, 1), 0.74),
        "trim": material("M_aluminium_trim", (0.28, 0.30, 0.29, 1), 0.45, 0.35),
        "metal": material("M_metal", (0.22, 0.24, 0.24, 1), 0.50, 0.24),
        "glass": material("M_glass", (0.08, 0.16, 0.17, 0.42), 0.12),
        "desk": material("M_desk_wood", (0.43, 0.31, 0.18, 1), 0.66),
        "wood": material("M_wood_light", (0.34, 0.24, 0.14, 1), 0.72),
        "darkwood": material("M_wood_dark", (0.16, 0.09, 0.05, 1), 0.68),
        "blackboard": material("M_blackboard", (0.025, 0.12, 0.075, 1), 0.93),
        "board_white": material("M_whiteboard", (0.72, 0.74, 0.70, 1), 0.60),
        "notice": material("M_notice_cork", (0.43, 0.28, 0.15, 1), 0.88),
        "paper": material("M_paper", (0.78, 0.76, 0.67, 1), 0.90),
        "paper_accent": material("M_paper_accent", (0.35, 0.52, 0.58, 1), 0.88),
        "tile": material("M_toilet_wall_tile", (0.55, 0.60, 0.58, 1), 0.62),
        "ceramic": material("M_ceramic", (0.76, 0.78, 0.74, 1), 0.30),
        "mirror": material("M_mirror", (0.32, 0.42, 0.44, 1), 0.08, 0.55),
        "bed": material("M_bed", (0.65, 0.70, 0.66, 1), 0.82),
        "fabric": material("M_fabric", (0.80, 0.80, 0.72, 1), 0.96),
        "curtain": material("M_curtain", (0.70, 0.76, 0.72, 0.78), 0.90),
        "sofa": material("M_sofa", (0.20, 0.25, 0.24, 1), 0.92),
        "chair": material("M_chair", (0.24, 0.22, 0.18, 1), 0.86),
        "copier": material("M_copier", (0.48, 0.49, 0.46, 1), 0.52),
        "shoe": material("M_shoe_locker", (0.47, 0.47, 0.42, 1), 0.76),
        "concrete": material("M_concrete", (0.36, 0.36, 0.33, 1), 0.94),
        "red": material("M_fire_red", (0.54, 0.035, 0.025, 1), 0.64),
        "light_body": material("M_light_body", (0.36, 0.38, 0.36, 1), 0.45, 0.24),
        "light_panel": material("M_light_panel", (0.75, 0.88, 0.86, 1), 0.32, emission=2.2),
        "emergency": material("M_emergency_green", (0.05, 0.72, 0.30, 1), 0.36, emission=2.6),
        "stair": material("M_stair", (0.17, 0.19, 0.18, 1), 0.90),
    }
    if hasattr(mats["glass"], "surface_render_method"):
        mats["glass"].surface_render_method = "DITHERED"
    elif hasattr(mats["glass"], "blend_method"):
        mats["glass"].blend_method = "BLEND"

    for floor_id in range(1, FLOOR_COUNT + 1):
        root = add_empty(f"FLOOR_{floor_id:02d}")
        if floor_id == 1:
            build_first_floor(root, mats)
        else:
            build_upper_floor(root, floor_id, mats)
        add_stair_visuals(root, floor_id, mats)
        merge_floor_meshes(root)

    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)

    bpy.context.scene["noa_generator"] = "tools/blender/build_school.py"
    bpy.context.scene["noa_generator_version"] = GENERATOR_VERSION
    bpy.context.scene["noa_floor_count"] = FLOOR_COUNT
    return {
        "objects": len(bpy.data.objects),
        "meshes": sum(1 for obj in bpy.data.objects if obj.type == "MESH"),
        "materials": len(bpy.data.materials),
        "light_markers": sum(1 for obj in bpy.data.objects if obj.name.startswith("LIGHT_F1_")),
    }


def export(output_dir: Path, stats):
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
        "first_floor_length_m": FIRST_FLOOR_LENGTH,
        "first_floor_rooms": len(ROOMS),
        "light_markers": stats["light_markers"],
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


def main():
    args = parse_args()
    reset_scene()
    stats = build_school()
    export(Path(args.output_dir), stats)


if __name__ == "__main__":
    main()
