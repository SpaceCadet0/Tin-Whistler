import { paperOf, roundMarks } from './palette'
import type { RGBAImage } from './tabImage'

/**
 * Keep only the tab on its page: the holes, ornament letters, "+" marks and articulation. Tab
 * pages in videos often lie over a picture (a town, a forest) that shows through at the bottom, so
 * nothing is judged against one paper colour: the holes are found one by one (covered ones by the
 * dots' own colour, open ones by their light centre) and copied whole, and the other marks are
 * whatever is thin and stands out from what lies right round it, darker or lighter. Light text
 * over a dark picture is drawn dark, as on paper. Everything else turns to white paper.
 */

type Px = Uint8Array | Uint8ClampedArray

/** Covered holes: within this colour distance of a dot seen on the paper. */
const INK_NEAR = 50
/** An open hole's light centre: this light, and this many dot sizes across. */
const HOLE_LIGHT = 190
const HOLE_MIN = 0.4
const HOLE_MAX = 1.0
/** Round enough for a hole: width to height, and the share of its box it fills. */
const ROUND = [0.75, 1.33]
const ROUND_FILL = 0.55
/** Size tolerance of a covered hole against the dots' size. */
const DOT_SIZE = 0.35
/** Every hole has another one in its column within this many dot sizes. */
const COLUMN_REACH = 3
/** A hole is copied this many pixels past its edge (its anti-aliased rim). */
const DISC_PAD = 1
/** Thin marks: strokes up to this share of the dot size wide. */
const STROKE = 0.2
/** A thin mark stands this far (luminance) from what lies round it. */
const THIN_MARK = 80
/** Light text is this light, and lies this far (dot sizes) clear of a hole (the paper between holes isn't text). */
const LIGHT_TEXT = 170
const CLEAR_OF_HOLE = 0.3
/** Light text lies on a dark picture: what lies this far (dot sizes) round it is, in the middle, this much darker. */
const AROUND = 0.3
const DARK_AROUND = 80
/** A thin mark this many dot sizes both wide and tall is no tab mark (foliage, roof tiles, hands)... */
const BLOB = 2.5
/** ...nor one this many dot sizes tall (frame lines) or wide (rules across the page). */
const TALL = 8
const WIDE = 30
/** Anti-aliased edge pixels of a kept mark: this far from it, and this much off what lies round them. */
const EDGE_REACH = 2
const EDGE_MARK = 30
/** A thin dark mark this grey (channel spread) and this light at its core is a speck of the picture behind. */
const SPECK_TINT = 25
const SPECK_LIGHT = 120

const lum = (d: Px, i: number) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]

/** Lightest (or darkest) value in the square of radius `r` round each pixel. */
function extreme(src: Uint8Array, W: number, H: number, r: number, max: boolean): Uint8Array {
  const pick = max ? Math.max : Math.min
  const row = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = src[y * W + x]
      for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) v = pick(v, src[y * W + k])
      row[y * W + x] = v
    }
  }
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = row[y * W + x]
      for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) v = pick(v, row[k * W + x])
      out[y * W + x] = v
    }
  }
  return out
}

interface Blob {
  pixels: number[]
  x0: number
  x1: number
  y0: number
  y1: number
}

/** 4-connected blobs of a mask. */
function blobsOf(mask: Uint8Array, W: number, H: number): Blob[] {
  const seen = new Uint8Array(W * H)
  const out: Blob[] = []
  const stack: number[] = []
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || seen[s]) continue
    seen[s] = 1
    stack.push(s)
    const b: Blob = { pixels: [], x0: W, x1: 0, y0: H, y1: 0 }
    while (stack.length) {
      const i = stack.pop()!
      const x = i % W
      const y = (i - x) / W
      b.pixels.push(i)
      b.x0 = Math.min(b.x0, x)
      b.x1 = Math.max(b.x1, x)
      b.y0 = Math.min(b.y0, y)
      b.y1 = Math.max(b.y1, y)
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || seen[j] || !mask[j] || Math.abs((j % W) - x) > 1) continue
        seen[j] = 1
        stack.push(j)
      }
    }
    out.push(b)
  }
  return out
}

const round = (b: Blob) => {
  const w = b.x1 - b.x0 + 1
  const h = b.y1 - b.y0 + 1
  return w / h > ROUND[0] && w / h < ROUND[1] && b.pixels.length / (w * h) > ROUND_FILL
}
const touchesEdge = (b: Blob, W: number, H: number) => b.x0 === 0 || b.y0 === 0 || b.x1 === W - 1 || b.y1 === H - 1

/** Centres of the holes, covered and open, and the dot size: over a picture too. */
export function holesOf(img: RGBAImage): { centres: [number, number][]; D: number } | null {
  const { width: W, height: H, data: d } = img
  const dots = roundMarks(img, paperOf(img))
  if (!dots.length) return null
  const D = [...dots.map((t) => t.x1 - t.x0 + 1)].sort((a, b) => a - b)[dots.length >> 1]
  // the dots' colours, as seen where they lie on the paper; over a picture they keep them
  const inks = [...new Map(dots.map((t) => [t.colour.map((c) => Math.round(c / 16)).join(), t.colour])).values()]
  const ink = new Uint8Array(W * H)
  const light = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const [r, g, b] = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]
    ink[i] = inks.some((c) => Math.hypot(r - c[0], g - c[1], b - c[2]) < INK_NEAR) ? 1 : 0
    light[i] = lum(d, i) > HOLE_LIGHT ? 1 : 0
  }
  const centre = (b: Blob): [number, number] => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]
  const covered = blobsOf(ink, W, H).filter((b) => round(b) && Math.abs(b.x1 - b.x0 + 1 - D) <= D * DOT_SIZE)
  const open = blobsOf(light, W, H).filter((b) => {
    const w = b.x1 - b.x0 + 1
    return round(b) && !touchesEdge(b, W, H) && w >= D * HOLE_MIN && w <= D * HOLE_MAX
  })
  const all = [...covered, ...open].map(centre)
  // a hole stands in a column of holes; a round speck of the picture stands alone
  const centres = all.filter(([x, y]) => all.some(([u, v]) => Math.abs(u - x) < D * 0.4 && v !== y && Math.abs(v - y) < D * COLUMN_REACH))
  return { centres, D }
}

export function cleanTab(img: RGBAImage): RGBAImage {
  const { width: W, height: H, data: d } = img
  const holes = holesOf(img)
  if (!holes) return img
  const { centres, D } = holes
  const out = new Uint8Array(W * H * 4).fill(255)
  const copy = (i: number) => {
    for (let k = 0; k < 3; k++) out[i * 4 + k] = d[i * 4 + k]
  }
  // the holes, copied whole; `near` marks the room round them
  const R = D / 2 + DISC_PAD
  const near = new Uint8Array(W * H)
  const nearR = R + D * CLEAR_OF_HOLE
  for (const [cx, cy] of centres) {
    for (let y = Math.max(0, Math.floor(cy - nearR)); y <= Math.min(H - 1, Math.ceil(cy + nearR)); y++) {
      for (let x = Math.max(0, Math.floor(cx - nearR)); x <= Math.min(W - 1, Math.ceil(cx + nearR)); x++) {
        const r = Math.hypot(x - cx, y - cy)
        if (r <= nearR) near[y * W + x] = Math.max(near[y * W + x], r <= R ? 2 : 1)
      }
    }
  }
  for (let i = 0; i < W * H; i++) if (near[i] === 2) copy(i)

  // thin marks: what a small window round them closes over (dark ones) or opens away (light ones)
  const L = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) L[i] = lum(d, i)
  const r = Math.max(1, Math.round(D * STROKE))
  const closed = extreme(extreme(L, W, H, r, true), W, H, r, false)
  const opened = extreme(extreme(L, W, H, r, false), W, H, r, true)
  const dark = new Uint8Array(W * H)
  const lightText = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (near[i] === 2) continue
    dark[i] = closed[i] - L[i] > THIN_MARK ? 1 : 0
    lightText[i] = !near[i] && L[i] > LIGHT_TEXT && L[i] - opened[i] > THIN_MARK ? 1 : 0
  }
  const markLike = (b: Blob) => {
    const w = b.x1 - b.x0 + 1
    const h = b.y1 - b.y0 + 1
    return !((w > D * BLOB && h > D * BLOB) || h > D * TALL || w > D * WIDE) && !touchesEdge(b, W, H)
  }
  const keepDark = new Uint8Array(W * H)
  for (const b of blobsOf(dark, W, H)) {
    if (!markLike(b)) continue
    // tab marks are dark at their core or clearly coloured; a speck of a faded picture is light grey all through
    const core = b.pixels.reduce((a, i) => (L[i] < L[a] ? i : a), b.pixels[0])
    const tint = Math.max(d[core * 4], d[core * 4 + 1], d[core * 4 + 2]) - Math.min(d[core * 4], d[core * 4 + 1], d[core * 4 + 2])
    if (tint < SPECK_TINT && L[core] > SPECK_LIGHT) continue
    for (const i of b.pixels) keepDark[i] = 1
  }
  // the paper between dark letters is light and thin too, but paper lies round it
  const onDark = (b: Blob) => {
    const own = new Set(b.pixels)
    const m = Math.ceil(D * AROUND)
    const around: number[] = []
    for (let y = Math.max(0, b.y0 - m); y <= Math.min(H - 1, b.y1 + m); y++) {
      for (let x = Math.max(0, b.x0 - m); x <= Math.min(W - 1, b.x1 + m); x++) if (!own.has(y * W + x)) around.push(L[y * W + x])
    }
    const mid = around.sort((a, c) => a - c)[around.length >> 1]
    const self = b.pixels.reduce((a, i) => a + L[i], 0) / b.pixels.length
    return self - mid > DARK_AROUND
  }
  const keepLight = new Uint8Array(W * H)
  for (const b of blobsOf(lightText, W, H)) {
    if (!markLike(b) || !onDark(b)) continue
    for (const i of b.pixels) keepLight[i] = 1
  }

  // the kept marks with their soft edges: dark ones in their own colours, light ones drawn dark
  const touching = (keep: Uint8Array, x: number, y: number) => {
    for (let dy = -EDGE_REACH; dy <= EDGE_REACH; dy++) {
      for (let dx = -EDGE_REACH; dx <= EDGE_REACH; dx++) {
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < W && yy >= 0 && yy < H && keep[yy * W + xx]) return true
      }
    }
    return false
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (near[i] === 2) continue
      const darker = closed[i] - L[i]
      const lighter = L[i] - opened[i]
      if (keepDark[i] || (darker > EDGE_MARK && touching(keepDark, x, y))) copy(i)
      else if (keepLight[i] || (lighter > EDGE_MARK && touching(keepLight, x, y))) {
        const v = 255 - Math.min(255, Math.round((lighter * 255) / (255 - opened[i] || 1)))
        out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v
      }
    }
  }
  return { width: W, height: H, data: out }
}
