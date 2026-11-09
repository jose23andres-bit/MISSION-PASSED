"""Generate the original MISSION PASSED "Leonida postcards" gallery (SVG).

Every shape is drawn from code: no Rockstar screenshots, logos or traced art.
Run: python3 scripts/generate-gallery.py
"""
import math
import random
from pathlib import Path

W, H = 1600, 900
OUT = Path(__file__).resolve().parent.parent / "public" / "gallery"


def svg(defs, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">'
        f"<title>{title} · Ilustración original MISSION PASSED</title><defs>{defs}"
        '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/>'
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
        '<filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>'
        '<linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/>'
        '<stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>'
        f'</defs>{body}<rect width="{W}" height="{H}" fill="url(#vignette)"/></svg>'
    )


def grad(gid, stops, x2=0, y2=1):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def striped_sun(cx, cy, r, gid, bands=7, start=0.45):
    clip = [f'<clipPath id="{gid}-c"><rect x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{r * (1 + start)}"/>']
    y = cy - r + r * (1 + start)
    gap = 4
    for i in range(bands):
        h = max(r * 0.09 - i * 2, 6)
        clip.append(f'<rect x="{cx - r}" y="{y:.1f}" width="{2 * r}" height="{h:.1f}"/>')
        y += h + gap + i * 2.2
    clip.append("</clipPath>")
    return "".join(clip), f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#{gid})" clip-path="url(#{gid}-c)"/>'


def palm(x, base, height, lean, color, scale=1.0):
    tip_x = x + lean
    tip_y = base - height
    trunk = (
        f'<path d="M{x - 9 * scale},{base} Q{x + lean * 0.35},{base - height * 0.55} {tip_x - 3 * scale},{tip_y} '
        f'L{tip_x + 4 * scale},{tip_y} Q{x + lean * 0.35 + 10 * scale},{base - height * 0.55} {x + 9 * scale},{base} Z" fill="{color}"/>'
    )
    leaves = []
    for ang in (-170, -140, -110, -70, -40, -10, 20, 200):
        a = math.radians(ang)
        length = (150 + (ang % 3) * 12) * scale
        ex, ey = tip_x + math.cos(a) * length, tip_y + math.sin(a) * length * 0.55 + 40 * scale
        cx1, cy1 = tip_x + math.cos(a) * length * 0.5, tip_y + math.sin(a) * length * 0.5 - 30 * scale
        leaves.append(
            f'<path d="M{tip_x},{tip_y} Q{cx1:.1f},{cy1:.1f} {ex:.1f},{ey:.1f} Q{cx1:.1f},{cy1 + 22 * scale:.1f} {tip_x},{tip_y + 8 * scale} Z" fill="{color}"/>'
        )
    return trunk + "".join(leaves)


def skyline(rng, y_base, count, min_h, max_h, color, windows=None, x0=0, x1=W, wmin=40, wmax=110):
    parts, x = [], x0
    while x < x1 and count:
        w = rng.randint(wmin, wmax)
        h = rng.randint(min_h, max_h)
        top = y_base - h
        parts.append(f'<rect x="{x}" y="{top}" width="{w}" height="{h + 2}" fill="{color}"/>')
        if rng.random() < 0.25:
            parts.append(f'<rect x="{x + w / 2 - 2}" y="{top - 40}" width="4" height="40" fill="{color}"/>')
            parts.append(f'<circle cx="{x + w / 2}" cy="{top - 42}" r="3" fill="#ff4d6d" filter="url(#glow)"/>')
        if windows:
            for wy in range(top + 12, y_base - 10, 18):
                for wx in range(x + 8, x + w - 10, 14):
                    if rng.random() < windows[1]:
                        parts.append(f'<rect x="{wx}" y="{wy}" width="6" height="9" fill="{rng.choice(windows[0])}" opacity="{rng.uniform(.55, 1):.2f}"/>')
        x += w + rng.randint(-6, 12)
        count -= 1
    return "".join(parts)


def stars(rng, n, ymax, color="#fff"):
    return "".join(
        f'<circle cx="{rng.uniform(0, W):.0f}" cy="{rng.uniform(0, ymax):.0f}" r="{rng.uniform(.6, 2):.1f}" fill="{color}" opacity="{rng.uniform(.3, .9):.2f}"/>'
        for _ in range(n)
    )


def water_reflections(rng, y0, y1, colors, n=90):
    out = []
    for _ in range(n):
        y = rng.uniform(y0, y1)
        w = rng.uniform(20, 160) * (1 + (y - y0) / (y1 - y0))
        x = rng.uniform(0, W)
        out.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{rng.uniform(1.5, 4):.1f}" rx="2" fill="{rng.choice(colors)}" opacity="{rng.uniform(.25, .8):.2f}"/>')
    return "".join(out)


def scene_beach():
    rng = random.Random(1)
    defs = grad("sky", [(0, "#3b1f8f"), (.38, "#c43f9a"), (.7, "#ff7a5c"), (1, "#ffc56b")])
    defs += grad("sea", [(0, "#ff9a6b"), (.25, "#a8418f"), (1, "#22124a")])
    defs += grad("sand", [(0, "#f6b48a"), (1, "#c66a6f")])
    defs += grad("sun", [(0, "#fff3b0"), (1, "#ff8a5c")])
    sdefs, sun = striped_sun(1050, 470, 230, "sun")
    hotels = []
    colors = ["#ffd3e6", "#b9fff1", "#ffe9a8", "#e3d2ff"]
    x = 40
    for i in range(7):
        w, h = rng.randint(120, 170), rng.randint(110, 190)
        c = colors[i % 4]
        hotels.append(f'<rect x="{x}" y="{560 - h}" width="{w}" height="{h}" fill="{c}" opacity=".9"/>')
        hotels.append(f'<rect x="{x + w * .35}" y="{560 - h - 30}" width="{w * .3}" height="32" rx="10" fill="{c}"/>')
        for k in range(3):
            hotels.append(f'<rect x="{x + 8}" y="{560 - h + 25 + k * 40}" width="{w - 16}" height="6" fill="#ff5c9a" opacity=".55"/>')
        hotels.append(f'<rect x="{x + w * .3}" y="{560 - h + 8}" width="{w * .4}" height="14" fill="#2b123f" opacity=".7"/>')
        x += w + 18
        if x > 700:
            break
    body = (
        f'<rect width="{W}" height="{H}" fill="url(#sky)"/>{sun}'
        f'<rect y="560" width="{W}" height="340" fill="url(#sea)"/>'
        + water_reflections(rng, 575, 760, ["#ffe39a", "#ff9fc1", "#fff"], 70)
        + f'<g opacity=".95">{"".join(hotels)}</g>'
        + f'<path d="M0,740 Q500,690 900,735 T{W},720 L{W},{H} L0,{H} Z" fill="url(#sand)"/>'
        + f'<path d="M0,745 Q500,695 900,740 T{W},725" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/>'
        + palm(1380, 900, 520, -90, "#1b0b24", 1.15)
        + palm(1230, 880, 380, 60, "#1b0b24", .85)
        + palm(170, 900, 420, 70, "#1b0b24", .95)
        + '<g fill="#1b0b24"><rect x="560" y="790" width="120" height="8" rx="4"/><rect x="570" y="798" width="6" height="40"/><rect x="664" y="798" width="6" height="40"/>'
        '<path d="M520,790 Q620,700 720,790 Z" fill="#ff5c9a"/><rect x="618" y="740" width="4" height="100"/></g>'
    )
    return svg(defs + sdefs, body, "Ocean Drive al atardecer")


def scene_skyline():
    rng = random.Random(2)
    defs = grad("sky", [(0, "#090418"), (.55, "#2b0f4d"), (1, "#7a1f6e")])
    defs += grad("water", [(0, "#1a0a2e"), (1, "#05020b")])
    win = (["#ffe36e", "#5ff2df", "#ff7ab8", "#fff"], .35)
    body = (
        f'<rect width="{W}" height="{H}" fill="url(#sky)"/>' + stars(rng, 140, 380)
        + '<circle cx="300" cy="170" r="70" fill="#ffe9c4" opacity=".9"/><circle cx="300" cy="170" r="140" fill="#ffe9c4" opacity=".08"/>'
        + f'<g opacity=".55">{skyline(rng, 600, 40, 120, 300, "#2a1240")}</g>'
        + skyline(rng, 600, 40, 160, 440, "#12081d", win, wmin=60, wmax=130)
        + '<g filter="url(#glow)"><rect x="880" y="200" width="6" height="400" fill="#ff3fa4"/><rect x="1180" y="260" width="6" height="340" fill="#38f2d8"/>'
        '<text x="980" y="300" font-family="Impact,Arial Black,sans-serif" font-size="70" fill="#ff3fa4" letter-spacing="6">VICE</text></g>'
        + f'<rect y="600" width="{W}" height="300" fill="url(#water)"/>'
        + water_reflections(rng, 610, 890, ["#ff3fa4", "#38f2d8", "#ffe36e"], 160)
        + '<path d="M0,640 L1600,610" stroke="#38f2d8" stroke-width="3" opacity=".7" filter="url(#glow)"/>'
    )
    return svg(defs, body, "Skyline de neón")


def scene_highway():
    rng = random.Random(3)
    defs = grad("sky", [(0, "#120625"), (.6, "#5a1866"), (1, "#ff6a5c")])
    defs += grad("road", [(0, "#2a1730"), (1, "#07040a")])
    defs += grad("trail", [(0, "#ff2d55"), (1, "#ff2d55")], 1, 0)
    streaks = []
    for i in range(16):
        spread = 1 + i * 0.35
        streaks.append(
            f'<path d="M{800 - 18 * spread},{520} L{800 - 160 * spread * 1.6},{H}" stroke="#ff2d55" stroke-width="{1 + i * .35:.1f}" opacity="{.25 + rng.random() * .5:.2f}" filter="url(#glow)"/>'
        )
        streaks.append(
            f'<path d="M{800 + 18 * spread},{520} L{800 + 160 * spread * 1.6},{H}" stroke="#fff4c2" stroke-width="{1 + i * .35:.1f}" opacity="{.25 + rng.random() * .5:.2f}" filter="url(#glow)"/>'
        )
    body = (
        f'<rect width="{W}" height="{H}" fill="url(#sky)"/>' + stars(rng, 70, 300)
        + '<circle cx="800" cy="520" r="260" fill="#ff8a5c" opacity=".35" filter="url(#soft)"/>'
        + f'<g opacity=".8">{skyline(rng, 525, 60, 40, 180, "#1c0b26", (["#ffe36e", "#ff9ec8"], .2), wmin=30, wmax=70)}</g>'
        + f'<path d="M760,520 L840,520 L{W + 400},{H} L-400,{H} Z" fill="url(#road)"/>'
        + "".join(streaks)
        + "".join(
            f'<rect x="{798 - k * .4:.1f}" y="{530 + k * k * 1.25:.0f}" width="{4 + k * .8:.1f}" height="{8 + k * 3}" fill="#ffe36e" opacity=".9"/>'
            for k in range(1, 20)
        )
        + '<g fill="#0b0610"><rect x="0" y="380" width="1600" height="34"/><rect x="180" y="414" width="40" height="300"/><rect x="1380" y="414" width="40" height="300"/></g>'
        + '<g filter="url(#glow)"><rect x="560" y="330" width="220" height="56" rx="6" fill="#0d6b4f"/><text x="670" y="368" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="26" fill="#fff">I-95 SOUTH</text>'
        '<rect x="820" y="330" width="220" height="56" rx="6" fill="#0d6b4f"/><text x="930" y="368" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="26" fill="#fff">THE KEYS ↗</text></g>'
    )
    return svg(defs, body, "Autopista nocturna")


def scene_marina():
    rng = random.Random(4)
    defs = grad("sky", [(0, "#2d6fd1"), (.5, "#9b7be0"), (.8, "#ffb3b8"), (1, "#ffd59a")])
    defs += grad("sea", [(0, "#7fd8e0"), (1, "#16457a")])
    boats = []
    for i in range(9):
        x = 80 + i * 170 + rng.randint(-20, 20)
        y = 690 + rng.randint(-10, 20)
        boats.append(f'<path d="M{x},{y} L{x + 130},{y} L{x + 110},{y + 26} L{x + 18},{y + 26} Z" fill="#fff"/>')
        boats.append(f'<rect x="{x + 30}" y="{y - 24}" width="60" height="24" rx="4" fill="#f4f0ff"/><rect x="{x + 36}" y="{y - 18}" width="48" height="8" fill="#2b2f5e"/>')
        boats.append(f'<rect x="{x + 62}" y="{y - 190 + rng.randint(0, 40)}" width="3" height="{190}" fill="#3a2a55"/>')
        boats.append(f'<path d="M{x},{y + 30} L{x + 130},{y + 30}" stroke="#fff" stroke-width="2" opacity=".5"/>')
    bridge = "".join(f'<rect x="{x}" y="470" width="10" height="70" fill="#4b3f7a"/>' for x in range(0, W, 90))
    body = (
        f'<rect width="{W}" height="{H}" fill="url(#sky)"/>'
        + '<circle cx="1250" cy="420" r="120" fill="#fff4cf" opacity=".85"/><circle cx="1250" cy="420" r="260" fill="#fff4cf" opacity=".15" filter="url(#soft)"/>'
        + "".join(f'<ellipse cx="{rng.randint(0, W)}" cy="{rng.randint(80, 300)}" rx="{rng.randint(90, 220)}" ry="{rng.randint(14, 30)}" fill="#fff" opacity=".35"/>' for _ in range(9))
        + f'<rect y="540" width="{W}" height="360" fill="url(#sea)"/>'
        + f'<rect y="460" width="{W}" height="14" fill="#4b3f7a"/>{bridge}'
        + water_reflections(rng, 560, 880, ["#fff", "#ffe7b5"], 90)
        + "".join(boats)
        + '<rect y="790" width="1600" height="26" fill="#6b4b3a"/>' + "".join(f'<rect x="{x}" y="790" width="8" height="110" fill="#4a3226"/>' for x in range(20, W, 120))
        + palm(1500, 800, 360, -70, "#2b1f3d", .9)
    )
    return svg(defs, body, "Marina de los Cayos")


def scene_swamp():
    rng = random.Random(5)
    defs = grad("sky", [(0, "#0b1a2a"), (.6, "#24425a"), (1, "#c97f6b")])
    defs += grad("water", [(0, "#2a3c3f"), (1, "#060c0d")])
    mangroves = []
    for i in range(14):
        x = rng.randint(-50, W)
        h = rng.randint(140, 330)
        base = 600
        mangroves.append(f'<ellipse cx="{x}" cy="{base - h}" rx="{rng.randint(90, 170)}" ry="{rng.randint(50, 90)}" fill="#0b1712"/>')
        for r in range(5):
            dx = rng.randint(-70, 70)
            mangroves.append(f'<path d="M{x},{base - h + 30} Q{x + dx / 2},{base - 60} {x + dx},{base + 10}" stroke="#0b1712" stroke-width="{rng.randint(5, 12)}" fill="none"/>')
    flies = "".join(
        f'<circle cx="{rng.uniform(0, W):.0f}" cy="{rng.uniform(380, 820):.0f}" r="{rng.uniform(1.5, 3.5):.1f}" fill="#d9ff6b" filter="url(#glow)" opacity="{rng.uniform(.4, 1):.2f}"/>'
        for _ in range(70)
    )
    body = (
        f'<rect width="{W}" height="{H}" fill="url(#sky)"/>' + stars(rng, 90, 320)
        + '<circle cx="1180" cy="200" r="80" fill="#fff2d1"/><circle cx="1180" cy="200" r="200" fill="#fff2d1" opacity=".12" filter="url(#soft)"/>'
        + f'<rect y="600" width="{W}" height="300" fill="url(#water)"/>'
        + '<path d="M1180,610 L1180,880" stroke="#fff2d1" stroke-width="40" opacity=".12" filter="url(#soft)"/>'
        + "".join(mangroves)
        + water_reflections(rng, 610, 880, ["#fff2d1", "#8fb6b0"], 50)
        + '<g fill="#050909"><path d="M560,720 L860,720 L830,752 L590,752 Z"/><rect x="760" y="640" width="12" height="80"/><circle cx="766" cy="640" r="46" fill="none" stroke="#050909" stroke-width="10"/>'
        '<rect x="660" y="690" width="40" height="30"/><circle cx="680" cy="680" r="13"/></g>'
        + '<path d="M480,760 Q700,790 940,760" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>'
        + '<g fill="#050909"><path d="M120,770 Q170,750 230,768 Q260,760 290,772 Q230,782 120,770 Z"/><circle cx="292" cy="770" r="4" fill="#d9ff6b"/></g>'
        + flies
    )
    return svg(defs, body, "Pantano al anochecer")


def scene_club():
    rng = random.Random(6)
    defs = grad("sky", [(0, "#06020d"), (1, "#22093a")])
    defs += grad("wall", [(0, "#2a0f3d"), (1, "#12061c")])
    defs += grad("floor", [(0, "#3a0f45"), (1, "#0b030f")])
    lasers = "".join(
        f'<path d="M800,140 L{x},{H}" stroke="{c}" stroke-width="3" opacity=".55" filter="url(#glow)"/>'
        for x, c in [(-100, "#38f2d8"), (200, "#ff3fa4"), (520, "#ffe36e"), (1080, "#ffe36e"), (1400, "#ff3fa4"), (1700, "#38f2d8")]
    )
    crowd = []
    for i in range(46):
        x = rng.randint(-20, W)
        y = rng.randint(720, 830)
        s = rng.uniform(.8, 1.3)
        arm = rng.random() < 0.35
        crowd.append(f'<g fill="#050208" transform="translate({x},{y}) scale({s:.2f})"><circle cx="0" cy="-70" r="20"/><path d="M-30,0 Q-32,-48 0,-50 Q32,-48 30,0 L30,140 L-30,140 Z"/>'
                     + ('<path d="M18,-40 L48,-110" stroke="#050208" stroke-width="12" stroke-linecap="round"/>' if arm else "") + "</g>")
    body = (
        f'<rect width="{W}" height="{H}" fill="url(#sky)"/>'
        + '<path d="M200,700 L200,250 Q800,120 1400,250 L1400,700 Z" fill="url(#wall)"/>'
        + '<g filter="url(#glow)"><path d="M300,700 L300,280 Q800,170 1300,280 L1300,700" stroke="#ff3fa4" stroke-width="5" fill="none"/>'
        '<text x="800" y="420" text-anchor="middle" font-family="Brush Script MT,Segoe Script,cursive" font-size="150" fill="#38f2d8">Mission</text>'
        '<text x="800" y="530" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="96" letter-spacing="22" fill="#ff3fa4">PASSED</text>'
        '<rect x="560" y="560" width="480" height="8" rx="4" fill="#ffe36e"/></g>'
        + lasers
        + f'<rect y="700" width="{W}" height="200" fill="url(#floor)"/>'
        + "".join(crowd)
        + '<circle cx="800" cy="140" r="34" fill="#fff" filter="url(#glow)"/>'
    )
    return svg(defs, body, "Club nocturno")


SCENES = {
    "01-ocean-drive.svg": scene_beach,
    "02-neon-skyline.svg": scene_skyline,
    "03-night-highway.svg": scene_highway,
    "04-keys-marina.svg": scene_marina,
    "05-swamp-night.svg": scene_swamp,
    "06-night-club.svg": scene_club,
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in SCENES.items():
        (OUT / name).write_text(fn(), encoding="utf-8")
        print(f"wrote public/gallery/{name}")
