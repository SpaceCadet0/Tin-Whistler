import { fingeringsEqual, toFingering } from '../music/fingerings'
import type { Attack, Fingering, HoleState, OrnamentType, Phrase, Register, TuneNote, TuneSection } from '../music/types'
import { fingeringForMidi, midiForFingering } from '../music/whistles'

/**
 * Whistle-tab image recognition (dot-style tabs, like the reference screenshots):
 *  1. classify pixels (ink / red / light grey),
 *  2. find filled dots → dot size, 6-row "systems" and note columns,
 *  3. sample every hole (covered / open / half), rings (ornament finger), "+" (high octave),
 *  4. read red ornament letters above (C/B/S) and articulation below (t, r, -, i),
 *  5. group columns into phrases by spacing.
 * Pure function over RGBA pixels, so it runs in a worker, the page or Node tests.
 */

export interface RGBAImage {
  width: number
  height: number
  data: Uint8ClampedArray | Uint8Array
}

export interface RecognizedColumn {
  x: number
  fingering: Fingering
  register: Register
  ringHole?: number
  ornament?: OrnamentType
  attack?: Attack
  stop?: boolean
  pitch: number
  /** 0…1 how sure we are about the hole states. */
  confidence: number
  /** A "+" octave mark was found under the column. */
  plus?: boolean
}

export interface RecognizedSystem {
  top: number
  bottom: number
  columns: RecognizedColumn[]
  phraseBreaks: number[]
}

export interface RecognitionResult {
  systems: RecognizedSystem[]
  dotSize: number
  warnings: string[]
}

interface Blob {
  x0: number
  y0: number
  x1: number
  y1: number
  n: number
  cx: number
  cy: number
}

type Mask = Uint8Array

/** Luminance and brightest channel below which a pixel is ink regardless of hue. */
const DARK_INK_LUM = 90
const DARK_INK_MAX = 160

function makeMasks(img: RGBAImage) {
  const { width: W, height: H, data } = img
  const ink = new Uint8Array(W * H)
  const inkLight = new Uint8Array(W * H)
  const red = new Uint8Array(W * H)
  const redLoose = new Uint8Array(W * H)
  const grey = new Uint8Array(W * H)
  // dark regardless of hue: text with coloured (sub-pixel) fringes still forms whole strokes
  const dark = new Uint8Array(W * H)
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    dark[i] = lum < 115 && !(r > 130 && r - g > 55 && r - b > 35) ? 1 : 0
    // very dark marks are ink whatever their tint (near-black maroon on salmon paper, its
    // anti-aliased edge); bright red ornament letters and rings stay out of this
    if (lum < DARK_INK_LUM && Math.max(r, g, b) < DARK_INK_MAX) {
      ink[i] = 1
      inkLight[i] = 1
      continue
    }
    const isRed = r > 130 && r - g > 55 && r - b > 35
    red[i] = isRed ? 1 : 0
    redLoose[i] = r > 110 && r - g > 30 && r - b > 20 ? 1 : 0
    if (isRed || redLoose[i]) continue
    // dark blue / black ink
    ink[i] = (lum < 115 && b >= r - 10) || (b - r > 40 && r < 140) ? 1 : 0
    inkLight[i] = (lum < 175 && b >= r - 10) || (b - r > 25 && r < 205) ? 1 : 0
    grey[i] = lum < 232 && lum > 90 && Math.abs(r - g) < 40 && Math.abs(g - b) < 45 ? 1 : 0
  }
  return { ink, inkLight, red, redLetters: dilate(redLoose, W, H), grey, dark }
}

/** 3×3 dilation, glues anti-aliased letter fragments back together. */
function dilate(m: Mask, W: number, H: number): Mask {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1
        }
    }
  return out
}

function components(mask: Mask, W: number, H: number, minPixels = 4): Blob[] {
  const seen = new Uint8Array(W * H)
  const out: Blob[] = []
  const stack: number[] = []
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || seen[start]) continue
    let x0 = W
    let y0 = H
    let x1 = 0
    let y1 = 0
    let n = 0
    let sx = 0
    let sy = 0
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      const x = i % W
      const y = (i / W) | 0
      n++
      sx += x
      sy += y
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (x > 0 && mask[i - 1] && !seen[i - 1]) (seen[i - 1] = 1), stack.push(i - 1)
      if (x < W - 1 && mask[i + 1] && !seen[i + 1]) (seen[i + 1] = 1), stack.push(i + 1)
      if (y > 0 && mask[i - W] && !seen[i - W]) (seen[i - W] = 1), stack.push(i - W)
      if (y < H - 1 && mask[i + W] && !seen[i + W]) (seen[i + W] = 1), stack.push(i + W)
    }
    if (n >= minPixels) out.push({ x0, y0, x1, y1, n, cx: sx / n, cy: sy / n })
  }
  return out
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[s.length >> 1] ?? 0
}

function cluster(values: number[], tol: number): number[] {
  const v = [...values].sort((a, b) => a - b)
  const groups: number[][] = []
  for (const x of v) {
    const g = groups[groups.length - 1]
    if (g && x - g[g.length - 1] <= tol) g.push(x)
    else groups.push([x])
  }
  return groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length)
}

function fraction(mask: Mask, W: number, H: number, cx: number, cy: number, r: number, filter?: (dx: number, dy: number) => boolean): number {
  let n = 0
  let on = 0
  const x0 = Math.max(0, Math.floor(cx - r))
  const x1 = Math.min(W - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r))
  const y1 = Math.min(H - 1, Math.ceil(cy + r))
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > r * r) continue
      if (filter && !filter(dx, dy)) continue
      n++
      on += mask[y * W + x]
    }
  return n ? on / n : 0
}

/** Letter guesses from blob shape (fonts vary; the editor lets users fix mistakes). */
function classifyOrnament(b: Blob, mask: Mask, W: number): OrnamentType {
  const w = b.x1 - b.x0 + 1
  const h = b.y1 - b.y0 + 1
  const at = (x: number, y: number) => mask[y * W + x]
  // C is open on the right: nothing in the middle of the right third
  let rightMid = 0
  for (let y = b.y0 + Math.floor(h * 0.38); y <= b.y0 + Math.floor(h * 0.62); y++)
    for (let x = b.x0 + Math.floor(w * 0.7); x <= b.x1; x++) rightMid += at(x, y)
  if (rightMid === 0) return 'cut'
  // B has a continuous stem on the left; S does not (its left side is open low down)
  const stemW = Math.max(2, Math.round(w * 0.3))
  let stemRows = 0
  for (let y = b.y0; y <= b.y1; y++) {
    let any = 0
    for (let x = b.x0; x < b.x0 + stemW; x++) any |= at(x, y)
    stemRows += any
  }
  return stemRows / h > 0.85 ? 'bounce' : 'slide'
}

/**
 * Dark-theme images (light dots and text on a dark background) are inverted, so the rest of the
 * pipeline always sees dark marks on light paper. Detected from the median brightness.
 */
export function withLightBackground(img: RGBAImage): { image: RGBAImage; inverted: boolean } {
  const { width: W, height: H, data } = img
  const step = Math.max(1, Math.floor((W * H) / 20000))
  const samples: number[] = []
  for (let i = 0; i < W * H; i += step) {
    const p = i * 4
    samples.push(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2])
  }
  samples.sort((a, b) => a - b)
  if (samples[samples.length >> 1] >= 100) return { image: img, inverted: false }
  const out = new Uint8ClampedArray(data.length)
  for (let p = 0; p < data.length; p += 4) {
    out[p] = 255 - data[p]
    out[p + 1] = 255 - data[p + 1]
    out[p + 2] = 255 - data[p + 2]
    out[p + 3] = data[p + 3]
  }
  return { image: { width: W, height: H, data: out }, inverted: true }
}

/**
 * Tinted paper (salmon, beige, grey cards): scale each channel so the background becomes white.
 * Dark marks then read as neutral ink instead of "red", and a real red still stands out from it.
 */
export function onWhitePaper(img: RGBAImage): RGBAImage {
  const { width: W, height: H, data } = img
  const { flat, bg } = paper(img)
  // only flat paper: a photo or gradient background has no single colour to divide by
  if (!flat || Math.min(...bg) >= PAPER_WHITE || Math.min(...bg) < 60) return img
  const out = new Uint8ClampedArray(data.length)
  for (let p = 0; p < data.length; p += 4) {
    for (let c = 0; c < 3; c++) out[p + c] = Math.min(255, (data[p + c] * 255) / bg[c])
    out[p + 3] = data[p + 3]
  }
  return { width: W, height: H, data: out }
}

/** Background colour (median) and whether it is flat paper rather than a photo or gradient. */
function paper(img: RGBAImage): { flat: boolean; bg: number[] } {
  const { width: W, height: H, data } = img
  const step = Math.max(1, Math.floor((W * H) / 20000))
  const ch: number[][] = [[], [], []]
  for (let i = 0; i < W * H; i += step) for (let c = 0; c < 3; c++) ch[c].push(data[i * 4 + c])
  const bg = ch.map((v) => median(v))
  const near = ch[0].filter((_, i) => Math.abs(ch[0][i] - bg[0]) + Math.abs(ch[1][i] - bg[1]) + Math.abs(ch[2][i] - bg[2]) < PAPER_TOLERANCE).length
  return { flat: near >= ch[0].length * PAPER_SHARE, bg }
}

/**
 * A "+" octave mark under the column at x, found as a shape rather than a separate blob (it may
 * touch the note name below it): a short bar with a thin stem of about equal length above and
 * below. A "t" has a much longer stem below its bar, so it doesn't count.
 */
function crossAt(mask: Mask, W: number, H: number, x: number, yFrom: number, yTo: number, D: number): boolean {
  const at = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < W && yy < H && mask[yy * W + xx] === 1
  const runAt = (yy: number, xx: number): [number, number] | null => {
    if (!at(xx, yy)) return null
    let a = xx
    let b = xx
    while (at(a - 1, yy)) a--
    while (at(b + 1, yy)) b++
    return [a, b]
  }
  const reach = Math.round(D * 0.25)
  for (let y = Math.max(0, Math.round(yFrom)); y <= Math.min(H - 1, Math.round(yTo)); y++) {
    let run: [number, number] | null = null
    for (let dx = 0; dx <= reach && !run; dx++) run = runAt(y, Math.round(x) + dx) ?? runAt(y, Math.round(x) - dx)
    if (!run) continue
    const len = run[1] - run[0] + 1
    if (len < D * 0.3 || len > D * 0.9) continue
    const xc = Math.round((run[0] + run[1]) / 2)
    // bar rows: as wide as this one
    let top = y
    let bottom = y
    const wide = (yy: number) => {
      const r = runAt(yy, xc)
      return r != null && r[1] - r[0] + 1 > len * 0.6
    }
    while (bottom + 1 < H && wide(bottom + 1)) bottom++
    if (bottom - top + 1 > D * 0.3) continue
    // thin stem: ink at the centre, narrow, until the shape ends or widens into a letter
    const stem = (from: number, dir: number) => {
      let n = 0
      for (let yy = from + dir; yy >= 0 && yy < H; yy += dir) {
        const r = runAt(yy, xc) ?? runAt(yy, xc - 1) ?? runAt(yy, xc + 1)
        if (!r || r[1] - r[0] + 1 > len * 0.5) break
        n++
      }
      return n
    }
    const up = stem(top, -1)
    const down = stem(bottom, 1)
    if (up >= D * 0.12 && down >= D * 0.12 && up <= D * 0.6 && down <= up * 1.6 + 2) return true
    y = bottom
  }
  return false
}

/** Dash shape under a column (slur): width / height above the ratio, or height below the share of a dot. */
const DASH_RATIO = 2.5
/** Joined letters under a column this much wider than tall: articulation written as syllables. */
const SYLLABLE_RATIO = 1.15
/** ...and found under at least this share of the line's columns, not under a stray few. */
const SYLLABLE_SHARE = 0.3
const DASH_HEIGHT = 0.25

/** Background channels at or above this are already "white". */
const PAPER_WHITE = 235
/** Flat paper: this share of pixels lies within this RGB distance of the background colour. */
const PAPER_SHARE = 0.5
const PAPER_TOLERANCE = 30

/**
 * Hole centres from every dot and ring of about the dot size. Touching marks (dots drawn edge to
 * edge, or a vertical run of covered holes) merge into one shape: split it into its grid of cells.
 */
function holeCells(mask: Mask, W: number, H: number, D: number): { cx: number; cy: number }[] {
  const cells: { cx: number; cy: number }[] = []
  for (const b of components(mask, W, H, 6)) {
    const w = b.x1 - b.x0 + 1
    const h = b.y1 - b.y0 + 1
    if (w < D * 0.7 || h < D * 0.7) continue
    const kx = Math.max(1, Math.round(w / D))
    const ky = Math.max(1, Math.round(h / D))
    if (ky > 6 || Math.abs(w - kx * D) > D * 0.45 * Math.sqrt(kx) || Math.abs(h - ky * D) > D * 0.45) continue
    for (let i = 0; i < kx; i++) for (let j = 0; j < ky; j++) cells.push({ cx: b.x0 + (w * (i + 0.5)) / kx, cy: b.y0 + (h * (j + 0.5)) / ky })
  }
  return cells
}

/** A text line (note names, "+" marks) can join the six hole rows: keep the busiest six in a row. */
function busiestSix(rows: [number, number][]): number[] | null {
  if (rows.length < 6) return null
  let best = 0
  let bestN = -1
  for (let i = 0; i + 6 <= rows.length; i++) {
    const n = rows.slice(i, i + 6).reduce((a, [, c]) => a + c, 0)
    if (n > bestN) {
      bestN = n
      best = i
    }
  }
  return rows.slice(best, best + 6).map(([y]) => y)
}

/**
 * Six hole rows around a system's 3–5 dot rows: step outwards by the usual row spacing, to the
 * side where open rings (hole cells) line up, until there are six.
 */
function completeSystem(dotRows: number[], cellY: number[], D: number): number[] | null {
  const rows = [...dotRows]
  const gaps = rows.slice(1).map((y, k) => y - rows[k])
  const step = Math.min(...gaps)
  const ringsAt = (y: number) => cellY.filter((c) => Math.abs(c - y) < D * 0.45).length
  while (rows.length < 6) {
    const above = rows[0] - step
    const below = rows[rows.length - 1] + step
    const [up, down] = [ringsAt(above), ringsAt(below)]
    if (Math.max(up, down) < MIN_RING_ROW) return null
    if (up > down) rows.unshift(above)
    else rows.push(below)
  }
  return rows
}
/** Open rings needed to accept a hole row that has no covered hole. */
const MIN_RING_ROW = 3

/** Cluster with weights: [centre, count] per group. */
function clusterCounts(values: number[], tol: number): [number, number][] {
  const v = [...values].sort((a, b) => a - b)
  const groups: number[][] = []
  for (const x of v) {
    const g = groups[groups.length - 1]
    if (g && x - g[g.length - 1] <= tol) g.push(x)
    else groups.push([x])
  }
  return groups.map((g) => [g.reduce((a, b) => a + b, 0) / g.length, g.length])
}

export function recognizeTab(source: RGBAImage, whistleId = 'D'): RecognitionResult {
  const { image: light, inverted } = withLightBackground(source)
  const img = onWhitePaper(light)
  const flatPaper = paper(light).flat
  const { width: W, height: H } = img
  const warnings: string[] = inverted ? ['Dark background detected: colours were inverted before reading.'] : []
  const { ink, inkLight, red, redLetters, grey, dark } = makeMasks(img)

  // 1) filled dots → size
  const blobs = components(ink, W, H, 6)
  const round = blobs.filter((b) => {
    const w = b.x1 - b.x0 + 1
    const h = b.y1 - b.y0 + 1
    return w >= 6 && h >= 6 && w / h > 0.75 && w / h < 1.33 && b.n / (w * h) > 0.55
  })
  if (round.length < 6) return { systems: [], dotSize: 0, warnings: ['No tab dots found. Use a clear, straight image of a dot-style whistle tab.'] }
  const D = median(round.map((b) => b.x1 - b.x0 + 1))
  const dots = round.filter((b) => Math.abs(b.x1 - b.x0 + 1 - D) < D * 0.35)

  // 2) rows → systems of 6. Filled dots first (robust on busy photo backgrounds); where that
  // fails, also use every ring and dot cell, splitting touching marks
  const splitSystems = (rows: [number, number][]) => {
    const out: [number, number][][] = []
    let cur: [number, number][] = []
    for (const r of rows) {
      if (cur.length && r[0] - cur[cur.length - 1][0] > D * 2.6) {
        out.push(cur)
        cur = []
      }
      cur.push(r)
    }
    if (cur.length) out.push(cur)
    return out
  }
  const dotSystems = splitSystems(cluster(dots.map((d) => d.cy), D * 0.45).map((y): [number, number] => [y, 1]))
  const fromDots = dotSystems.filter((r) => r.length === 6).map((r) => r.map(([y]) => y))
  const cells = holeCells(inkLight, W, H, D)
  let fromCells: number[][] = []
  if (fromDots.length < dotSystems.filter((r) => r.length >= 3).length) {
    const rowCounts = clusterCounts([...dots.map((d) => d.cy), ...cells.map((c) => c.cy)], D * 0.45)
    const busiest = Math.max(...rowCounts.map(([, n]) => n))
    fromCells = splitSystems(rowCounts.filter(([, n]) => n >= Math.max(2, busiest * 0.15)))
      .map(busiestSix)
      .filter((r): r is number[] => r != null)
      // only where the dots found nothing
      .filter((r) => !fromDots.some((d) => d[0] < r[5] + D && r[0] < d[5] + D))
  }
  // a system whose lowest (or highest) hole row has no covered hole anywhere, e.g. a line of high
  // notes: its 3–5 dot rows are completed with the nearest rows of open rings
  const found = [...fromDots, ...fromCells]
  const overlaps = (r: number[]) => found.some((d) => d[0] < r[5] + D && r[0] < d[5] + D)
  const cellY = cells.map((c) => c.cy)
  const completed = dotSystems
    .filter((r) => r.length >= 3 && r.length < 6)
    .map((r) => completeSystem(r.map(([y]) => y), cellY, D))
    .filter((r): r is number[] => r != null && !overlaps(r))
  const valid = [...found, ...completed].sort((a, b) => a[0] - b[0])
  if (valid.length < dotSystems.filter((r) => r.length >= 3).length) warnings.push('Some rows did not have exactly six holes and were skipped.')

  const redBlobs = components(redLetters, W, H, 3)
  const greyBlobs = components(grey, W, H, 3)
  // a solid black "+" is ink, not grey
  const inkBlobs = components(ink, W, H, 3).filter((b) => b.x1 - b.x0 < D * 0.9 && b.y1 - b.y0 < D * 0.9)
  let inkLetters: Blob[] | undefined
  let inkLetterMask: Mask | undefined

  const systems: RecognizedSystem[] = valid.map((holeY) => {
    const top = holeY[0] - D
    const bottom = holeY[5] + D
    // 3) columns: x-profile of dot-ish ink within the system
    const prof = new Float32Array(W)
    for (let y = Math.max(0, Math.floor(top)); y < Math.min(H, Math.ceil(bottom)); y++) for (let x = 0; x < W; x++) prof[x] += inkLight[y * W + x]
    const smooth = new Float32Array(W)
    const k = Math.max(1, Math.round(D / 3))
    for (let x = 0; x < W; x++) {
      let s = 0
      for (let d = -k; d <= k; d++) s += prof[Math.min(W - 1, Math.max(0, x + d))]
      smooth[x] = s / (2 * k + 1)
    }
    /**
     * The profile peak of a mostly-open column sits on one edge of the rings, not their middle,
     * and an off-centre sample makes open holes look half covered. Re-centre on the holes: the
     * middle of the ink span through each hole's centre row, median over the six rows.
     */
    const holeCentre = (x0: number) => {
      // the x where the six holes look most left-right symmetric (rings and dots alike)
      const r = D * 0.62
      const asymmetry = (cx: number) =>
        holeY.reduce((sum, y) => sum + Math.abs(fraction(inkLight, W, H, cx, y, r, (dx) => dx < 0) - fraction(inkLight, W, H, cx, y, r, (dx) => dx > 0)), 0)
      let best = x0
      let bestScore = asymmetry(x0)
      for (let dx = -D * 0.6; dx <= D * 0.6; dx += 0.5) {
        const score = asymmetry(x0 + dx)
        if (score < bestScore - 1e-9) {
          bestScore = score
          best = x0 + dx
        }
      }
      return best
    }
    const minH = D * 1.2
    const peaks: number[] = []
    for (let x = 1; x < W - 1; x++) {
      if (smooth[x] >= minH && smooth[x] >= smooth[x - 1] && smooth[x] > smooth[x + 1]) {
        const last = peaks[peaks.length - 1]
        if (last != null && x - last < D * 1.2) {
          if (smooth[x] > smooth[last]) peaks[peaks.length - 1] = x
        } else peaks.push(x)
      }
    }
    // a real column has hole outlines on most of its six rows
    const profileX = peaks.filter((x) => holeY.filter((y) => fraction(inkLight, W, H, x, y, D * 0.55) > 0.12).length >= 5)
    // the same from the hole cells: works when columns touch (the profile then has no dips)
    let columnsX = profileX
    if (fromCells.includes(holeY)) {
      const inRows = [...dots, ...cells].filter((c) => holeY.some((y) => Math.abs(c.cy - y) < D * 0.45))
      const cellX = clusterCounts(inRows.map((c) => c.cx), D * 0.45)
        .filter(([, n]) => n >= 4)
        .map(([x]) => x)
      if (cellX.length > profileX.length) columnsX = cellX
    }
    columnsX = columnsX.map((x) => holeCentre(x))

    const columns: RecognizedColumn[] = columnsX.map((x) => {
      let conf = 1
      const holes = holeY.map((y): HoleState => {
        const left = fraction(ink, W, H, x, y, D * 0.38, (dx) => dx < -D * 0.1)
        const right = fraction(ink, W, H, x, y, D * 0.38, (dx) => dx > D * 0.1)
        if (Math.abs(left - right) > 0.4) return 0.5
        const core = fraction(ink, W, H, x, y, D * 0.3)
        if (core > 0.6) return 1
        if (core > 0.3) conf -= 0.2
        return 0
      })
      const fingering = toFingering(holes)
      // rings: red pixels in an annulus around a hole
      let ringHole: number | undefined
      let best = 0
      holeY.forEach((y, i) => {
        const inRing = (dx: number, dy: number) => dx * dx + dy * dy > D * D * 0.3
        const f = fraction(red, W, H, x, y, D * 1.05, inRing)
        // a ring surrounds the hole: red on at least three sides (a bracket line only touches one)
        const sides = [
          fraction(red, W, H, x, y, D * 1.05, (dx, dy) => inRing(dx, dy) && dx < -Math.abs(dy)),
          fraction(red, W, H, x, y, D * 1.05, (dx, dy) => inRing(dx, dy) && dx > Math.abs(dy)),
          fraction(red, W, H, x, y, D * 1.05, (dx, dy) => inRing(dx, dy) && dy < -Math.abs(dx)),
          fraction(red, W, H, x, y, D * 1.05, (dx, dy) => inRing(dx, dy) && dy > Math.abs(dx)),
        ].filter((q) => q > 0.05).length
        if (f > 0.12 && sides >= 3 && f > best) {
          best = f
          ringHole = i
        }
      })
      // "+" below the bottom hole
      const isPlus = (mask: Mask) => (g: Blob) => {
        const w = g.x1 - g.x0 + 1
        const h = g.y1 - g.y0 + 1
        const squareish = Math.abs(w - h) <= Math.max(w, h) * 0.4
        const crossFill = g.n / (w * h)
        // on textured backgrounds (clouds, photos) everything is "grey": require a clean surround
        const surround =
          fraction(mask, W, H, g.cx, g.cy, Math.max(w, h) * 1.4, (dx, dy) => Math.abs(dx) > w * 0.7 && Math.abs(dy) < h * 0.5)
        return Math.abs(g.cx - x) < D * 0.5 && g.cy > holeY[5] + D * 0.5 && g.cy < holeY[5] + D * 1.6 && w < D * 0.9 && h < D * 0.9 && w > 3 && h > 3 && squareish && crossFill > 0.2 && crossFill < 0.75 && surround < 0.12
      }
      const plus =
        greyBlobs.some(isPlus(grey)) || inkBlobs.some(isPlus(ink)) || (flatPaper && crossAt(dark, W, H, x, holeY[5] + D * 0.5, holeY[5] + D * 1.6, D))
      const register: Register = plus || fingeringsEqual(fingering, [0, 1, 1, 1, 1, 1]) ? 2 : 1
      const pitch = midiForFingering(fingering, register, whistleId)
      return { x, fingering, register, ringHole, pitch, confidence: Math.max(0, conf), plus }
    })

    // 4) ornament letters above, articulation below
    const colAt = (cx: number) => {
      let bi = -1
      let bd = Infinity
      columns.forEach((c, i) => {
        const d = Math.abs(c.x - cx)
        if (d < bd) {
          bd = d
          bi = i
        }
      })
      return bd < D * 1.3 ? bi : -1
    }
    for (const b of redBlobs) {
      const h = b.y1 - b.y0 + 1
      const w = b.x1 - b.x0 + 1
      if (b.cy < holeY[0] - D * 0.7 && b.cy > holeY[0] - D * 3.2 && h > D * 0.5 && h < D * 1.6 && w < D * 1.4) {
        const ci = colAt(b.cx)
        if (ci >= 0) columns[ci].ornament = classifyOrnament(b, redLetters, W)
      }
    }
    const inArticulationZone = (b: Blob) => b.cy > holeY[5] + D * 1.2 && b.cy < holeY[5] + D * 3.3 && b.y1 - b.y0 < D * 1.8
    // articulation is usually red; one-colour tabs (e.g. dark theme) write it in the dot colour
    let below = redBlobs.filter(inArticulationZone)
    let letterMask = redLetters
    if (!below.length) {
      inkLetterMask ??= dilate(ink, W, H)
      inkLetters ??= components(inkLetterMask, W, H, 3)
      // "+" octave marks can sit right against the articulation line: they are read elsewhere, and their
      // bottoms would pass for the text's baseline
      below = inkLetters.filter((b) => inArticulationZone(b) && !isPlusMark(b))
      // what ends well above the text line (the strokes of "+" marks whose arms are too faint) is not text
      const textBottom = Math.max(...below.map((b) => b.y1))
      below = below.filter((b) => textBottom - b.y1 <= D * ABOVE_TEXT || isSmallDot(b, D))
      // measure letter tops on the lighter mask: the thin tip of a small "t" falls below the ink threshold
      letterMask = inkLight
      // note names (g, a, b, f#…) instead of articulation: "g" hangs below the line, "t r - i" never do
      if (isNoteNameLine(below, D)) {
        below = []
        warnings.push('Note names under the tab were ignored (only articulation marks t, r, - and i are read).')
      }
    }
    /** "tu" and "ru" written as one shape: the "t" rises above the x-height, the "r" doesn't. */
    const risesOnLeft = (b: Blob) => {
      const w = b.x1 - b.x0 + 1
      const topOf = (xa: number, xb: number) => {
        for (let y = b.y0; y <= b.y1; y++) for (let x = xa; x <= xb; x++) if (letterMask[y * W + x]) return y
        return b.y1
      }
      return topOf(b.x1 - Math.round(w * 0.35), b.x1) - topOf(b.x0, b.x0 + Math.round(w * 0.35)) > (b.y1 - b.y0 + 1) * 0.12
    }
    const joinUnderColumns = (shapes: Blob[]): Blob[] => {
      const groups = new Map<number, Blob[]>()
      for (const b of shapes) groups.set(colAt(b.cx), [...(groups.get(colAt(b.cx)) ?? []), b])
      return [...groups.values()].map((g) => {
        const x0 = Math.min(...g.map((b) => b.x0))
        const x1 = Math.max(...g.map((b) => b.x1))
        const y0 = Math.min(...g.map((b) => b.y0))
        const y1 = Math.max(...g.map((b) => b.y1))
        return { x0, x1, y0, y1, n: g.reduce((a, b) => a + b.n, 0), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
      })
    }
    // Articulation written as syllables ("tu", "du", "ru" under each note, as in video tabs) rather
    // than single letters (t, r): the letters under a column, joined, are clearly wider than tall.
    const letterSized = (b: Blob) => b.y1 - b.y0 + 1 >= D * 0.5 && b.y1 - b.y0 + 1 <= D * 1.4 && b.x1 - b.x0 + 1 <= D * 3
    const tallish = joinUnderColumns(below.filter(letterSized)).filter(letterSized)
    const syllables = tallish.length >= Math.max(3, columns.length * SYLLABLE_SHARE) && median(tallish.map((b) => (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1))) >= SYLLABLE_RATIO
    // a staccato dot is small and round; with syllables, a short dash is just as small but flat
    const isDot = (b: Blob) => {
      const w = b.x1 - b.x0 + 1
      const h = b.y1 - b.y0 + 1
      return h < D * 0.4 && w < D * 0.4 && (!syllables || w / h < 1.3)
    }
    const dotsBelow = below.filter(isDot)
    const singles = below.filter((b) => !isDot(b))
    // a dash is flat; next to syllables it must be flatter still (a whole "du" is wide, a lone "u" short)
    const isDash = (b: Blob) => {
      const ratio = (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1)
      const h = b.y1 - b.y0 + 1
      return syllables ? ratio > DASH_RATIO || h < D * DASH_HEIGHT : ratio > 1.6 || h < D * 0.42
    }
    // one-colour text or syllables: "t" and "u" may come out as separate shapes; join the letters under
    // each column so "tu" vs "ru" is judged on the whole syllable (dashes stay on their own)
    const letters = letterMask === redLetters && !syllables ? singles : [...singles.filter(isDash), ...joinUnderColumns(singles.filter((b) => !isDash(b)))]
    // with syllables, the height of the short letters ("u", "r"): the lowest fifth of the letter shapes
    const heights = singles.filter((b) => !isDash(b)).map((b) => b.y1 - b.y0 + 1).sort((a, b) => a - b)
    const xHeight = syllables && heights.length >= 5 ? heights[Math.floor(heights.length * 0.2)] : 0
    const dashCols = new Set<number>()
    for (const b of letters) {
      const w = b.x1 - b.x0 + 1
      const h = b.y1 - b.y0 + 1
      const ci = colAt(b.cx)
      if (ci < 0) continue
      const col = columns[ci]
      if (isDash(b)) {
        col.attack ??= 'slur'
        dashCols.add(ci)
        continue
      }
      const hasDot = dotsBelow.some((d) => d.y1 < b.y0 + 2 && b.y0 - d.y1 < D * 0.9 && Math.abs(d.cx - b.cx) < D * 0.45)
      if (hasDot) {
        col.stop = true
        col.attack ??= 'slur'
      }
      // "du" is the soft "ru" attack: its "d" has a closed bowl and rises well above a "t"
      else if (xHeight && w / h > 0.9 && (hasCounter(b, letterMask, W, D) || h >= xHeight * D_ASCENDER)) col.attack = 'ru'
      // "tu" rises above the x-height ("t"), "ru" does not
      else if (xHeight && w / h > 0.9) col.attack = h >= xHeight * T_ASCENDER ? 'tongue' : 'ru'
      else if (w / h > 0.9) col.attack = risesOnLeft(b) ? 'tongue' : 'ru'
      else if (h > D * 1.05) col.attack = 'tongue'
      // "tu" can split into "t" and "u": the short "u" must not turn a tongued note into "ru"
      else if (col.attack !== 'tongue') col.attack = 'ru'
    }
    // "-i" whose dot got lost reads as "- r": a short letter next to a dash is the "i"
    for (const ci of dashCols) {
      if (columns[ci].attack === 'ru') {
        columns[ci].attack = 'slur'
        columns[ci].stop = true
      }
    }

    // 5) phrases by spacing
    const gaps = columns.slice(1).map((c, i) => c.x - columns[i].x)
    const unit = median(gaps)
    const phraseBreaks = gaps.map((g, i) => (g > unit * 1.5 ? i + 1 : -1)).filter((i) => i > 0)
    // on busy photo backgrounds "+" marks are easy to miss: take a majority vote per phrase so one
    // missed mark doesn't flip a note. On flat paper the marks are read reliably, note by note.
    const bounds = flatPaper ? [] : [0, ...phraseBreaks, columns.length]
    for (let p = 0; p + 1 < bounds.length; p++) {
      const group = columns.slice(bounds[p], bounds[p + 1])
      const high = group.filter((c) => c.register === 2).length
      const reg: Register = high * 2 > group.length ? 2 : 1
      for (const c of group) {
        if (c.register !== reg && !fingeringsEqual(c.fingering, [0, 1, 1, 1, 1, 1])) {
          c.register = reg
          c.pitch = midiForFingering(c.fingering, reg, whistleId)
        }
      }
    }
    return { top, bottom, columns, phraseBreaks }
  })

  if (!systems.length) warnings.push('Found dots but no complete six-hole columns.')
  const lowConf = systems.flatMap((s) => s.columns).filter((c) => c.confidence < 0.7).length
  if (lowConf) warnings.push(`${lowConf} column(s) were unclear, please check them in the editor.`)
  return { systems, dotSize: D, warnings }
}

/**
 * Whether a letter shape encloses background, like the bowl of a "d": flood the background in from
 * the box edges and see if any is left unreached.
 */
function hasCounter(b: Blob, mask: Mask, W: number, D: number): boolean {
  const w = b.x1 - b.x0 + 1
  const h = b.y1 - b.y0 + 1
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    const k = y * w + x
    if (seen[k] || mask[(b.y0 + y) * W + b.x0 + x]) return
    seen[k] = 1
    stack.push(k)
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (stack.length) {
    const k = stack.pop()!
    const x = k % w
    const y = (k - x) / w
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  let enclosed = 0
  for (let k = 0; k < seen.length; k++) if (!seen[k] && !mask[(b.y0 + Math.floor(k / w)) * W + b.x0 + (k % w)]) enclosed++
  return enclosed >= D * D * COUNTER_SHARE
}
/** Enclosed background (share of a dot's square) that makes a bowl, not a stray gap. */
const COUNTER_SHARE = 0.03
/** A "d" stands this many x-heights tall; a "t" stays below it. */
const D_ASCENDER = 1.42
/** A "t" rises at least this many x-heights; "r" and "u" stay at one. */
const T_ASCENDER = 1.12

/** A "+" octave mark: about square, and mostly empty (two thin strokes crossing). */
function isPlusMark(b: Blob): boolean {
  const w = b.x1 - b.x0 + 1
  const h = b.y1 - b.y0 + 1
  return w / h > 0.7 && w / h < 1.4 && b.n / (w * h) < PLUS_FILL
}
/** A shape whose bottom sits this many dot sizes above the text's bottom is not part of the text. */
const ABOVE_TEXT = 0.6
/** The dot of an "i" (a staccato mark) sits above the line: small and round, it stays. */
const isSmallDot = (b: Blob, D: number) => b.y1 - b.y0 + 1 < D * 0.4 && b.x1 - b.x0 + 1 < D * 0.4

/** Ink share of a "+" mark's box; letters like "u", "o" fill more of theirs. */
const PLUS_FILL = 0.45

/** A text line with descenders (a "g" below the baseline) is note names, not t / r / - / i. */
function isNoteNameLine(shapes: Blob[], D: number): boolean {
  const tall = shapes.filter((b) => b.y1 - b.y0 + 1 > D * 0.42)
  if (tall.length < 3) return false
  const baseline = median(tall.map((b) => b.y1))
  const xHeight = median(tall.map((b) => b.y1 - b.y0 + 1))
  return tall.some((b) => b.y1 - baseline > xHeight * 0.3)
}

/** Convert a recognition result into an editable section (1 beat per column by default). */
export function sectionFromRecognition(r: RecognitionResult, id: string, name: string, whistleId = 'D', beats = 1): TuneSection {
  const phrases: Phrase[] = []
  const lineBreaks: number[] = []
  for (const s of r.systems) {
    if (phrases.length) lineBreaks.push(phrases.length)
    let cur: TuneNote[] = []
    s.columns.forEach((c, i) => {
      if (s.phraseBreaks.includes(i) && cur.length) {
        phrases.push(cur)
        cur = []
      }
      const std = fingeringForMidi(Math.round(c.pitch), whistleId)
      const note: TuneNote = { pitch: c.pitch, beats }
      if (!std || !fingeringsEqual(std.fingering, c.fingering)) note.fingering = c.fingering
      if (c.attack) note.attack = c.attack
      if (c.stop) note.stop = true
      if (c.ornament || c.ringHole != null) note.ornament = { type: c.ornament ?? 'cut', hole: c.ringHole != null ? c.ringHole + 1 : undefined }
      cur.push(note)
    })
    if (cur.length) phrases.push(cur)
  }
  return { id, name, phrases, lineBreaks: lineBreaks.length ? lineBreaks : undefined }
}
