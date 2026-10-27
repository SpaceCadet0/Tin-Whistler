import { HOUSE_ACCENT, HOUSE_INK, lightPaper, paperOf, roundMarks, type Dot } from './palette'
import { recognizeTab, type RGBAImage, type RecognizedSystem } from './tabImage'
import { cropImage } from './videoFrames'

/**
 * A duet page: two whistles' tab lines on one page, each part in its own dot colour (say green low D
 * and brown high D). Lines in different colours stand one above the other and sound together, a
 * column of one over a column of the other; lines in one colour follow each other. The articulation
 * under a line is often printed in the other part's colour, so the page can't be split by colour:
 * each line is cut out as a band (ornament letters above, "+" and articulation below), its dots are
 * redrawn in the recogniser's ink and the band is read as an ordinary tab.
 */

type RGB = [number, number, number]

export interface DuetLine extends RecognizedSystem {
  /** The line's dot colour (the median of its filled dots). */
  colour: RGB
  /** Hue of that colour, degrees. */
  hue: number
}

/** Dots of a colour group must be at least this many to be a part (stray marks are not). */
const MIN_PART_DOTS = 12
/** Two dot colours are one part when their hues lie this close (degrees). */
const SAME_PART_HUE = 40
/** A new line starts where the dots of a part leave a vertical gap of this many dot sizes. */
const LINE_GAP = 2.5
/** A line's band reaches this many dot sizes above its top dot (ornament letters) and below its bottom one. */
const BAND_ABOVE = 3.5
const BAND_BELOW = 4

function hueOf([r, g, b]: RGB): number {
  const max = Math.max(r, g, b)
  const c = max - Math.min(r, g, b) || 1
  const h = max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4
  return h * 60
}
const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]

/** The page's dots grouped by colour: one group per part. */
function partsByColour(dots: Dot[]): Dot[][] {
  const groups: { hue: number; dots: Dot[] }[] = []
  for (const d of dots) {
    const hue = hueOf(d.colour)
    const g = groups.find((x) => hueDistance(x.hue, hue) < SAME_PART_HUE)
    if (g) g.dots.push(d)
    else groups.push({ hue, dots: [d] })
  }
  return groups.filter((g) => g.dots.length >= MIN_PART_DOTS).map((g) => g.dots)
}

/** A part's dots split into lines where they leave a wide vertical gap. */
function linesOf(dots: Dot[], size: number): Dot[][] {
  const sorted = [...dots].sort((a, b) => a.y0 - b.y0)
  const lines: Dot[][] = [[]]
  let bottom = -Infinity
  for (const d of sorted) {
    if (lines[lines.length - 1].length && d.y0 - bottom > size * LINE_GAP) lines.push([])
    lines[lines.length - 1].push(d)
    bottom = Math.max(bottom, d.y1)
  }
  return lines
}

/** A mark is red (ornament letters and rings) when red leads the other channels by this factor. */
const RED_LEAD = 2

const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const isRed = (c: RGB) => c[0] > c[1] * RED_LEAD && c[0] > c[2] * RED_LEAD
/** A red pixel this far from the paper is the accent's own colour, not its blend with the paper. */
const ACCENT_CORE = 100

/** The ornament colour: the median of the page's clearly red pixels (dark red, crimson...). */
function accentOf(img: RGBAImage, paper: RGB): RGB | null {
  const reds: RGB[] = []
  for (let p = 0; p < img.data.length; p += 4) {
    const c: RGB = [img.data[p], img.data[p + 1], img.data[p + 2]]
    if (isRed(c) && dist(c, paper) > ACCENT_CORE) reds.push(c)
  }
  return reds.length ? ([0, 1, 2].map((k) => median(reds.map((c) => c[k]))) as RGB) : null
}

/** Where a colour lies on the line from the paper to `to`: how far along (0…1) and how far off it. */
function onLine(c: RGB, paper: RGB, to: RGB): { t: number; off: number } {
  const v = [0, 1, 2].map((k) => to[k] - paper[k])
  const len2 = v.reduce((a, x) => a + x * x, 0) || 1
  const t = Math.max(0, Math.min(1, [0, 1, 2].reduce((a, k) => a + (c[k] - paper[k]) * v[k], 0) / len2))
  return { t, off: dist(c, [0, 1, 2].map((k) => paper[k] + v[k] * t) as RGB) }
}
/** A pixel belongs to a colour when it lies this close (RGB distance) to the line from the paper to it. */
const ON_COLOUR = 45
/** Ornament red is told from a brown part by hue: within this many degrees of the accent's, and tinted. */
const ACCENT_HUE = 10
const ACCENT_TINT = 15
/** ...and at least this far along it (fainter than that is paper). */
const MIN_SHADE = 0.12

/**
 * A band in the recogniser's house colours. Every part's colour becomes ink, the line's dots and the
 * text under it alike (it is printed in either part's colour); the ornament red (letters and rings)
 * becomes house red. A pixel goes with the colour whose line from the paper it lies on, anti-aliased
 * edges included, and keeps its shade, so letters keep their exact shapes.
 */
function inHouseColours(band: RGBAImage, paper: RGB, partColours: RGB[], accent: RGB | null): RGBAImage {
  const out = new Uint8Array(band.data)
  const accentHue = accent ? hueOf(accent) : 0
  for (let p = 0; p < out.length; p += 4) {
    const c: RGB = [out[p], out[p + 1], out[p + 2]]
    // a red edge is as red in hue as the core; a brown dot's edge is not
    if (accent && Math.max(...c) - Math.min(...c) >= ACCENT_TINT && hueDistance(hueOf(c), accentHue) < ACCENT_HUE) {
      const l = onLine(c, paper, accent)
      for (let k = 0; k < 3; k++) out[p + k] = Math.round(255 + (HOUSE_ACCENT[k] - 255) * l.t)
      continue
    }
    let best: { t: number; off: number; house: RGB } | null = null
    for (const tg of partColours.map((colour) => ({ colour, house: HOUSE_INK }))) {
      const l = onLine(c, paper, tg.colour)
      if (l.t >= MIN_SHADE && l.off < ON_COLOUR && (!best || l.off < best.off)) best = { ...l, house: tg.house }
    }
    if (!best) continue
    for (let k = 0; k < 3; k++) out[p + k] = Math.round(255 + (best.house[k] - 255) * best.t)
  }
  return { width: band.width, height: band.height, data: out }
}

/** Every tab line of a duet page, top to bottom, read on its own with its dot colour. */
export function readDuetPage(source: RGBAImage): DuetLine[] {
  const img = lightPaper(source)
  const paper = paperOf(img)
  const dots = roundMarks(img, paper)
  if (!dots.length) return []
  const size = median(dots.map((d) => d.x1 - d.x0 + 1))
  const parts = partsByColour(dots)
  const partColours = parts.map((ds) => [0, 1, 2].map((k) => median(ds.map((d) => d.colour[k]))) as RGB)
  const accent = accentOf(img, paper)
  const lines = parts
    .flatMap((group) => linesOf(group, size))
    .map((ds) => ({ dots: ds, top: Math.min(...ds.map((d) => d.y0)), bottom: Math.max(...ds.map((d) => d.y1)) }))
    .sort((a, b) => a.top - b.top)
  return lines.flatMap((line, i): DuetLine[] => {
    // the band stops halfway to the neighbouring lines
    const above = i > 0 ? (lines[i - 1].bottom + line.top) / 2 : 0
    const below = i + 1 < lines.length ? (line.bottom + lines[i + 1].top) / 2 : img.height
    const y = Math.max(0, Math.floor(Math.max(above, line.top - size * BAND_ABOVE)))
    const y1 = Math.min(img.height, Math.ceil(Math.min(below, line.bottom + size * BAND_BELOW)))
    const band = inHouseColours(cropImage(img, { x: 0, y, width: img.width, height: y1 - y }), paper, partColours, accent)
    const r = recognizeTab(band, 'D')
    const colour = [0, 1, 2].map((k) => median(line.dots.map((d) => d.colour[k]))) as RGB
    return r.systems.map((s) => ({ ...s, top: s.top + y, bottom: s.bottom + y, colour, hue: hueOf(colour) }))
  })
}
