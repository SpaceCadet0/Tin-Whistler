import type { RGBAImage } from './tabImage'

/**
 * Tabs come in any colours: navy dots and crimson ornaments, green dots and brown text, light marks
 * on a dark page... The recogniser reads dots and text by darkness and shape, but ornament letters
 * and rings by their red. So each page's colours are judged by their role on that page rather than
 * by fixed thresholds:
 *  - paper: the most common colour (a dark page is flipped first);
 *  - ink: the most common colour of the marks (the dots outnumber everything else);
 *  - accent: the most common clearly different, saturated mark colour: ornament letters and rings.
 */

export const HOUSE_INK: [number, number, number] = [30, 40, 90]
export const HOUSE_ACCENT: [number, number, number] = [205, 25, 25]

type RGB = [number, number, number]

/** A pixel counts as a mark when it is this far (RGB distance) from the paper: tab marks are bold, pale
 * background pictures (mountains behind the page) are not. */
const MARK_DISTANCE = 120
/** A pixel follows a colour when it lies this close to the line from the paper to that colour. */
const ON_LINE = 60
/** Closer still for the dots' colour, so text in a nearby colour keeps its own. */
const ON_INK_LINE = 30
/** An accent must be this far from the paper–ink line and this saturated, and this common among marks. */
const ACCENT_DISTANCE = 90
const ACCENT_CHROMA = 60
const ACCENT_SHARE = 0.004
/** Share of the expected saturation a pixel needs to count as a shade of the accent. */
const ACCENT_SHADE = 0.6

const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const chroma = (c: RGB) => Math.max(...c) - Math.min(...c)

/** Where c sits on the way from `from` to `to` (0…1), and how far it is from that line. */
function alongLine(c: RGB, from: RGB, to: RGB): { t: number; off: number } {
  const v: RGB = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  const len2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2] || 1
  const t = Math.min(1, Math.max(0, ((c[0] - from[0]) * v[0] + (c[1] - from[1]) * v[1] + (c[2] - from[2]) * v[2]) / len2))
  return { t, off: dist(c, [from[0] + v[0] * t, from[1] + v[1] * t, from[2] + v[2] * t]) }
}

/** Colour histogram in 8-level steps per channel: the centre colour of the busiest bins. */
function busiest(img: RGBAImage, keep: (c: RGB) => boolean): { color: RGB; count: number }[] {
  const bins = new Map<number, number>()
  const d = img.data
  for (let p = 0; p < d.length; p += 4) {
    const c: RGB = [d[p], d[p + 1], d[p + 2]]
    if (!keep(c)) continue
    const key = ((d[p] >> 3) << 10) | ((d[p + 1] >> 3) << 5) | (d[p + 2] >> 3)
    bins.set(key, (bins.get(key) ?? 0) + 1)
  }
  return [...bins.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ color: [((key >> 10) << 3) + 4, (((key >> 5) & 31) << 3) + 4, ((key & 31) << 3) + 4] as RGB, count }))
}

export interface Palette {
  paper: RGB
  ink: RGB
  accent: RGB | null
}

/** Hue in 0…HUE_BINS-1 (anti-aliased shades of one colour keep their hue). */
const HUE_BINS = 24
function hueBin([r, g, b]: RGB): number {
  const max = Math.max(r, g, b)
  const c = max - Math.min(r, g, b) || 1
  const h = max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4
  return Math.floor((h / 6) * HUE_BINS) % HUE_BINS
}

/** Round, filled blobs of mark pixels this many or more: the tab's covered holes. */
const MIN_DOTS = 12

export interface Dot {
  x0: number
  y0: number
  x1: number
  y1: number
  colour: RGB
}

/** Round, filled blobs of marks (anything clearly unlike the paper): the tab's covered holes. */
export function roundMarks(img: RGBAImage, paper: RGB): Dot[] {
  const { width: W, height: H, data: d } = img
  const mark = new Uint8Array(W * H)
  for (let p = 0, i = 0; i < W * H; i++, p += 4) mark[i] = dist([d[p], d[p + 1], d[p + 2]], paper) > MARK_DISTANCE ? 1 : 0
  const seen = new Uint8Array(W * H)
  const dots: Dot[] = []
  const stack: number[] = []
  for (let start = 0; start < W * H; start++) {
    if (!mark[start] || seen[start]) continue
    seen[start] = 1
    stack.push(start)
    let n = 0
    let x0 = W
    let x1 = 0
    let y0 = H
    let y1 = 0
    const sum = [0, 0, 0]
    while (stack.length) {
      const i = stack.pop()!
      const x = i % W
      const y = (i - x) / W
      n++
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
      for (let k = 0; k < 3; k++) sum[k] += d[i * 4 + k]
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || seen[j] || !mark[j] || Math.abs((j % W) - x) > 1) continue
        seen[j] = 1
        stack.push(j)
      }
    }
    const w = x1 - x0 + 1
    const h = y1 - y0 + 1
    if (w >= 6 && h >= 6 && w / h > 0.75 && w / h < 1.33 && n / (w * h) > 0.55 && w < W / 20) dots.push({ x0, y0, x1, y1, colour: sum.map((v) => v / n) as RGB })
  }
  return dots
}

function dotColour(img: RGBAImage, paper: RGB): RGB | null {
  const colours = roundMarks(img, paper).map((d) => d.colour)
  if (colours.length < MIN_DOTS) return null
  return [0, 1, 2].map((k) => colours.map((c) => c[k]).sort((a, b) => a - b)[colours.length >> 1]) as RGB
}

export function findPalette(img: RGBAImage): Palette {
  const paper = busiest(img, () => true)[0].color
  const marks = busiest(img, (c) => dist(c, paper) > MARK_DISTANCE)
  if (!marks.length) return { paper, ink: [0, 0, 0], accent: null }
  // the dots: the median colour of the round, filled marks (pictures behind the page can outweigh
  // a short tab by area, but not by number of dots); the busiest mark colour if there are none
  const ink = dotColour(img, paper) ?? marks[0].color
  const total = marks.reduce((a, m) => a + m.count, 0)
  // accent candidates: saturated, clearly off the paper–ink line; one hue wins (its shades spread
  // over many histogram bins, so they are pooled by hue)
  const byHue = new Map<number, { color: RGB; count: number }[]>()
  for (const m of marks) {
    if (chroma(m.color) < ACCENT_CHROMA || alongLine(m.color, paper, ink).off < ACCENT_DISTANCE) continue
    const h = hueBin(m.color)
    byHue.set(h, [...(byHue.get(h) ?? []), m])
  }
  const pooled = (h: number) => [-1, 0, 1].flatMap((dh) => byHue.get((h + dh + HUE_BINS) % HUE_BINS) ?? [])
  let best: { color: RGB; count: number }[] = []
  let bestCount = 0
  for (const h of byHue.keys()) {
    const group = pooled(h)
    const n = group.reduce((a, m) => a + m.count, 0)
    if (n > bestCount) {
      bestCount = n
      best = group
    }
  }
  if (bestCount < total * ACCENT_SHARE) return { paper, ink, accent: null }
  // the most saturated quarter of the group: the mark's own colour, not its blend with the paper
  const sorted = [...best].sort((a, b) => dist(b.color, paper) - dist(a.color, paper))
  let acc = 0
  const core: { color: RGB; count: number }[] = []
  for (const m of sorted) {
    core.push(m)
    acc += m.count
    if (acc >= bestCount / 4) break
  }
  const accent = [0, 1, 2].map((k) => Math.round(core.reduce((a, m) => a + m.color[k] * m.count, 0) / acc)) as RGB
  return { paper, ink, accent }
}

/** Mirrors the recogniser's ink: dark, or a dark-to-mid blue. */
const inkLike = (c: RGB) => {
  const [r, , b] = c
  const lum = luminance(c)
  return (lum < 90 && Math.max(...c) < 160) || (lum < 115 && b >= r - 10) || (b - r > 40 && r < 140)
}

/** Red is the strongest channel: the recogniser takes such shades for red unless they are ink-dark. */
const reddish = ([r, g, b]: RGB) => r > g && r > b
/** As dark as the recogniser's ink, whatever the tint. */
const inkDark = (c: RGB) => luminance(c) < 90 && Math.max(...c) < 160

export const paperOf = (img: RGBAImage): RGB => busiest(img, () => true)[0].color

const luminance = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

/** Light marks on a dark page (a dark theme): flip it to dark marks on light paper. */
export function lightPaper(img: RGBAImage): RGBAImage {
  if (luminance(busiest(img, () => true)[0].color) >= 128) return img
  const out = new Uint8Array(img.data.length)
  for (let p = 0; p < out.length; p += 4) {
    out[p] = 255 - img.data[p]
    out[p + 1] = 255 - img.data[p + 1]
    out[p + 2] = 255 - img.data[p + 2]
    out[p + 3] = 255
  }
  return { width: img.width, height: img.height, data: out }
}

/**
 * Bring a page into the recogniser's house style: a dark page is flipped to light paper, dots in a
 * colour the recogniser wouldn't take for ink become house ink, and the accent colour (ornament
 * letters and rings, whatever their hue) becomes house red. What it already reads right (dark or blue
 * dots, red or brownish letters, text in other colours) is left exactly as drawn.
 */
export function toHouseColours(source: RGBAImage): RGBAImage {
  const img = lightPaper(source)
  const { paper, ink, accent } = findPalette(img)
  const out = new Uint8Array(img.data)
  const accentChroma = accent ? chroma(accent) - chroma(paper) : 0
  for (let p = 0; p < out.length; p += 4) {
    const c: RGB = [out[p], out[p + 1], out[p + 2]]
    // dots in a colour the recogniser doesn't take for ink (orange, light...): its shades become house ink
    const toInk = alongLine(c, paper, ink)
    if (toInk.off < ON_INK_LINE && !inkLike(c)) {
      for (let k = 0; k < 3; k++) out[p + k] = Math.round(255 + (HOUSE_INK[k] - 255) * toInk.t)
      continue
    }
    if (!accent) continue
    const toAccent = alongLine(c, paper, accent)
    // the accent's shades are as saturated as the accent mixed with that much paper; a dull brown
    // or grey (text) that happens to lie near the same line is not
    if (toAccent.off >= ON_LINE || toAccent.off >= alongLine(c, paper, ink).off || chroma(c) < accentChroma * toAccent.t * ACCENT_SHADE) continue
    // reddish and not dark: the recogniser reads it as red already (letters keep their exact shape)
    if (reddish(c) && !inkDark(c)) continue
    for (let k = 0; k < 3; k++) out[p + k] = Math.round(255 + (HOUSE_ACCENT[k] - 255) * toAccent.t)
  }
  return { width: img.width, height: img.height, data: out }
}
