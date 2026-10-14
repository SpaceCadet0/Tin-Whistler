import type { Phrase, Tune, TuneNote, TuneSection } from '../music/types'
import { estimateDifficulty } from './abc'
import { bestFit, transposeNotes } from './fit'
import { withLightBackground, type RGBAImage } from './tabImage'

/**
 * Standard notation from a raster image (a JPG/PNG scan, screenshot or photo of sheet music).
 * Reads pitches only:
 *  1. ink mask (Otsu threshold),
 *  2. staves = five evenly spaced long horizontal lines,
 *  3. staff lines removed, enclosed holes filled (hollow heads), eroded → noteheads with a stem
 *     (or wide stemless heads on the staff: whole notes); chords keep the top note,
 *  4. pitch from the vertical position (treble clef) and the key signature after the clef,
 *  5. bar lines → measures.
 * Accidentals before a head hold until the bar line. Durations, ties, grace notes and other clefs
 * are not read: every note gets one beat.
 * Pure function over RGBA pixels, so it runs in a worker or in Node tests.
 */

export interface ImageNote {
  x: number
  y: number
  /** Concert pitch (MIDI) as written, before fitting to the whistle. */
  pitch: number
  measure: number
}

export interface ImageStaff {
  top: number
  bottom: number
  spacing: number
  notes: ImageNote[]
  bars: number
}

export interface NotationImageResult {
  staves: ImageStaff[]
  /** Key signature: number of sharps (> 0) or flats (< 0). */
  key: number
  warnings: string[]
}

interface Comp {
  x0: number
  y0: number
  x1: number
  y1: number
  n: number
}

interface StaffLine {
  a: number
  b: number
  c: number
}

const LETTER_SEMI = [0, 2, 4, 5, 7, 9, 11]
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6] // F C G D A E B, as letter indexes from C
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3] // B E A D G C F
/** Diatonic index (C0 = 0) of the treble clef's bottom line, E4. */
const E4 = 30

/** Dark pixels, split from the paper by Otsu's threshold (transparent pixels count as paper). */
function inkMask(img: RGBAImage): Uint8Array {
  const { width: W, height: H, data } = img
  const lum = new Uint8Array(W * H)
  const hist = new Array<number>(256).fill(0)
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const l = data[p + 3] < 128 ? 255 : Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2])
    lum[i] = l
    hist[l]++
  }
  const total = W * H
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let sumB = 0
  let wB = 0
  let best = 0
  let threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2
    if (between > best) {
      best = between
      threshold = t
    }
  }
  threshold = Math.min(threshold, 200)
  const ink = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) ink[i] = lum[i] <= threshold ? 1 : 0
  return ink
}

/** 4-connected components with bounding boxes. */
function components(mask: Uint8Array, W: number, H: number): Comp[] {
  const seen = new Uint8Array(W * H)
  const stack = new Int32Array(W * H)
  const out: Comp[] = []
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || seen[start]) continue
    let sp = 0
    stack[sp++] = start
    seen[start] = 1
    const c: Comp = { x0: W, y0: H, x1: 0, y1: 0, n: 0 }
    while (sp) {
      const i = stack[--sp]
      const x = i % W
      const y = (i - x) / W
      c.n++
      if (x < c.x0) c.x0 = x
      if (x > c.x1) c.x1 = x
      if (y < c.y0) c.y0 = y
      if (y > c.y1) c.y1 = y
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && mask[j] && !seen[j]) {
          seen[j] = 1
          stack[sp++] = j
        }
      }
    }
    out.push(c)
  }
  return out
}

/** Ink plus every background pixel the paper border can't reach (the inside of hollow heads). */
function fillHoles(mask: Uint8Array, W: number, H: number): Uint8Array {
  const outside = new Uint8Array(W * H)
  const stack = new Int32Array(W * H)
  let sp = 0
  const seed = (i: number) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1
      stack[sp++] = i
    }
  }
  for (let x = 0; x < W; x++) {
    seed(x)
    seed((H - 1) * W + x)
  }
  for (let y = 0; y < H; y++) {
    seed(y * W)
    seed(y * W + W - 1)
  }
  while (sp) {
    const i = stack[--sp]
    const x = i % W
    if (x > 0) seed(i - 1)
    if (x < W - 1) seed(i + 1)
    if (i >= W) seed(i - W)
    if (i < W * (H - 1)) seed(i + W)
  }
  const out = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) out[i] = mask[i] || !outside[i] ? 1 : 0
  return out
}

/** Erosion with a (2k+1)² square: thin strokes (stems, ledger lines, text) disappear, heads stay. */
function erode(mask: Uint8Array, W: number, H: number, k: number): Uint8Array {
  const span = 2 * k + 1
  const horiz = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    let run = 0
    for (let x = 0; x < W; x++) {
      run = mask[y * W + x] ? run + 1 : 0
      if (run >= span) horiz[y * W + x - k] = 1
    }
  }
  const out = new Uint8Array(W * H)
  for (let x = 0; x < W; x++) {
    let run = 0
    for (let y = 0; y < H; y++) {
      run = horiz[y * W + x] ? run + 1 : 0
      if (run >= span) out[(y - k) * W + x] = 1
    }
  }
  return out
}

function keyAccidentals(key: number): number[] {
  const acc = new Array<number>(7).fill(0)
  if (key > 0) SHARP_ORDER.slice(0, key).forEach((l) => (acc[l] = 1))
  if (key < 0) FLAT_ORDER.slice(0, -key).forEach((l) => (acc[l] = -1))
  return acc
}

/** Diatonic index (C0 = 0) of a head centred at `y` on a treble staff whose bottom line is at `bottom`. */
export const diatonicAt = (y: number, bottom: number, spacing: number): number => E4 + Math.round((bottom - y) / (spacing / 2))

/** MIDI pitch of a diatonic index with the key's accidental, or an explicit one (−1, 0, +1). */
export function pitchOf(dia: number, key: number, accidental?: number): number {
  const letter = ((dia % 7) + 7) % 7
  const octave = Math.floor(dia / 7)
  return 12 * (octave + 1) + LETTER_SEMI[letter] + (accidental ?? keyAccidentals(key)[letter])
}

export function recognizeNotation(source: RGBAImage): NotationImageResult {
  // dark-theme scores (light notes on a dark background) are read inverted
  const { image: img, inverted } = withLightBackground(source)
  const { width: W, height: H } = img
  const warnings: string[] = inverted ? ['Dark background detected: colours were inverted before reading.'] : []
  const ink = inkMask(img)

  // --- staves: rows with a lot of ink, grouped in fives with an even spacing -------------------
  const rows = new Int32Array(H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rows[y] += ink[y * W + x]
  let maxRow = 0
  for (let y = 0; y < H; y++) maxRow = Math.max(maxRow, rows[y])
  const threshold = Math.max(maxRow * 0.5, W * 0.15)
  const lines: StaffLine[] = []
  for (let y = 0; y < H; y++) {
    if (rows[y] < threshold) continue
    const last = lines[lines.length - 1]
    if (last && y === last.b + 1) last.b = y
    else lines.push({ a: y, b: y, c: y })
  }
  for (const l of lines) l.c = (l.a + l.b) / 2
  const strength = (l: StaffLine) => {
    let n = 0
    for (let y = l.a; y <= l.b; y++) n = Math.max(n, rows[y])
    return n
  }
  // runs of evenly spaced lines; a run can be longer than five when a row of notes shares ledger
  // lines, so keep the five strongest consecutive lines of each run (staff lines are the longest)
  const found: { lines: StaffLine[]; sp: number }[] = []
  for (let i = 0; i + 4 < lines.length; ) {
    const gap = lines[i + 1].c - lines[i].c
    const even = (j: number) => Math.abs(lines[j].c - lines[j - 1].c - gap) <= Math.max(1.5, gap * 0.2)
    let end = i + 1
    while (end + 1 < lines.length && even(end + 1)) end++
    if (gap < 4 || end - i + 1 < 5) {
      i++
      continue
    }
    const run = lines.slice(i, end + 1)
    const windows = run.slice(0, run.length - 4).map((_, w) => ({ w, score: run.slice(w, w + 5).reduce((a, l) => a + strength(l), 0) }))
    const top = Math.max(...windows.map((x) => x.score))
    const taken: number[] = []
    for (const x of [...windows].sort((a, b) => b.score - a.score)) {
      if (x.score < top * 0.75 || taken.some((t) => Math.abs(t - x.w) < 5)) continue
      taken.push(x.w)
    }
    for (const w of taken.sort((a, b) => a - b)) found.push({ lines: run.slice(w, w + 5), sp: gap })
    i = end + 1
  }
  if (!found.length) {
    return { staves: [], key: 0, warnings: ['No staves (five-line staffs) found. Use a straight, sharp image of printed sheet music.'] }
  }

  const staves = found.map(({ lines: ls, sp }) => {
    // horizontal extent: columns where at least four of the five lines have ink
    let x0 = -1
    let x1 = -1
    for (let x = 0; x < W; x++) {
      let hits = 0
      for (const l of ls) {
        for (let y = l.a; y <= l.b; y++) {
          if (ink[y * W + x]) {
            hits++
            break
          }
        }
      }
      if (hits >= 4) {
        if (x0 < 0) x0 = x
        x1 = x
      }
    }
    return { lines: ls, sp, top: ls[0].c, bottom: ls[4].c, x0: Math.max(0, x0), x1: Math.max(0, x1) }
  })

  // --- remove the staff lines (keep pixels that belong to something crossing them) --------------
  const clean = ink.slice()
  for (const s of staves) {
    for (const l of s.lines) {
      for (let x = s.x0; x <= s.x1; x++) {
        const above = l.a > 0 && ink[(l.a - 1) * W + x]
        const below = l.b < H - 1 && ink[(l.b + 1) * W + x]
        if (!above && !below) for (let y = l.a; y <= l.b; y++) clean[y * W + x] = 0
      }
    }
  }

  const sp = [...staves.map((s) => s.sp)].sort((a, b) => a - b)[staves.length >> 1]
  const k = Math.max(1, Math.round(sp * 0.2))
  const symbols = components(clean, W, H)
  const blobs = components(erode(fillHoles(clean, W, H), W, H, k), W, H)

  const staffOf = (y: number) => {
    let best = 0
    for (let i = 1; i < staves.length; i++) {
      if (Math.abs(y - (staves[i].top + staves[i].bottom) / 2) < Math.abs(y - (staves[best].top + staves[best].bottom) / 2)) best = i
    }
    return best
  }

  // the clef: the tall symbol at the start of each staff; nothing left of it is a note
  const clefRight = staves.map((s) => {
    const clefs = symbols.filter((c) => c.x0 < s.x0 + 4 * s.sp && c.y1 - c.y0 >= 3.5 * s.sp && c.y0 < s.bottom && c.y1 > s.top && c.x1 - c.x0 < 4 * s.sp)
    return clefs.length ? Math.max(...clefs.map((c) => c.x1)) : s.x0 + 2.5 * s.sp
  })

  const runThrough = (x: number, y: number) => {
    if (x < 0 || x >= W) return 0
    let up = 0
    let down = 0
    while (y - up - 1 >= 0 && clean[(y - up - 1) * W + x]) up++
    while (y + down + 1 < H && clean[(y + down + 1) * W + x]) down++
    return clean[y * W + x] ? up + down + 1 : 0
  }
  /** Stems found at the left / right edge of a head-sized blob. */
  const stems = (cx: number, cy: number, w: number, s: number) => {
    const y = Math.round(cy)
    const side = (a: number, b: number) => {
      for (let x = a; x <= b; x++) if (runThrough(x, y) >= 2.4 * s) return true
      return false
    }
    return {
      left: side(Math.round(cx - w / 2 - 2), Math.round(cx - w / 2 + 0.3 * s)),
      right: side(Math.round(cx + w / 2 - 0.3 * s), Math.round(cx + w / 2 + 2)),
    }
  }

  // --- noteheads ------------------------------------------------------------------------------------
  const heads: { cx: number; cy: number; w: number; staff: number }[] = []
  for (const b of blobs) {
    const bw = b.x1 - b.x0 + 1
    const bh = b.y1 - b.y0 + 1
    const w = bw + 2 * k
    const h = bh + 2 * k
    if (w < 0.8 * sp || w > 2.1 * sp || h < 0.6 * sp || h > 1.45 * sp || b.n / (bw * bh) < 0.45) continue
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const si = staffOf(cy)
    const s = staves[si]
    // up to five ledger lines above (the whistle's top B) and below
    if (cy < s.top - 5.6 * s.sp || cy > s.bottom + 5.6 * s.sp || cx < clefRight[si] + 0.3 * s.sp || cx > s.x1 + s.sp) continue
    const st = stems(cx, cy, w, s.sp)
    // a stem on both sides is a short beam between two notes, not a head
    if (st.left && st.right) continue
    const onStaff = cy >= s.top - 1.6 * s.sp && cy <= s.bottom + 1.6 * s.sp
    if (st.left || st.right || (onStaff && w >= 1.2 * s.sp)) heads.push({ cx, cy, w, staff: si })
  }

  // --- key signature: sharps (two vertical strokes) or flats (one) between clef and first note --
  const strokes = (c: Comp) => {
    const h = c.y1 - c.y0 + 1
    let count = 0
    let inStroke = false
    for (let x = c.x0; x <= c.x1; x++) {
      let n = 0
      for (let y = c.y0; y <= c.y1; y++) n += clean[y * W + x]
      const strong = n >= 0.55 * h
      if (strong && !inStroke) count++
      inStroke = strong
    }
    return count
  }
  const keys = staves.map((s, si) => {
    const first = Math.min(...heads.filter((h) => h.staff === si).map((h) => h.cx - h.w / 2), s.x1)
    let cands = symbols
      .filter((c) => {
        const w = c.x1 - c.x0 + 1
        const h = c.y1 - c.y0 + 1
        return c.x0 >= clefRight[si] - 1 && c.x1 <= first - 0.3 * s.sp && c.y1 > s.top - s.sp && c.y0 < s.bottom + s.sp && h >= 1.4 * s.sp && h <= 3.8 * s.sp && w >= 0.3 * s.sp && w <= 1.6 * s.sp
      })
      .sort((a, b) => a.x0 - b.x0)
    // a time signature is two symbols stacked at the same x: stop there
    const mid = (s.top + s.bottom) / 2
    const cut = cands.findIndex((a) => cands.some((b) => b !== a && Math.abs((a.x0 + a.x1) / 2 - (b.x0 + b.x1) / 2) < 0.5 * s.sp && (a.y0 + a.y1) / 2 < mid !== (b.y0 + b.y1) / 2 < mid))
    if (cut >= 0) cands = cands.slice(0, cut)
    const sharps = cands.filter((c) => strokes(c) >= 2).length
    const flats = cands.filter((c) => strokes(c) === 1).length
    return Math.min(7, sharps >= flats ? sharps : -flats)
  })
  const key = keys.find((x) => x !== 0) ?? 0

  // --- accidentals inside bars: vertical strokes just left of a head ------------------------------
  // (scanned directly rather than as symbols: a slur or tie often runs through the sign)
  const nearHead = (x: number, top: number, bottom: number) => heads.some((h) => Math.abs(x - h.cx) <= h.w / 2 + 1 && top <= h.cy + h.w / 2 && bottom >= h.cy - h.w / 2)
  const accidentalBefore = (head: { cx: number; cy: number; w: number }, s: number): number | null => {
    const left = Math.round(head.cx - head.w / 2)
    const yA = Math.max(0, Math.round(head.cy - 1.8 * s))
    const yB = Math.min(H - 1, Math.round(head.cy + 1.4 * s))
    const strokes: { x0: number; x1: number; top: number; bottom: number }[] = []
    for (let x = Math.max(0, Math.round(left - 1.7 * s)); x < left - 1; x++) {
      // the longest vertical ink run through this column inside the window, measured in full
      let best: { top: number; bottom: number } | null = null
      for (let y = yA; y <= yB; y++) {
        if (!clean[y * W + x]) continue
        let top = y
        let bottom = y
        while (top > 0 && clean[(top - 1) * W + x]) top--
        while (bottom < H - 1 && clean[(bottom + 1) * W + x]) bottom++
        if (!best || bottom - top > best.bottom - best.top) best = { top, bottom }
        y = bottom
      }
      const len = best ? best.bottom - best.top + 1 : 0
      // an accidental's stroke: longer than a head, shorter than a stem or a bar line
      if (!best || len < 1.5 * s || len > 3.1 * s || nearHead(x, best.top, best.bottom)) continue
      const last = strokes[strokes.length - 1]
      if (last && x - last.x1 <= 1) {
        last.x1 = x
        last.top = Math.min(last.top, best.top)
        last.bottom = Math.max(last.bottom, best.bottom)
      } else strokes.push({ x0: x, x1: x, ...best })
    }
    if (!strokes.length) return null
    const right = strokes[strokes.length - 1]
    const pair = strokes.length >= 2 && right.x0 - strokes[strokes.length - 2].x1 <= 0.9 * s ? strokes[strokes.length - 2] : null
    if (pair) {
      // natural: the left stroke rises higher and the right one reaches lower; sharp: level strokes
      return pair.top < right.top - 0.4 * s && right.bottom > pair.bottom + 0.4 * s ? 0 : 1
    }
    // flat: a single stroke rising well above the head
    if ((right.top + right.bottom) / 2 < head.cy - 0.3 * s && right.bottom <= head.cy + 0.8 * s) return -1
    return null
  }

  // --- bar lines and the result ----------------------------------------------------------------------
  const result: ImageStaff[] = staves.map((s, si) => {
    const own = heads.filter((h) => h.staff === si).sort((a, b) => a.cx - b.cx)
    // chords: keep the top note of heads stacked at the same x
    const melody: typeof own = []
    for (const h of own) {
      const last = melody[melody.length - 1]
      if (last && Math.abs(h.cx - last.cx) < 0.6 * s.sp) {
        if (h.cy < last.cy) melody[melody.length - 1] = h
      } else melody.push(h)
    }
    const span = Math.round(s.bottom) - Math.round(s.top) + 1
    const bars: number[] = []
    let runStart = -1
    const firstX = melody.length ? melody[0].cx : s.x1
    for (let x = s.x0; x <= s.x1 + 1; x++) {
      let n = 0
      if (x <= s.x1) for (let y = Math.round(s.top); y <= Math.round(s.bottom); y++) n += clean[y * W + x]
      const isBar = x <= s.x1 && n >= 0.9 * span
      if (isBar && runStart < 0) runStart = x
      if (!isBar && runStart >= 0) {
        const bx = (runStart + x - 1) / 2
        const width = x - runStart
        const nearHead = melody.some((h) => Math.abs(h.cx - bx) < h.w / 2 + 0.5 * s.sp)
        if (width <= 0.8 * s.sp && !nearHead && bx > firstX) bars.push(bx)
        runStart = -1
      }
    }
    // accidentals written before a head hold for that staff position until the bar line
    let measureNo = -1
    let inBar = new Map<number, number>()
    const notes = melody.map((h) => {
      const measure = bars.filter((b) => b < h.cx).length
      if (measure !== measureNo) {
        measureNo = measure
        inBar = new Map()
      }
      const dia = diatonicAt(h.cy, s.bottom, s.sp)
      const acc = accidentalBefore(h, s.sp)
      if (acc != null) inBar.set(dia, acc)
      return { x: h.cx, y: h.cy, pitch: pitchOf(dia, key, inBar.get(dia)), measure }
    })
    return { top: s.top, bottom: s.bottom, spacing: s.sp, notes, bars: bars.length }
  })

  const total = result.reduce((a, s) => a + s.notes.length, 0)
  if (!total) warnings.push('Staves were found but no notes. Use a sharper image, or the SVG export from MuseScore.')
  warnings.push('Treble clef assumed; ties, grace notes and ornaments are not read.')
  return { staves: result, key, warnings }
}

/** Recognized pages → one tune: staves become lines, bars become phrases, every note one beat. */
export function tuneFromNotationImages(pages: NotationImageResult[], title: string, whistleId = 'D'): { tune: Tune; warnings: string[]; stats: { staves: number; notes: number; measures: number } } {
  const warnings: string[] = []
  const flat: { pitch: number; staff: number; measure: number; barred: boolean }[] = []
  let staffNo = 0
  let measures = 0
  for (const page of pages) {
    for (const s of page.staves) {
      if (!s.notes.length) continue
      s.notes.forEach((n) => flat.push({ pitch: n.pitch, staff: staffNo, measure: n.measure, barred: s.bars > 0 }))
      measures += s.bars + 1
      staffNo++
    }
  }
  const fit = bestFit(flat.map((n) => n.pitch), whistleId)
  if (fit.shift % 12 !== 0) warnings.push(`Transposed by ${fit.shift > 0 ? '+' : ''}${fit.shift} semitones to suit the whistle.`)
  const notes: TuneNote[] = transposeNotes(
    flat.map((n) => ({ pitch: n.pitch, beats: 1, attack: 'tongue' as const })),
    fit.shift,
    whistleId,
  )

  // phrases: one per bar (or four notes when no bar lines were found); sections: four staves
  const phrases: { notes: Phrase; staff: number }[] = []
  flat.forEach((n, i) => {
    const last = phrases[phrases.length - 1]
    const prev = flat[i - 1]
    const newPhrase = !last || !prev || prev.staff !== n.staff || (n.barred ? prev.measure !== n.measure : last.notes.length >= 4)
    if (newPhrase) phrases.push({ notes: [notes[i]], staff: n.staff })
    else last.notes.push(notes[i])
  })
  const sections: TuneSection[] = []
  for (let first = 0; first < staffNo; first += 4) {
    const own = phrases.filter((p) => p.staff >= first && p.staff < first + 4)
    if (!own.length) continue
    const lineBreaks = own.map((p, i) => (i > 0 && p.staff !== own[i - 1].staff ? i : -1)).filter((i) => i > 0)
    sections.push({ id: `s${sections.length + 1}`, name: `Section ${sections.length + 1}`, phrases: own.map((p) => p.notes), lineBreaks: lineBreaks.length ? lineBreaks : undefined })
  }

  const tune: Tune = {
    id: `user-${Date.now().toString(36)}`,
    title,
    origin: 'user',
    source: 'image',
    type: 'air',
    whistle: whistleId,
    key: 'D',
    bpm: 90,
    difficulty: estimateDifficulty(sections),
    sections,
    createdAt: Date.now(),
  }
  return { tune, warnings: [...new Set([...pages.flatMap((p) => p.warnings), ...warnings])], stats: { staves: staffNo, notes: flat.length, measures } }
}
