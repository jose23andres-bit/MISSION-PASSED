#!/usr/bin/env python3
"""Generates the four Mission Pass NFT portraits in public/nft/.

Original MISSION PASSED characters drawn in a neon, sunset, loading-screen poster style.
They are NOT based on Rockstar Games characters, logos or artwork.
Run: python3 scripts/generate-nft-art.py
"""
import base64
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "nft"
INK = "#1a0628"

# ---------------------------------------------------------------- shared pieces

FONT = base64.b64encode((Path(__file__).resolve().parent.parent / "public" / "fonts" / "Anton-Regular.ttf").read_bytes()).decode()


def defs(c):
    return f"""<defs>
  <style>@font-face {{ font-family: MPAnton; src: url(data:font/ttf;base64,{FONT}) format('truetype'); }}</style>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{c['sky'][0]}"/><stop offset=".55" stop-color="{c['sky'][1]}"/><stop offset="1" stop-color="{c['sky'][2]}"/>
  </linearGradient>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c['sun'][0]}"/><stop offset="1" stop-color="{c['sun'][1]}"/></linearGradient>
  <linearGradient id="skin" x1="0" x2="1"><stop offset="0" stop-color="{c['skin'][0]}"/><stop offset=".5" stop-color="{c['skin'][1]}"/><stop offset="1" stop-color="{c['skin'][0]}"/></linearGradient>
  <linearGradient id="cloth" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="{c['cloth'][0]}"/><stop offset="1" stop-color="{c['cloth'][1]}"/></linearGradient>
  <linearGradient id="lens" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff6fd0"/><stop offset=".55" stop-color="#8b2cff"/><stop offset="1" stop-color="#3ff0ff"/></linearGradient>
  <linearGradient id="gold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#ffd36e"/><stop offset="1" stop-color="#c98a1a"/></linearGradient>
  <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="3" fill="#fff" opacity=".18"/></pattern>
  <clipPath id="card"><rect x="30" y="30" width="940" height="940" rx="46"/></clipPath>
  <filter id="rim" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="-7" dy="0" stdDeviation="2" flood-color="{c['rim'][0]}" flood-opacity=".95"/>
    <feDropShadow dx="7" dy="0" stdDeviation="2" flood-color="{c['rim'][1]}" flood-opacity=".95"/>
    <feDropShadow dx="0" dy="0" stdDeviation="22" flood-color="{c['rim'][1]}" flood-opacity=".45"/>
  </filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>
  <filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>"""


def sun(cx=500, cy=430, r=250):
    bands = "".join(
        f'<rect x="{cx - r}" y="{cy + 40 + i * 34}" width="{2 * r}" height="{8 + i * 3}" fill="url(#sky)"/>' for i in range(6)
    )
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#sun)"/>{bands}'


def palm(x, y, s=1.0, flip=False, color="#12041c"):
    k = -1 if flip else 1
    leaves = "".join(
        f'<path d="M0 0 q{k * a} {b} {k * c} {d} q{k * -a * .4} {-b * .2} {k * -c} {-d} Z"/>'
        for a, b, c, d in [(90, -40, 170, 20), (60, -70, 120, -60), (-60, -70, -130, -50), (-90, -30, -170, 30), (20, -90, 30, -150), (110, 0, 150, 80), (-100, 10, -140, 90)]
    )
    return f'<g transform="translate({x} {y}) scale({s})" fill="{color}"><path d="M-8 0 q{k * 30} 260 {k * 10} 520 h24 q{k * 10} -260 {k * -16} -520 Z"/>{leaves}</g>'


def skyline(color="#16052a"):
    xs = [(40, 120, 260), (130, 70, 330), (200, 110, 220), (310, 60, 380), (370, 90, 300), (600, 80, 360), (680, 120, 250), (800, 70, 320), (870, 100, 270)]
    rects = "".join(f'<rect x="{x}" y="{1000 - h}" width="{w}" height="{h}" fill="{color}"/>' for x, w, h in xs)
    windows = "".join(
        f'<rect x="{x + 12 + (i % 3) * 22}" y="{1000 - h + 20 + (i // 3) * 30}" width="8" height="12" fill="#ffd36e" opacity="{.35 + (i % 4) * .15:.2f}"/>'
        for x, w, h in xs for i in range(9) if (x + i) % 3
    )
    return rects + windows


def frame(c, number, name, rarity):
    return f"""
<rect x="30" y="30" width="940" height="940" rx="46" fill="none" stroke="{c['frame']}" stroke-width="16"/>
<rect x="52" y="52" width="896" height="896" rx="30" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
<g font-family="MPAnton, Impact, 'Arial Black', sans-serif" text-anchor="middle">
  <text x="500" y="128" font-size="64" letter-spacing="10" fill="#fff" stroke="{INK}" stroke-width="10" paint-order="stroke" filter="url(#glow)">MISSION PASS</text>
  <text x="92" y="214" font-size="64" fill="{c['frame']}" stroke="{INK}" stroke-width="9" paint-order="stroke" text-anchor="start" transform="rotate(-6 92 214)">#{number}</text>
</g>
<g transform="translate(500 892) rotate(-3)">
  <path d="M-330 -58 h660 l-30 58 l30 58 h-660 l30 -58 Z" fill="{c['frame']}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>
  <text y="22" font-family="MPAnton, Impact, 'Arial Black', sans-serif" font-size="70" letter-spacing="4" text-anchor="middle" fill="#fff" stroke="{INK}" stroke-width="9" paint-order="stroke">{name}</text>
</g>
<g transform="translate(842 130) rotate(8)">
  <rect x="-96" y="-34" width="192" height="68" rx="14" fill="{INK}" stroke="{c['frame']}" stroke-width="5"/>
  <text y="16" font-family="MPAnton, Impact, 'Arial Black', sans-serif" font-size="40" letter-spacing="4" text-anchor="middle" fill="{c['frame']}">{rarity}</text>
</g>"""


def eyes(iris="#3a1f14", lid=0):
    out = []
    for x in (82, 118):
        out.append(f'<path d="M{x - 11} 104 q11 -9 22 0 q-11 8 -22 0 Z" fill="#fff" stroke="{INK}" stroke-width="2.5"/>')
        out.append(f'<circle cx="{x}" cy="{104 + lid}" r="5" fill="{iris}"/><circle cx="{x + 1.5}" cy="{102.5 + lid}" r="1.6" fill="#fff"/>')
        out.append(f'<path d="M{x - 12} {103 + lid} q12 -10 24 0" fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>')
    return "".join(out)


def nose(color="#8a4d2e"):
    return f'<path d="M100 106 q-7 15 -2 19 q5 2 9 0" fill="none" stroke="{color}" stroke-width="3" stroke-linecap="round"/>'


def ears(y=110):
    return f'<ellipse cx="62" cy="{y}" rx="9" ry="13" fill="url(#skin)" stroke="{INK}" stroke-width="3"/><ellipse cx="138" cy="{y}" rx="9" ry="13" fill="url(#skin)" stroke="{INK}" stroke-width="3"/>'


def neck():
    return f'<rect x="86" y="150" width="28" height="28" rx="6" fill="url(#skin)" stroke="{INK}" stroke-width="3"/>'


TORSO = "M18 240 C20 196 54 174 100 172 C146 174 180 196 182 240 Z"

# ---------------------------------------------------------------- characters (200×240 local units)

def conductor():
    head = "M64 90 C64 54 136 54 136 90 L134 124 C130 150 114 160 100 160 C86 160 70 150 66 124 Z"
    return f"""
<path d="{TORSO}" fill="url(#cloth)" stroke="{INK}" stroke-width="4"/>
<path d="M40 214 L160 214 M34 228 L166 228" stroke="#fff" stroke-width="5" opacity=".9"/>
<path d="M98 176 L98 240" stroke="{INK}" stroke-width="3"/>
<path d="M78 170 L72 196 L98 182 Z M122 170 L128 196 L102 182 Z" fill="#c4127e" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
{neck()}{ears(112)}
<path d="{head}" fill="url(#skin)" stroke="{INK}" stroke-width="4"/>
<path d="M68 124 C72 150 90 160 100 160 C110 160 128 150 132 124 C126 140 114 146 100 146 C86 146 74 140 68 124 Z" fill="#3a2a2a" opacity=".35"/>
<path d="M64 92 C60 58 80 46 100 46 C120 46 140 58 136 92 C132 76 120 68 100 68 C80 68 68 76 64 92 Z" fill="#2b1a14" stroke="{INK}" stroke-width="3.5"/>
<g transform="translate(0 -6)"><path d="M72 64 h24 q0 12 -12 12 q-12 0 -12 -12 Z M104 64 h24 q0 12 -12 12 q-12 0 -12 -12 Z" fill="#111" stroke="{INK}" stroke-width="2.5"/><path d="M96 66 h8" stroke="{INK}" stroke-width="3"/><path d="M76 67 h8 M108 67 h8" stroke="#3ff0ff" stroke-width="2"/></g>
<path d="M70 92 l26 4 M104 96 l26 -4" stroke="#2b1a14" stroke-width="5" stroke-linecap="round"/>
{eyes(lid=1)}{nose()}
<path d="M86 138 q12 4 24 -2" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M110 136 l22 -8" stroke="#e9c27a" stroke-width="3" stroke-linecap="round"/>
<path d="M76 126 q2 4 0 8 M124 126 q-2 4 0 8" stroke="#7b4a33" stroke-width="2" opacity=".5"/>"""


def jefa():
    head = "M66 92 C66 56 134 56 134 92 L132 120 C128 146 114 156 100 156 C86 156 72 146 68 120 Z"
    return f"""
<path d="{TORSO}" fill="url(#cloth)" stroke="{INK}" stroke-width="4"/>
<path d="M82 172 L100 230 L118 172 Z" fill="#ff2d9b" stroke="{INK}" stroke-width="3"/>
<path d="M80 172 L62 200 L86 206 L100 236 Z M120 172 L138 200 L114 206 L100 236 Z" fill="#fdf6ea" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M88 182 Q100 196 112 182" fill="none" stroke="url(#gold)" stroke-width="3"/>
{neck()}
<path d="M56 122 C46 72 70 40 100 40 C130 40 154 72 144 122 C146 138 140 148 132 150 L132 100 L68 100 L68 150 C60 148 54 138 56 122 Z" fill="#f2e3bd" stroke="{INK}" stroke-width="3.5"/>
<path d="{head}" fill="url(#skin)" stroke="{INK}" stroke-width="4"/>
<path d="M62 100 C60 64 84 46 108 48 C130 50 144 70 140 98 C126 80 104 70 84 76 C74 80 66 90 62 100 Z" fill="#f7ecd0" stroke="{INK}" stroke-width="3.5"/>
<path d="M84 56 C100 50 120 54 132 70" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
<circle cx="68" cy="134" r="9" fill="none" stroke="url(#gold)" stroke-width="3.5"/><circle cx="132" cy="134" r="9" fill="none" stroke="url(#gold)" stroke-width="3.5"/>
<path d="M68 98 q14 -7 26 -1 M106 97 q12 -6 26 1" stroke="#a88a58" stroke-width="3" fill="none" stroke-linecap="round"/>
<g><path d="M68 100 h28 q2 16 -12 18 q-14 0 -16 -18 Z" fill="#14c9c0" fill-opacity=".85" stroke="url(#gold)" stroke-width="3.5"/>
<path d="M104 100 h28 q-2 18 -16 18 q-14 -2 -12 -18 Z" fill="#14c9c0" fill-opacity=".85" stroke="url(#gold)" stroke-width="3.5"/>
<path d="M96 102 q4 -4 8 0" fill="none" stroke="url(#gold)" stroke-width="3"/><path d="M74 104 l9 0 M110 104 l9 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g>
{nose("#b0603e")}
<path d="M88 136 q12 -5 24 0 q-12 9 -24 0 Z" fill="#e0103f" stroke="{INK}" stroke-width="2.5"/>
<path d="M90 136 q10 3 20 0" stroke="#7d0a26" stroke-width="1.5" fill="none"/>
<circle cx="118" cy="128" r="1.6" fill="{INK}"/>
<path d="M74 122 q6 3 10 0 M116 122 q6 3 10 0" stroke="#ff7aa8" stroke-width="5" stroke-linecap="round" opacity=".35"/>"""


def socio():
    head = "M58 94 C58 50 142 50 142 94 L140 126 C136 154 118 166 100 166 C82 166 64 154 60 126 Z"
    leaves = "".join(
        f'<path transform="translate({x} {y}) rotate({r})" d="M0 0 q12 -10 26 0 q-12 10 -26 0 Z M2 0 h22" fill="#1d7a3a" stroke="{INK}" stroke-width="1.5"/>'
        for x, y, r in [(36, 204, -20), (140, 200, 25), (60, 228, 10), (150, 226, -15), (118, 214, 40)]
    )
    return f"""
<path d="{TORSO}" fill="url(#cloth)" stroke="{INK}" stroke-width="4"/>
<g clip-path="url(#torsoclip)">{leaves}</g>
<path d="M76 172 L64 198 L98 212 Z M124 172 L136 198 L102 212 Z" fill="#fff4e0" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M80 176 Q100 214 120 176" fill="none" stroke="url(#gold)" stroke-width="7"/>
<path d="M80 176 Q100 214 120 176" fill="none" stroke="#a86b00" stroke-width="7" stroke-dasharray="3 5" opacity=".5"/>
<rect x="84" y="152" width="32" height="26" rx="6" fill="url(#skin)" stroke="{INK}" stroke-width="3"/>
{ears(112)}
<circle cx="138" cy="126" r="6" fill="none" stroke="url(#gold)" stroke-width="3"/>
<path d="{head}" fill="url(#skin)" stroke="{INK}" stroke-width="4"/>
<path d="M76 62 C88 54 108 54 120 60" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35"/>
<path d="M60 112 C62 160 84 172 100 172 C116 172 138 160 140 112 C134 128 124 136 116 132 C108 128 92 128 84 132 C76 136 66 128 60 112 Z" fill="#1d1210" stroke="{INK}" stroke-width="3"/>
<path d="M68 96 q12 -8 26 -2 v6 q-12 -5 -26 2 Z M106 94 q14 -6 26 2 v6 q-14 -7 -26 -2 Z" fill="#1d1210"/>
<path d="M72 106 q10 -6 20 0 M108 106 q10 -6 20 0" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>
<path d="M100 104 q-9 16 -3 21 q6 3 12 0" fill="none" stroke="#5c3320" stroke-width="3.5" stroke-linecap="round"/>
<path d="M80 136 q20 18 40 0 q-20 6 -40 0 Z" fill="#fff" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<rect x="104" y="137" width="8" height="7" fill="url(#gold)"/>
<path d="M68 118 q6 3 10 0 M122 118 q6 3 10 0" stroke="#ff9a7a" stroke-width="5" stroke-linecap="round" opacity=".3"/>"""


def rico():
    return f"""
<path d="{TORSO}" fill="url(#cloth)" stroke="{INK}" stroke-width="4"/>
<g clip-path="url(#torsoclip)" fill="#ff4fae" stroke="{INK}" stroke-width="1.5">
  <g transform="translate(46 206)"><circle r="9"/><circle r="3" fill="#ffd36e"/></g>
  <g transform="translate(152 214)"><circle r="10"/><circle r="3" fill="#ffd36e"/></g>
  <g transform="translate(124 234)"><circle r="7"/><circle r="2.5" fill="#ffd36e"/></g>
</g>
<path d="M80 174 L100 214 L120 174 Z" fill="url(#skin)" stroke="{INK}" stroke-width="3"/>
<path d="M76 172 L66 196 L98 210 Z M124 172 L134 196 L102 210 Z" fill="#f7f1e3" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M84 178 Q100 206 116 178" fill="none" stroke="url(#gold)" stroke-width="3.5"/>
<path d="M95 199 l5 -6 5 6 -2 7 h-6 Z" fill="url(#gold)" stroke="{INK}" stroke-width="1.5"/>
{neck()}{ears(108)}
<path d="M62 92 C62 52 138 52 138 92 L136 122 C132 150 116 162 100 162 C84 162 68 150 64 122 Z" fill="url(#skin)" stroke="{INK}" stroke-width="4"/>
<path d="M70 132 C78 152 122 152 130 132 C124 158 76 158 70 132 Z" fill="#7b4a33" opacity=".35"/>
<path d="M58 92 C52 50 90 32 118 40 C140 44 150 66 142 92 C136 74 124 66 112 64 C96 74 74 72 66 90 Z" fill="#2a1622" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M108 44 C124 46 138 58 138 74" fill="none" stroke="#b9a8c4" stroke-width="5" stroke-linecap="round"/>
<path d="M70 90 q14 -8 26 -2 v5 q-12 -4 -26 2 Z M104 88 q12 -6 26 2 v5 q-14 -6 -26 -2 Z" fill="#2a1622"/>
<path d="M66 96 h32 q2 18 -14 20 q-16 0 -18 -20 Z" fill="url(#lens)" stroke="{INK}" stroke-width="3.5"/>
<path d="M102 96 h32 q-2 20 -18 20 q-16 -2 -14 -20 Z" fill="url(#lens)" stroke="{INK}" stroke-width="3.5"/>
<path d="M98 99 q2 -3 4 0" fill="none" stroke="{INK}" stroke-width="3"/><path d="M72 100 l10 0 M108 100 l10 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
<path d="M100 108 q-6 14 -2 18 q4 2 8 0" fill="none" stroke="#8a4d2e" stroke-width="3" stroke-linecap="round"/>
<path d="M80 132 q10 -8 20 -3 q10 -5 20 3 q-10 2 -20 -1 q-10 3 -20 1 Z" fill="#2a1622" stroke="{INK}" stroke-width="2"/>
<path d="M88 141 q14 6 26 -2" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<g transform="translate(100 18)"><path d="M-34 22 L-30 -8 L-14 8 L0 -16 L14 8 L30 -8 L34 22 Z" fill="url(#gold)" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="0" cy="8" r="4" fill="#ff2d9b"/></g>"""


# ---------------------------------------------------------------- scenes

def highway():
    lines = "".join(f'<path d="M500 640 L{x} 1000" stroke="#ff6fd0" stroke-width="3" opacity=".7"/>' for x in range(-400, 1500, 160))
    return f'<rect x="0" y="640" width="1000" height="360" fill="#14042a"/>{lines}<path d="M470 640 L530 640 L760 1000 L240 1000 Z" fill="#0c0218"/><path d="M500 660 V1000" stroke="#ffd36e" stroke-width="6" stroke-dasharray="30 30"/>{palm(120, 520, .8)}{palm(880, 540, .75, True)}'


def marina():
    masts = "".join(f'<path d="M{x} 690 V{460 + (x % 7) * 10} M{x} {480 + (x % 7) * 10} L{x + 60} 680" stroke="#12041c" stroke-width="5" fill="none"/>' for x in (90, 180, 820, 900))
    ripples = "".join(f'<path d="M{60 + i * 70} {720 + (i % 4) * 40} h40" stroke="#ffd36e" stroke-width="4" opacity=".5"/>' for i in range(13))
    return f'<rect x="0" y="690" width="1000" height="310" fill="#0c3a5c"/>{ripples}{masts}<path d="M40 690 h220 l-30 30 h-160 Z M760 690 h220 l-30 30 h-160 Z" fill="#12041c"/>{palm(930, 470, .7, True)}'


def swamp():
    trees = "".join(f'<path d="M{x} 1000 V{560 + (x % 5) * 20} M{x} {600 + (x % 5) * 20} q-60 -30 -110 0 M{x} {640 + (x % 5) * 20} q60 -30 110 0" stroke="#08130c" stroke-width="18" fill="none" stroke-linecap="round"/>' for x in (80, 210, 800, 930))
    return f'<rect x="0" y="720" width="1000" height="280" fill="#0b2a1f"/>{trees}<ellipse cx="500" cy="860" rx="420" ry="40" fill="#1b5c3a" opacity=".5"/><path d="M80 760 q40 -14 80 0 q40 14 80 0" stroke="#3ff0a0" stroke-width="4" fill="none" opacity=".5"/>'


def rays():
    beams = "".join(f'<path d="M500 430 L{500 + 900 * __import__("math").cos(a / 18 * 3.14159)} {430 - 900 * __import__("math").sin(a / 18 * 3.14159)} L{500 + 900 * __import__("math").cos((a + .5) / 18 * 3.14159)} {430 - 900 * __import__("math").sin((a + .5) / 18 * 3.14159)} Z" fill="#fff6c8" opacity=".16"/>' for a in range(0, 36))
    return f'{beams}{skyline("#2a0b10")}{palm(110, 500, .85)}{palm(890, 500, .85, True)}'


CHARACTERS = [
    {
        "file": "01-el-conductor.svg", "number": "001", "name": "EL CONDUCTOR", "rarity": "OG", "draw": conductor, "scene": highway,
        "sky": ("#2a0a4a", "#c414a8", "#ff8a3d"), "sun": ("#ffe36e", "#ff2d9b"), "skin": ("#c98a5c", "#e8b083"),
        "cloth": ("#ff2d9b", "#a10e6e"), "rim": ("#3ff0ff", "#ff2d9b"), "frame": "#ff2d9b",
    },
    {
        "file": "02-la-jefa.svg", "number": "128", "name": "LA JEFA", "rarity": "RARO", "draw": jefa, "scene": marina,
        "sky": ("#0d3b66", "#14a3a8", "#ffb26b"), "sun": ("#fff1a8", "#ff7a59"), "skin": ("#d99a6c", "#f1c39b"),
        "cloth": ("#f6f0e6", "#c9bfae"), "rim": ("#ff6fd0", "#3ff0ff"), "frame": "#3ff0ff",
    },
    {
        "file": "03-el-socio.svg", "number": "512", "name": "EL SOCIO", "rarity": "ÉPICO", "draw": socio, "scene": swamp,
        "sky": ("#1b0b3a", "#6a2cff", "#2bd17e"), "sun": ("#e8fff0", "#7affc1"), "skin": ("#7d4c30", "#a8694a"),
        "cloth": ("#ff8a3d", "#c4501a"), "rim": ("#7affc1", "#b26bff"), "frame": "#b26bff",
    },
    {
        "file": "04-rico.svg", "number": "999", "name": "RICO", "rarity": "LEGEND", "draw": rico, "scene": rays,
        "sky": ("#3a0a10", "#c4421a", "#ffd36e"), "sun": ("#fff6c8", "#ffb000"), "skin": ("#c97f4f", "#e3a170"),
        "cloth": ("#16c6b5", "#0b7d78"), "rim": ("#ffd36e", "#ff2d9b"), "frame": "#ffd36e",
    },
]


def render(c):
    scene_back = skyline() if c["scene"] is not rays else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-label="Mission Pass #{c['number']} · {c['name'].title()}">
<title>Ilustración original MISSION PASSED · Mission Pass #{c['number']} · {c['name'].title()}</title>
<desc>Personaje original de MISSION PASSED. No representa a ningún personaje de Rockstar Games.</desc>
{defs(c)}
<clipPath id="torsoclip"><path d="{TORSO}"/></clipPath>
<g clip-path="url(#card)">
  <rect width="1000" height="1000" fill="url(#sky)"/>
  <rect width="1000" height="700" fill="url(#dots)"/>
  {sun()}
  {scene_back}
  {c['scene']()}
  <g filter="url(#rim)" transform="translate(180 214) scale(3.2)">{c['draw']()}</g>
  <rect width="1000" height="1000" filter="url(#grain)" opacity=".09"/>
  <rect width="1000" height="1000" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="120" rx="60"/>
</g>
{frame(c, c['number'], c['name'], c['rarity'])}
</svg>
"""


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for character in CHARACTERS:
        (OUT / character["file"]).write_text(render(character), encoding="utf-8")
        print("wrote", OUT / character["file"])
