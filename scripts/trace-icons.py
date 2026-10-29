"""
Cuts the hand-drawn icon sheet (scripts/icons-sheet.png) into icons, traces each to an SVG outline and
writes src/ui/icons/*.svg plus src/ui/icons/paths.ts, which the Icon component draws.

Needs numpy, scipy, pillow and potracer:  pip install --target /tmp/py potracer
Run:  PYTHONPATH=/tmp/py python3 scripts/trace-icons.py
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

import potrace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'scripts', 'icons-sheet.png')
OUT = os.path.join(ROOT, 'src', 'ui', 'icons')

# icon box on the sheet, in sheet pixels: the drawings stand at one scale, so every icon keeps it
BOX = 120
# traced at this many times the sheet's resolution, for smooth curves
UP = 4
# strokes thickened by this many sheet pixels, to stand as heavy as the old icons at 22 px
GROW = 1

# icons the app draws filled (the active tab, a favourite, the streak): these also get a silhouette
FILLED = {'home', 'book', 'target', 'music', 'chart', 'flame', 'star', 'heart'}

# the sheet's rows, left to right; extra-* = drawings the app has no use for yet
SHEET_ROWS = [
    ['next', 'chart', 'back', 'play', 'caret', 'calendar', 'extra-clover', 'check'],
    ['copy', 'cut', 'down', 'download', 'book', 'edit', 'fast', 'eye'],
    ['file', 'gamepad', 'pause', 'stop', 'heart', 'trophy', 'extra-tin', 'image'],
    ['info', 'headphones', 'keyboard', 'ladder', 'home', 'menu', 'whistle', 'micOff'],
    ['minus', 'flame', 'mic', 'record', 'ear', 'paste', 'metronome', 'music'],
    ['plus', 'x', 'star', 'redo', 'hand', 'slow', 'extra-snail', 'sparkles'],
    ['split', 'settings', 'target', 'loop', 'repeat', 'timer', 'trash', 'tuner'],
    ['undo', 'up'],
]


def runs(mask, gap=30):
    """Start and end of each run of True, runs closer than `gap` merged (the pause sign's two bars)."""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        if not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    merged = [out[0]]
    for a, b in out[1:]:
        if a - merged[-1][1] < gap:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    return merged


def load():
    im = Image.open(SHEET)
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    bg.alpha_composite(im.convert('RGBA'))
    return np.array(bg.convert('L')).astype(float)


def cells(gray):
    """(name, BOX square centred on the drawing) for every drawing on the sheet."""
    ink = gray < 140
    rows = runs(ink.sum(1) > 0)
    assert len(rows) == len(SHEET_ROWS), f'sheet has {len(rows)} rows'
    h = BOX // 2
    for (y0, y1), names in zip(rows, SHEET_ROWS):
        cols = runs(ink[y0:y1].sum(0) > 0)
        assert len(cols) == len(names), f'row at {y0} has {len(cols)} icons'
        for (x0, x1), name in zip(cols, names):
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            # only this drawing: a neighbour's edge may reach into the square
            only = np.full_like(gray, 255.0)
            only[y0:y1, x0:x1] = gray[y0:y1, x0:x1]
            yield name, np.pad(only, h, constant_values=255.0)[cy:cy + BOX, cx:cx + BOX]


def ink_of(box):
    """The drawing as a mask at UP times the size, strokes grown by GROW."""
    big = np.array(Image.fromarray(box.astype(np.uint8)).resize((BOX * UP, BOX * UP), Image.LANCZOS)).astype(float)
    ink = big < 128
    if GROW:
        r = GROW * UP
        yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
        ink = ndimage.binary_dilation(ink, structure=(xx * xx + yy * yy) <= r * r)
    return ink


def path_d(ink):
    """The mask traced to an SVG path in BOX units (even-odd: holes alternate)."""
    curves = potrace.Bitmap(~ink).trace(turdsize=8 * UP, alphamax=1.0, opttolerance=0.4)
    f = lambda p: f'{p.x / UP:.1f} {p.y / UP:.1f}'
    parts = []
    for c in curves:
        parts.append(f'M{f(c.start_point)}')
        for s in c.segments:
            if s.is_corner:
                parts.append(f'L{f(s.c)}L{f(s.end_point)}')
            else:
                parts.append(f'C{f(s.c1)} {f(s.c2)} {f(s.end_point)}')
        parts.append('Z')
    return ''.join(parts)


def upload_from(box):
    """The download tray with its arrow turned to point up out of it."""
    ink = box < 140
    labels, n = ndimage.label(ndimage.binary_dilation(ink, iterations=1))
    # the arrow is the drawing that starts highest; the tray is the rest
    tops = {k: np.argwhere(labels == k)[:, 0].min() for k in range(1, n + 1)}
    arrow = labels == min(tops, key=tops.get)
    ys = np.nonzero(arrow.any(1))[0]
    y0, y1 = ys.min(), ys.max() + 1
    out = np.where(arrow, 255.0, box)
    band = out[y0:y1]
    out[y0:y1] = np.where(arrow[y0:y1][::-1], box[y0:y1][::-1], band)
    return out


def main():
    gray = load()
    os.makedirs(OUT, exist_ok=True)
    found = dict(cells(gray))
    # the sheet's thin cross, turned, is the close mark
    found['x'] = ndimage.rotate(found['x'], 45, reshape=False, cval=255.0, order=1)
    found['upload'] = upload_from(found['download'])
    lines = []
    for name in sorted(found):
        ink = ink_of(found[name])
        d = path_d(ink)
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BOX} {BOX}" fill="currentColor">'
            f'<path fill-rule="evenodd" d="{d}"/></svg>\n'
        )
        with open(os.path.join(OUT, f'{name}.svg'), 'w') as fh:
            fh.write(svg)
        if not name.startswith('extra-'):
            fill = f", fill: '{path_d(ndimage.binary_fill_holes(ink))}'" if name in FILLED else ''
            lines.append(f"  {name}: {{ d: '{d}'{fill} }},")
    with open(os.path.join(OUT, 'paths.ts'), 'w') as fh:
        fh.write('// Generated by scripts/trace-icons.py from scripts/icons-sheet.png. Do not edit.\n\n')
        fh.write(f'/** Box the outlines are drawn in. */\nexport const ICON_BOX = {BOX}\n\n')
        fh.write('/** Hand-drawn icons: `d` the drawing (even-odd), `fill` its silhouette, for the filled look. */\n')
        fh.write('export const ICON_PATHS: Record<string, { d: string; fill?: string }> = {\n')
        fh.write('\n'.join(lines) + '\n}\n')
    print(f'{len(found)} icons -> {OUT}', file=sys.stderr)


if __name__ == '__main__':
    main()
