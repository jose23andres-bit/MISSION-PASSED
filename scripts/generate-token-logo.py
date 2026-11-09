"""Render public/token-logo.png (512x512) from the MISSION PASSED mark geometry.

Pure Python (zlib + struct) so it runs without image libraries.
Geometry mirrors public/mark.svg (viewBox 0 0 120 120).
"""
import struct
import zlib
from pathlib import Path

SIZE = 512
SCALE = SIZE / 120
INK = (0x0B, 0x07, 0x11)
RADIUS = 8 * SCALE
M_SHAPE = [(21, 88), (21, 31), (41, 31), (60, 58), (79, 31), (99, 31), (99, 88),
           (79, 88), (79, 60), (60, 86), (41, 60), (41, 88)]
POLY = [(x * SCALE, y * SCALE) for x, y in M_SHAPE]
BAR = (19 * SCALE, 96 * SCALE, 101 * SCALE, 102 * SCALE)


def inside_rounded_square(x, y):
    r = RADIUS
    cx = min(max(x, r), SIZE - r)
    cy = min(max(y, r), SIZE - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def inside_polygon(x, y):
    hit = False
    j = len(POLY) - 1
    for i, (xi, yi) in enumerate(POLY):
        xj, yj = POLY[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


rows = bytearray()
for py in range(SIZE):
    rows.append(0)
    y = py + 0.5
    for px in range(SIZE):
        x = px + 0.5
        if not inside_rounded_square(x, y):
            rows += b"\x00\x00\x00\x00"
        elif inside_polygon(x, y) or (BAR[0] <= x <= BAR[2] and BAR[1] <= y <= BAR[3]):
            rows += bytes(INK) + b"\xff"
        else:
            # Original sunset gradient: yellow → coral → pink → violet.
            t = min(1.0, max(0.0, (x * 0.42 + y * 0.58) / SIZE))
            stops = [(0.0, (255, 227, 110)), (0.42, (255, 118, 95)), (0.72, (255, 78, 157)), (1.0, (108, 60, 255))]
            for idx in range(len(stops) - 1):
                a, ca = stops[idx]; b, cb = stops[idx + 1]
                if a <= t <= b:
                    u = (t - a) / (b - a)
                    color = tuple(round(ca[j] + (cb[j] - ca[j]) * u) for j in range(3))
                    break
            rows += bytes(color) + b"\xff"


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(rows), 9))
png += chunk(b"IEND", b"")

out = Path(__file__).resolve().parent.parent / "public" / "token-logo.png"
out.write_bytes(png)
print(f"wrote {out} ({len(png)} bytes)")
