import { holesOf } from './tabClean'
import type { RGBAImage } from './tabImage'

/**
 * Turning a stretch of video into one clean tab image: the tab panel stays still while it is on
 * screen, while the player's hands and the moving "current note" highlight change. The per-pixel
 * median of frames sampled across the stretch drops the highlight; the pixels that hardly change
 * mark the panel, which is then cropped out. Pure functions over RGBA pixels.
 */

/** Per-pixel median of same-sized frames. */
export function medianFrame(frames: RGBAImage[]): RGBAImage {
  const { width, height } = frames[0]
  const n = frames.length
  const out = new Uint8Array(width * height * 4)
  const vals = new Uint8Array(n)
  for (let i = 0; i < out.length; i++) {
    if ((i & 3) === 3) {
      out[i] = 255
      continue
    }
    for (let k = 0; k < n; k++) vals[k] = frames[k].data[i]
    vals.sort()
    out[i] = vals[n >> 1]
  }
  return { width, height, data: out }
}

/** Brightness change above which a pixel counts as moving between two frames. */
const MOVING = 40
/** Share of moving frame pairs above which a pixel belongs to the moving part of the picture. */
const MOVING_SHARE = 0.25
/** A column (or row) belongs to the still panel when this share of its pixels is still. */
const STILL_LINE = 0.97

/** Mask of pixels that stay put across the frames (1 = still). */
export function stillMask(frames: RGBAImage[]): Uint8Array {
  const { width, height } = frames[0]
  const moves = new Uint16Array(width * height)
  for (let k = 1; k < frames.length; k++) {
    const a = frames[k - 1].data
    const b = frames[k].data
    for (let p = 0; p < width * height; p++) {
      const i = p * 4
      const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
      if (d > MOVING) moves[p]++
    }
  }
  const limit = Math.max(1, (frames.length - 1) * MOVING_SHARE)
  const mask = new Uint8Array(width * height)
  for (let p = 0; p < mask.length; p++) mask[p] = moves[p] < limit ? 1 : 0
  return mask
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** The longest run of indexes where `ok` holds, bridging gaps of up to `gap` misses. */
function longestRun(len: number, ok: (i: number) => boolean, gap = 0): [number, number] {
  let best: [number, number] = [0, len - 1]
  let bestLen = 0
  let start = -1
  let last = -1
  for (let i = 0; i <= len; i++) {
    const hit = i < len && ok(i)
    if (hit) {
      if (start < 0) start = i
      last = i
    }
    if (start >= 0 && (i === len || (!hit && i - last > gap))) {
      if (last - start + 1 > bestLen) {
        bestLen = last - start + 1
        best = [start, last]
      }
      start = -1
    }
  }
  return best
}

/** The largest still band of columns, then of rows inside it: where the tab panel sits. */
export function stillPanel(mask: Uint8Array, width: number, height: number): Rect {
  const colStill = (x: number) => {
    let s = 0
    for (let y = 0; y < height; y++) s += mask[y * width + x]
    return s / height >= STILL_LINE
  }
  const [x0, x1] = longestRun(width, colStill)
  const rowStill = (y: number) => {
    let s = 0
    for (let x = x0; x <= x1; x++) s += mask[y * width + x]
    return s / (x1 - x0 + 1) >= STILL_LINE
  }
  const [y0, y1] = longestRun(height, rowStill)
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

/** Light, colourless pixel: the paper a tab is printed on. */
function isPaper(d: Uint8Array | Uint8ClampedArray, i: number): boolean {
  const hi = Math.max(d[i], d[i + 1], d[i + 2])
  const lo = Math.min(d[i], d[i + 1], d[i + 2])
  return lo > PAPER_MIN && hi - lo < PAPER_TINT
}
const PAPER_MIN = 200
const PAPER_TINT = 40
/** A column (row) is part of the panel when this share of it is paper; columns also cross the
 * picture under the page, so they need less. */
const PAPER_COL = 0.3
const PAPER_ROW = 0.5
/** Gaps (share of the size) a light band may bridge: dense tab columns are darker. */
const PAPER_GAP = 0.03

/** The largest light band of columns, then of rows inside it: the page the tab is printed on. */
export function paperPanel(img: RGBAImage): Rect {
  const { width, height, data } = img
  const col = (x: number) => {
    let s = 0
    for (let y = 0; y < height; y++) s += isPaper(data, (y * width + x) * 4) ? 1 : 0
    return s / height >= PAPER_COL
  }
  const [x0, x1] = longestRun(width, col, Math.round(width * PAPER_GAP))
  const row = (y: number) => {
    let s = 0
    for (let x = x0; x <= x1; x++) s += isPaper(data, (y * width + x) * 4) ? 1 : 0
    return s / (x1 - x0 + 1) >= PAPER_ROW
  }
  const [y0, y1] = longestRun(height, row, Math.round(height * PAPER_GAP))
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

/** Paint the moving pixels white, so only the still tab panel is left for the recogniser. */
export function keepStill(img: RGBAImage, mask: Uint8Array): RGBAImage {
  const out = new Uint8Array(img.data)
  for (let p = 0; p < mask.length; p++) {
    if (mask[p]) continue
    out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = 255
  }
  return { width: img.width, height: img.height, data: out }
}

export function cropImage(img: RGBAImage, r: Rect): RGBAImage {
  const out = new Uint8Array(r.width * r.height * 4)
  for (let y = 0; y < r.height; y++) {
    const from = ((r.y + y) * img.width + r.x) * 4
    out.set(img.data.subarray(from, from + r.width * 4), y * r.width * 4)
  }
  return { width: r.width, height: r.height, data: out }
}

/** A thumbnail pixel changed when its grey level moved this much. */
const THUMB_CHANGE = 30
/** A page turn changes at least this share of the picture at once, well above the player's motion. */
const PAGE_TURN = 0.03
const PAGE_TURN_OVER_MOTION = 3
/** A pixel is part of the still page when it changes between at most this share of the thumbnails... */
const STILL_RATE = 0.1
/** ...and such pixels must cover this share of the picture, or all of it is watched. */
const MIN_STILL_AREA = 0.1
/** Thumbnails apart that are compared for a page turn (a fade takes up to one step). */
const TURN_SPAN = 2
/** Shortest stretch one tab page stays on screen, seconds. */
const MIN_PAGE = 5

/**
 * Where the tab page changes in a video without chapters, from greyscale thumbnails taken `fps` per
 * second: moments when much more of the picture changes at once than the player's movement does.
 * Returns [start, end] seconds of each page.
 */
export function tabPages(thumbs: Uint8Array[], fps: number, duration: number): [number, number][] {
  const size = thumbs[0]?.length ?? 0
  const moved = (k: number, p: number) => Math.abs(thumbs[k][p] - thumbs[k - 1][p]) > THUMB_CHANGE
  // the page is the part of the picture that rarely changes: the player's hands keep moving, a page
  // only turns now and then. Page turns are counted there, where the hands can't drown them out
  const changes = new Uint16Array(size)
  for (let k = 1; k < thumbs.length; k++) for (let p = 0; p < size; p++) if (moved(k, p)) changes[p]++
  const still: number[] = []
  for (let p = 0; p < size; p++) if (changes[p] <= (thumbs.length - 1) * STILL_RATE) still.push(p)
  const area = still.length >= size * MIN_STILL_AREA ? still : Array.from({ length: size }, (_, p) => p)
  // a page fading over may spread across two thumbnails: each is compared with the one before last
  const span = (k: number, p: number) => Math.abs(thumbs[k][p] - thumbs[k - TURN_SPAN][p]) > THUMB_CHANGE
  const changed = thumbs.map((_, k) => (k >= TURN_SPAN ? area.filter((p) => span(k, p)).length / area.length : 0))
  const motion = [...changed].sort((a, b) => a - b)[changed.length >> 1]
  const cuts = [0]
  changed.forEach((c, k) => {
    // dated by the later thumbnail: the new page is fully there, no frame of the old one comes after
    const at = k / fps
    if (c >= Math.max(PAGE_TURN, motion * PAGE_TURN_OVER_MOTION) && at - cuts[cuts.length - 1] >= MIN_PAGE) cuts.push(at)
  })
  const pages: [number, number][] = cuts.map((c, i) => [c, i + 1 < cuts.length ? cuts[i + 1] : duration])
  return pages.filter(([a, b]) => b - a >= MIN_PAGE)
}

/** Holes of one size, at least this many, make a tab. */
const MIN_TAB_DOTS = 12
/** A hole belongs to the tab when this many others lie within a few dot sizes of it. */
const NEIGHBOURS = 3
// margins around the dots, in dot sizes: ornament letters above, "+" marks and articulation below
const MARGIN_TOP = 3.5
const MARGIN_BOTTOM = 4
const MARGIN_SIDE = 1.5

/**
 * Where the tab is: the box round the holes (of one size, lying in a grid) with room for the
 * letters above and below. Faces, hands and pictures don't make rows of equal holes. Works on a
 * light page (flip a dark one first). Null when there is no tab.
 */
export function tabRegion(img: RGBAImage): Rect | null {
  const holes = holesOf(img)
  if (!holes || holes.centres.length < MIN_TAB_DOTS) return null
  const { centres, D } = holes
  const grid = centres.filter(([x, y]) => centres.filter(([u, v]) => (u !== x || v !== y) && Math.abs(u - x) < D * 3 && Math.abs(v - y) < D * 3).length >= NEIGHBOURS)
  if (grid.length < MIN_TAB_DOTS) return null
  const xs = grid.map(([x]) => x)
  const ys = grid.map(([, y]) => y)
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - D * (0.5 + MARGIN_SIDE)))
  const x1 = Math.min(img.width - 1, Math.ceil(Math.max(...xs) + D * (0.5 + MARGIN_SIDE)))
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - D * (0.5 + MARGIN_TOP)))
  const y1 = Math.min(img.height - 1, Math.ceil(Math.max(...ys) + D * (0.5 + MARGIN_BOTTOM)))
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}
