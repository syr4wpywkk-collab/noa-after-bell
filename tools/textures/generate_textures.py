#!/usr/bin/env python3
"""Deterministic tileable 2K/1K textures for NOA: AFTER BELL.

These PBR materials are art-directed from classroom/corridor concept imagery,
not an automatic reconstruction of the images. Packed ORM uses R=occlusion,
G=roughness, B=metallic. Requires numpy and Pillow.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image

SURFACES = ("plaster", "vinyl", "wood", "chalk", "ceiling", "metal")

def octave(rng, size, cells):
    """Periodic smooth noise; wrapped halo removes most edge discontinuities."""
    grid = rng.integers(0, 256, (cells, cells), dtype=np.uint8)
    halo = np.pad(grid, 2, mode="wrap")
    pitch = size / cells
    expanded = Image.fromarray(halo).resize(
        (round((cells + 4) * pitch), round((cells + 4) * pitch)),
        Image.Resampling.BICUBIC,
    )
    ox = round(2 * pitch)
    return np.asarray(expanded.crop((ox, ox, ox + size, ox + size)), dtype=np.float32) / 127.5 - 1

def make_fields(seed, size):
    rng = np.random.default_rng(seed)
    layers = [(8, .54), (32, .28), (128, .13), (512, .05)]
    field = sum(octave(rng, size, cells) * weight for cells, weight in layers)
    fine = (rng.random((size, size), dtype=np.float32) - .5) * 2
    return np.asarray(field, dtype=np.float32), fine

def surface(kind, size):
    seed = 1771 + SURFACES.index(kind) * 293
    n, micro = make_fields(seed, size)
    row = np.arange(size, dtype=np.float32)[:, None]
    col = np.arange(size, dtype=np.float32)[None, :]

    if kind == "plaster":
        base, amp, rough, metallic = (117, 117, 109), 19, .90, 0
        height = n * .75 + micro * .13
        grime = np.maximum(0, row / size - .78) * 18
        pigment = n * amp + micro * 4 - grime
    elif kind == "vinyl":
        base, amp, rough, metallic = (44, 67, 63), 10, .42, 0
        fx = np.minimum(np.mod(col, size / 9), size / 9 - np.mod(col, size / 9))
        fy = np.minimum(np.mod(row, size / 9), size / 9 - np.mod(row, size / 9))
        seam = (fx < size / 450) | (fy < size / 450)
        scratches = np.sin(col * .37 + n * 4) > .998
        height = n * .42 - seam.astype(np.float32) * .9 + micro * .09
        pigment = n * amp + micro * 3 - seam * 16 + scratches * 7
    elif kind == "wood":
        base, amp, rough, metallic = (94, 58, 33), 14, .69, 0
        grain = np.sin(row * .105 + n * 3.5) * .70 + np.sin(row * .34 + n) * .20
        streak = np.maximum(0, np.sin(row * .50 + n * 2)) * .22
        height = n * .32 + grain * .45 + micro * .07
        pigment = n * amp + grain * 17 - streak * 6 + micro * 2
    elif kind == "chalk":
        base, amp, rough, metallic = (16, 53, 44), 10, .98, 0
        erasure = np.sin(row * .029 + n * 2.5) * .24
        flecks = (micro > .91).astype(np.float32) * 14
        height = n * .5 + micro * .2
        pigment = n * amp + erasure * 16 + flecks
    elif kind == "ceiling":
        base, amp, rough, metallic = (125, 127, 120), 11, .94, 0
        pore = (micro < -.93).astype(np.float32) * 16
        height = n * .32 + micro * .25
        pigment = n * amp + micro * 4 - pore
    else:
        base, amp, rough, metallic = (60, 73, 75), 11, .61, .17
        brushed = np.sin(row * .21 + n) * .18
        height = n * .28 + brushed * .26 + micro * .14
        pigment = n * amp + brushed * 12 + micro * 4

    rgb = np.stack(
        [np.clip(channel + pigment * (.92 + i * .05), 0, 255)
         for i, channel in enumerate(base)], axis=-1
    ).astype(np.uint8)
    roughfield = np.clip(rough + n * .075 + micro * .033, .035, 1)
    gx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    gy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    strength = {"plaster": 2, "vinyl": 1.15, "wood": 1.65,
                "chalk": .75, "ceiling": 1.15, "metal": .75}[kind]
    nx, ny = -gx * strength, -gy * strength
    inv = 1 / np.sqrt(nx * nx + ny * ny + 1)
    normal = np.stack(((nx * inv * .5 + .5) * 255,
                       (ny * inv * .5 + .5) * 255,
                       inv * 255), axis=-1).astype(np.uint8)
    orm = np.empty_like(rgb)
    orm[..., 0] = 255
    orm[..., 1] = (roughfield * 255).astype(np.uint8)
    orm[..., 2] = round(metallic * 255)
    return rgb, normal, orm

def generate(output_dir, size=2048):
    output_dir.mkdir(parents=True, exist_ok=True)
    textures = []
    for kind in SURFACES:
        albedo, normal, orm = surface(kind, size)
        for tier, width in (("2k", size), ("1k", size // 2)):
            for channel, pixels, quality in (
                ("albedo", albedo, 92), ("normal", normal, 96), ("orm", orm, 92)
            ):
                if width != size:
                    pixels = np.asarray(Image.fromarray(pixels).resize(
                        (width, width), Image.Resampling.LANCZOS
                    ))
                path = output_dir / f"{kind}-{tier}-{channel}.webp"
                Image.fromarray(pixels, mode="RGB").save(
                    path, format="WEBP", quality=quality, method=5
                )
                textures.append({"name": path.name, "resolution": width,
                                 "bytes": path.stat().st_size})
                print(f"{path.name}: {path.stat().st_size:,} bytes", flush=True)
    manifest = {"format": "PBR-ORM", "source": "procedural; night-school reference palette",
                "tier_2k": size, "tier_1k": size // 2, "textures": textures}
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="public/assets/textures")
    parser.add_argument("--size", type=int, default=2048, choices=[1024, 2048])
    args = parser.parse_args()
    manifest = generate(Path(args.output_dir), args.size)
    print(f"Generated {len(manifest['textures'])} maps; total "
          f"{sum(e['bytes'] for e in manifest['textures']):,} bytes")

if __name__ == "__main__":
    main()
