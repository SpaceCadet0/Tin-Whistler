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

function makeMasks(img: RGBAImage) {
  const { width: W, height: H, data } = img
  const ink = new Uint8Array(W * H)
  const inkLight = new Uint8Array(W * H)
  const red = new Uint8Array(W * H)
  const redLoose = new Uint8Array(W * H)
  const grey = new Uint8Array(W * H)
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const isRed = r > 130 && r - g > 55 && r - b > 35
    red[i] = isRed ? 1 : 0
    redLoose[i] = r > 110 && r - g > 30 && r - b > 20 ? 1 : 0
    if (isRed || redLoose[i]) continue
    // dark blue / black ink
    ink[i] = (lum < 115 && b >= r - 10) || (b - r > 40 && r < 140) ? 1 : 0
    inkLight[i] = (lum < 175 && b >= r - 10) || (b - r > 25 && r < 205) ? 1 : 0
    grey[i] = lum < 232 && lum > 90 && Math.abs(r - g) < 40 && Math.abs(g - b) < 45 ? 1 : 0
  }
  return { ink, inkLight, red, redLetters: dilate(redLoose, W, H), grey }
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

export function recognizeTab(source: RGBAImage, whistleId = 'D'): RecognitionResult {
  const { image: img, inverted } = withLightBackground(source)
  const { width: W, height: H } = img
  const warnings: string[] = inverted ? ['Dark background detected: colours were inverted before reading.'] : []
  const { ink, inkLight, red, redLetters, grey } = makeMasks(img)

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

  // 2) rows → systems of 6
  const rows = cluster(dots.map((d) => d.cy), D * 0.45)
  const systemsRows: number[][] = []
  let cur: number[] = []
  for (const y of rows) {
    if (cur.length && y - cur[cur.length - 1] > D * 2.6) {
      systemsRows.push(cur)
      cur = []
    }
    cur.push(y)
  }
  if (cur.length) systemsRows.push(cur)
  const valid = systemsRows.filter((r) => r.length === 6)
  if (valid.length < systemsRows.filter((r) => r.length >= 3).length) warnings.push('Some rows did not have exactly six holes and were skipped.')

  const redBlobs = components(redLetters, W, H, 3)
  const greyBlobs = components(grey, W, H, 3)
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
    const columnsX = peaks.filter((x) => holeY.filter((y) => fraction(inkLight, W, H, x, y, D * 0.55) > 0.12).length >= 5).map((x) => holeCentre(x))

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
      const plus = greyBlobs.some((g) => {
        const w = g.x1 - g.x0 + 1
        const h = g.y1 - g.y0 + 1
        const squareish = Math.abs(w - h) <= Math.max(w, h) * 0.4
        const crossFill = g.n / (w * h)
        // on textured backgrounds (clouds, photos) everything is "grey": require a clean surround
        const surround =
          fraction(grey, W, H, g.cx, g.cy, Math.max(w, h) * 1.4, (dx, dy) => Math.abs(dx) > w * 0.7 && Math.abs(dy) < h * 0.5)
        return Math.abs(g.cx - x) < D * 0.5 && g.cy > holeY[5] + D * 0.5 && g.cy < holeY[5] + D * 1.6 && w < D * 0.9 && h < D * 0.9 && w > 3 && h > 3 && squareish && crossFill > 0.2 && crossFill < 0.75 && surround < 0.12
      })
      const register: Register = plus || fingeringsEqual(fingering, [0, 1, 1, 1, 1, 1]) ? 2 : 1
      const pitch = midiForFingering(fingering, register, whistleId)
      return { x, fingering, register, ringHole, pitch, confidence: Math.max(0, conf) }
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
      below = inkLetters.filter(inArticulationZone)
      // measure letter tops on the lighter mask: the thin tip of a small "t" falls below the ink threshold
      letterMask = inkLight
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
    const isDot = (b: Blob) => b.y1 - b.y0 + 1 < D * 0.4 && b.x1 - b.x0 + 1 < D * 0.4
    const dotsBelow = below.filter(isDot)
    const singles = below.filter((b) => !isDot(b))
    // one-colour text: "t" and "u" may come out as separate shapes; join the letters under each
    // column so "tu" vs "ru" is judged on the whole syllable (dashes stay on their own)
    const isDash = (b: Blob) => (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1) > 1.6 || b.y1 - b.y0 + 1 < D * 0.42
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
    const letters = letterMask === redLetters ? singles : [...singles.filter(isDash), ...joinUnderColumns(singles.filter((b) => !isDash(b)))]
    const dashCols = new Set<number>()
    for (const b of letters) {
      const w = b.x1 - b.x0 + 1
      const h = b.y1 - b.y0 + 1
      const ci = colAt(b.cx)
      if (ci < 0) continue
      const col = columns[ci]
      if (w / h > 1.6 || h < D * 0.42) {
        col.attack ??= 'slur'
        dashCols.add(ci)
        continue
      }
      const hasDot = dotsBelow.some((d) => d.y1 < b.y0 + 2 && b.y0 - d.y1 < D * 0.9 && Math.abs(d.cx - b.cx) < D * 0.45)
      if (hasDot) {
        col.stop = true
        col.attack ??= 'slur'
      } else if (w / h > 0.9) col.attack = risesOnLeft(b) ? 'tongue' : 'ru'
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
    // octave marks are written per phrase: take a majority vote so one missed "+" doesn't flip a note
    const bounds = [0, ...phraseBreaks, columns.length]
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
