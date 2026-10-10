#!/usr/bin/env python3
"""
Crop and circular-mask a photo to match the Probaho gallery thumbnail style
(same treatment as images/quality11.png: 623x733, center-cropped to that
aspect ratio, with a soft anti-aliased circular alpha mask).

Usage:
    python scripts/crop_for_gallery.py <input1> [input2 ...] [--size WxH] [--vertical 0-1]

Each <input> can be any Pillow-readable image (.jpg, .jpeg, .png, ...).
The output is written next to the input, same base name, with a .png
extension (e.g. images/DurgaImg9.jpeg -> images/DurgaImg9.png),
overwriting any existing file of that name.
"""

import argparse
import os
import sys

from PIL import Image, ImageDraw

DEFAULT_TARGET_SIZE = (623, 733)  # matches images/quality11.png


def crop_and_mask(input_path, target_size=DEFAULT_TARGET_SIZE, vertical=0.5):
    target_w, target_h = target_size
    target_ratio = target_w / target_h

    im = Image.open(input_path).convert("RGB")
    w, h = im.size
    src_ratio = w / h

    if src_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        im = im.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target_ratio)
        top = int((h - new_h) * vertical)
        im = im.crop((0, top, w, top + new_h))

    im = im.resize((target_w, target_h), Image.LANCZOS).convert("RGBA")

    # Anti-aliased circular mask via 4x supersampling.
    scale = 4
    big_w, big_h = target_w * scale, target_h * scale
    mask_big = Image.new("L", (big_w, big_h), 0)
    draw = ImageDraw.Draw(mask_big)
    radius = min(target_w, target_h) / 2
    cx, cy = target_w / 2, target_h / 2
    bbox = [
        (cx - radius) * scale, (cy - radius) * scale,
        (cx + radius) * scale, (cy + radius) * scale,
    ]
    draw.ellipse(bbox, fill=255)
    mask = mask_big.resize((target_w, target_h), Image.LANCZOS)

    im.putalpha(mask)
    return im


def output_path_for(input_path):
    root, _ext = os.path.splitext(input_path)
    return root + ".png"


def parse_size(size_str):
    w_str, _, h_str = size_str.partition("x")
    return (int(w_str), int(h_str))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", help="Image file(s) to process")
    parser.add_argument(
        "--size", default=None,
        help="Target WxH, e.g. 623x733 (default: matches quality11.png)",
    )
    parser.add_argument(
        "--vertical", type=float, default=0.5,
        help="Vertical crop position for tall images: 0 = top, 0.5 = center "
             "(default), 1 = bottom. Use a lower value to keep faces near the top.",
    )
    args = parser.parse_args(argv)

    target_size = parse_size(args.size) if args.size else DEFAULT_TARGET_SIZE

    for input_path in args.inputs:
        if not os.path.isfile(input_path):
            print(f"SKIP (not found): {input_path}", file=sys.stderr)
            continue

        out_path = output_path_for(input_path)
        im = crop_and_mask(input_path, target_size, args.vertical)
        im.save(out_path, "PNG", optimize=True)
        print(f"{input_path} -> {out_path} ({im.size[0]}x{im.size[1]})")


if __name__ == "__main__":
    main()
