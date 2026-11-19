#!/usr/bin/env python3
"""Token logos for the character coins (one per Mission Pass character).

Writes public/tokens/<slug>.svg (1000x1000). Render to PNG for Pump.fun with:
    node scripts/render-token-logos.mjs
Reuses the original character drawings from generate-nft-art.py.
"""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("nft", ROOT / "scripts" / "generate-nft-art.py")
nft = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nft)

OUT = ROOT / "public" / "tokens"
TOKENS = json.loads((ROOT / "tokens" / "characters.json").read_text(encoding="utf-8"))["tokens"]
BY_NAME = {c["name"]: c for c in nft.CHARACTERS}


def rays(color):
    import math
    out = []
    for i in range(24):
        a, b = i / 24 * 2 * math.pi, (i + 0.5) / 24 * 2 * math.pi
        out.append(f'<path d="M500 470 L{500 + 900 * math.cos(a):.0f} {470 + 900 * math.sin(a):.0f} L{500 + 900 * math.cos(b):.0f} {470 + 900 * math.sin(b):.0f} Z"/>')
    return f'<g fill="{color}" opacity=".13">{"".join(out)}</g>'


def logo(token):
    c = BY_NAME[token["character"]]
    ticker = token["symbol"]
    size = 168 if len(ticker) <= 5 else 132 if len(ticker) <= 7 else 112
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-label="${ticker} · {token['name']}">
<title>Ilustración original MISSION PASSED · ${ticker}</title>
{nft.defs(c)}
<clipPath id="circle"><circle cx="500" cy="500" r="470"/></clipPath>
<clipPath id="torsoclip"><path d="{nft.TORSO}"/></clipPath>
<rect width="1000" height="1000" fill="{nft.INK}"/>
<g clip-path="url(#circle)">
  <rect width="1000" height="1000" fill="url(#sky)"/>
  {rays('#fff')}
  <rect width="1000" height="1000" fill="url(#dots)"/>
  {nft.sun(500, 430, 270)}
  {nft.palm(80, 560, .7)}{nft.palm(920, 560, .7, True)}
  <g filter="url(#rim)" transform="translate(170 150) scale(3.3)">{c['draw']()}</g>
  <rect y="690" width="1000" height="310" fill="{nft.INK}" opacity=".55"/>
</g>
<circle cx="500" cy="500" r="470" fill="none" stroke="{c['frame']}" stroke-width="22"/>
<circle cx="500" cy="500" r="446" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="4"/>
<text x="500" y="{860 if size > 120 else 845}" text-anchor="middle" font-family="MPAnton, Impact, 'Arial Black', sans-serif" font-size="{size}" letter-spacing="4"
  fill="#fff" stroke="{nft.INK}" stroke-width="16" paint-order="stroke">${ticker}</text>
</svg>
"""


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for token in TOKENS:
        (OUT / f"{token['slug']}.svg").write_text(logo(token), encoding="utf-8")
        print("wrote", OUT / f"{token['slug']}.svg")
