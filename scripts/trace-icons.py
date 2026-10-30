"""
Cuts the hand-drawn icon sheets (scripts/icons-sheet.png, icons-sheet-2.png) into icons, traces each to an SVG outline and
adds the single drawings in scripts/icons-extra, and writes src/ui/icons/*.svg plus src/ui/icons/paths.ts, which the Icon component draws.

Needs numpy, scipy, pillow and potracer:  pip install --target /tmp/py potracer
Run:  PYTHONPATH=/tmp/py python3 scripts/trace-icons.py
"""
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

import potrace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'scripts', 'icons-sheet.png')
# the achievements sheet: drawn larger and lighter, so scaled down and its strokes brought to the first sheet's
SHEET2 = os.path.join(ROOT, 'scripts', 'icons-sheet-2.png')
# share of its size the second sheet is drawn at, for its drawings to stand as tall as the first's
SHEET2_SCALE = 0.58
# its strokes, as a share of the first sheet's thickness, for its icons to stand as heavy as the first's
SHEET2_WEIGHT = 0.55
OUT = os.path.join(ROOT, 'src', 'ui', 'icons')
# single drawings outside the sheet, one per file, named for the icon: a picture (traced like the sheet's)
# or a finished SVG in the 120 box with one even-odd path (taken as it is)
EXTRA = os.path.join(ROOT, 'scripts', 'icons-extra')

# icon box on the sheet, in sheet pixels: the drawings stand at one scale, so every icon keeps it
BOX = 120
# traced at this many times the sheet's resolution, for smooth curves
UP = 4
# a single drawing is scaled to stand this tall or wide, as the sheet's do
SIZE = 96
# single drawings stand a little lighter than the sheet's: their strokes are this share of its thickness
EXTRA_WEIGHT = 0.8
# strokes thickened by this many sheet pixels, to stand as heavy as the old icons at 22 px
GROW = 1

# icons the app draws filled (the active tab, a favourite, the streak): these also get a silhouette
FILLED = {'home', 'book', 'target', 'music', 'chart', 'flame', 'star', 'heart'}

# the sheet's rows, left to right; extra-* = drawings the app has no use for yet
SHEET_ROWS = [
    ['next', 'chart', 'back', 'play', 'caret', 'calendar', 'clover', 'check'],
    ['copy', 'cut', 'down', 'download', 'book', 'edit', 'fast', 'eye'],
    ['file', 'gamepad', 'pause', 'stop', 'heart', 'trophy', 'tin', 'image'],
    ['info', 'headphones', 'keyboard', 'ladder', 'home', 'menu', 'whistle', 'micOff'],
    ['minus', 'flame', 'mic', 'record', 'ear', 'paste', 'metronome', 'music'],
    ['plus', 'x', 'star', 'redo', 'hand', 'hourglass', 'slow', 'sparkles'],
    ['split', 'settings', 'target', 'repeat', 'loop', 'timer', 'trash', 'tuner'],
    ['undo', 'up'],
]

# the second sheet's rows; None = a drawing the app has no use for
SHEET2_ROWS = [
    ['composer', 'bonfire', None, None, None, None],
    ['diamond', 'duet', 'hare', None, None, None],
    ['medal', None, 'combo', 'note', 'collection', None],
    ['owl', None, 'peak', 'scores', 'start', None],
    [None, None, None, None, None, None],
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


def load(path=SHEET):
    im = Image.open(path)
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    bg.alpha_composite(im.convert('RGBA'))
    return np.array(bg.convert('L')).astype(float)


def cells(gray, sheet_rows=SHEET_ROWS, box=BOX):
    """(name, `box` square centred on the drawing) for every named drawing on the sheet."""
    ink = gray < 140
    rows = runs(ink.sum(1) > 0)
    assert len(rows) == len(sheet_rows), f'sheet has {len(rows)} rows'
    h = box // 2
    for (y0, y1), names in zip(rows, sheet_rows):
        cols = runs(ink[y0:y1].sum(0) > 0)
        assert len(cols) == len(names), f'row at {y0} has {len(cols)} icons'
        for (x0, x1), name in zip(cols, names):
            if name is None:
                continue
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            # only this drawing: a neighbour's edge may reach into the square
            only = np.full_like(gray, 255.0)
            only[y0:y1, x0:x1] = gray[y0:y1, x0:x1]
            yield name, np.pad(only, h, constant_values=255.0)[cy:cy + box, cx:cx + box]


def ink_of(box):
    """The drawing as a mask at UP times the size, strokes grown by GROW."""
    big = np.array(Image.fromarray(box.astype(np.uint8)).resize((BOX * UP, BOX * UP), Image.LANCZOS)).astype(float)
    return grow(big < 128, GROW * UP)


def disk(r):
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    return (xx * xx + yy * yy) <= r * r


def grow(ink, r):
    return ndimage.binary_dilation(ink, structure=disk(r)) if r > 0 else ink


def half_width(ink):
    """Typical half thickness of the strokes, in mask pixels."""
    d = ndimage.distance_transform_edt(ink)
    return float(np.median(ndimage.maximum_filter(d, 3)[ink]))


# half thickness (mask pixels) of the core a single drawing's strokes are thinned to
CORE = 2


def restroke(ink, target):
    """Thinned to a core and grown back `target` half thick: every stroke gets one thickness and a round end,
    even where the picture's edge cut it off flat."""
    core = ndimage.binary_erosion(ink, structure=disk(max(0, round(half_width(ink)) - CORE)))
    return grow(core, round(target) - CORE)


def sheet2_ink(box, target):
    """A drawing from the second sheet at the first sheet's scale and stroke."""
    big = Image.fromarray(box.astype(np.uint8)).resize((BOX * UP, BOX * UP), Image.LANCZOS)
    return grow(restroke(np.array(big) < 128, target * SHEET2_WEIGHT), GROW * UP)


def extra_ink(path, target):
    """A single drawing (dark or opaque on clear) scaled to SIZE, its strokes made `target` half thick."""
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    gray = np.array(bg.convert('L'))
    ys, xs = np.nonzero(gray < 128)
    crop = Image.fromarray(gray[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    k = SIZE * UP / max(crop.size)
    w, h = round(crop.width * k), round(crop.height * k)
    ink = restroke(np.array(crop.resize((w, h), Image.LANCZOS)) < 128, target * EXTRA_WEIGHT)
    out = np.zeros((BOX * UP, BOX * UP), dtype=bool)
    y0, x0 = (BOX * UP - h) // 2, (BOX * UP - w) // 2
    out[y0:y0 + h, x0:x0 + w] = ink
    return grow(out, GROW * UP)


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


def svg_path(path):
    """The one path of a finished SVG drawn in the BOX square."""
    text = open(path).read()
    assert f'viewBox="0 0 {BOX} {BOX}"' in text, f'{path} is not drawn in the {BOX} box'
    paths = re.findall(r'<path[^>]*\sd="([^"]+)"', text)
    assert len(paths) == 1, f'{path} has {len(paths)} paths, one is expected'
    return ' '.join(paths[0].split())


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
    found = {name: ink_of(box) for name, box in found.items()}
    # single drawings take the sheet's stroke (before the common GROW)
    target = half_width(gray < 128) * UP
    box2 = round(BOX / SHEET2_SCALE)
    for name, box in cells(load(SHEET2), SHEET2_ROWS, box2):
        found[name] = sheet2_ink(box, target)
    drawn = {}
    for file in sorted(os.listdir(EXTRA)):
        name, ext = os.path.splitext(file)
        if ext == '.svg':
            drawn[name] = svg_path(os.path.join(EXTRA, file))
        else:
            found[name] = extra_ink(os.path.join(EXTRA, file), target)
    assert not FILLED & drawn.keys(), 'a finished SVG has no silhouette for the filled look'
    lines = []
    for name in sorted(found.keys() | drawn.keys()):
        d = drawn[name] if name in drawn else path_d(found[name])
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BOX} {BOX}" fill="currentColor">'
            f'<path fill-rule="evenodd" d="{d}"/></svg>\n'
        )
        with open(os.path.join(OUT, f'{name}.svg'), 'w') as fh:
            fh.write(svg)
        if not name.startswith('extra-'):
            fill = f", fill: '{path_d(ndimage.binary_fill_holes(found[name]))}'" if name in FILLED else ''
            lines.append(f"  {name}: {{ d: '{d}'{fill} }},")
    with open(os.path.join(OUT, 'paths.ts'), 'w') as fh:
        fh.write('// Generated by scripts/trace-icons.py from scripts/icons-sheet*.png. Do not edit.\n\n')
        fh.write(f'/** Box the outlines are drawn in. */\nexport const ICON_BOX = {BOX}\n\n')
        fh.write('/** Hand-drawn icons: `d` the drawing (even-odd), `fill` its silhouette, for the filled look. */\n')
        fh.write('export const ICON_PATHS: Record<string, { d: string; fill?: string }> = {\n')
        fh.write('\n'.join(lines) + '\n}\n')
    print(f'{len(found) + len(drawn)} icons -> {OUT}', file=sys.stderr)


if __name__ == '__main__':
    main()
