#!/usr/bin/env python3
"""Generate the extension icons (icons/icon16.png, icon48.png, icon128.png).

Pure standard library (zlib + struct); no Pillow required.
Run from anywhere:  python -I scripts/make-icons.py
"""
import math
import os
import struct
import zlib

SIZES = (16, 48, 128)
SS = 4  # supersampling factor per axis (anti-aliasing)

BG = (79, 70, 229)       # indigo
FG = (255, 255, 255)     # envelope body
LINE = (79, 70, 229)     # flap line
ACCENT = (20, 184, 166)  # teal badge


def in_round_rect(x, y, x0, y0, x1, y1, r):
    """True if (x, y) lies inside the rounded rectangle."""
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def shade(x, y, size):
    """Return RGB for a point in unit coordinates (0..1), or None if transparent."""
    if not in_round_rect(x, y, 0, 0, 1, 1, 0.22):
        return None
    color = BG
    # Envelope body
    if in_round_rect(x, y, 0.14, 0.27, 0.86, 0.73, 0.06):
        color = FG
        w = max(0.045, 1.2 / size)
        # Flap: V from the top corners to the centre
        if (dist_to_segment(x, y, 0.17, 0.31, 0.5, 0.56) <= w / 2
                or dist_to_segment(x, y, 0.83, 0.31, 0.5, 0.56) <= w / 2):
            color = LINE
    # Teal badge at bottom-right (marks the "alias" identity), larger sizes only
    if size >= 32 and (x - 0.76) ** 2 + (y - 0.72) ** 2 <= 0.15 ** 2:
        color = ACCENT
        if (dist_to_segment(x, y, 0.70, 0.72, 0.82, 0.72) <= 0.022
                or dist_to_segment(x, y, 0.77, 0.66, 0.83, 0.72) <= 0.022
                or dist_to_segment(x, y, 0.77, 0.78, 0.83, 0.72) <= 0.022):
            color = FG
    return color


def render(size):
    rows = []
    n = SS * SS
    for j in range(size):
        row = bytearray([0])  # PNG filter type 0 (none)
        for i in range(size):
            r = g = b = a = 0
            for sj in range(SS):
                for si in range(SS):
                    c = shade((i + (si + 0.5) / SS) / size,
                              (j + (sj + 0.5) / SS) / size, size)
                    if c:
                        r += c[0]
                        g += c[1]
                        b += c[2]
                        a += 1
            if a:
                row += bytes((r // a, g // a, b // a, round(255 * a / n)))
            else:
                row += bytes((0, 0, 0, 0))
        rows.append(bytes(row))
    return b"".join(rows)


def chunk(tag, data):
    body = tag + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_png(path, size):
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(render(size), 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
    os.makedirs(out, exist_ok=True)
    for s in SIZES:
        p = os.path.normpath(os.path.join(out, "icon%d.png" % s))
        write_png(p, s)
        print("wrote", p)


if __name__ == "__main__":
    main()
