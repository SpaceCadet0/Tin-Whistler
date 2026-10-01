import type { OrnamentType, Phrase, Tune, TuneNote, TuneSection } from '../music/types'
import { estimateDifficulty } from './abc'
import { bestFit, transposeNotes } from './fit'
import { pathGlyphs, svgElements, type Glyph } from './svgPath'

/**
 * Standard notation → Tune, from vector score exports (MuseScore "Export → SVG", which tags every
 * element with a class: Note, Stem, Beam, Hook, NoteDot, Rest, Accidental, KeySig, BarLine,
 * Tuplet, SlurSegment, Bend …). Geometry is read exactly, so no image recognition is needed:
 *   staff lines → staves & pitch positions, noteheads (filled / hollow / whole / grace),
 *   stems + beams + flags + dots + triplets → durations, accidentals & key signature,
 *   ties (merged) vs slurs (legato), grace notes → cut, bends → slide, bar lines → phrases,
 *   systems → display lines. Single melody line; chords keep the top note.
 */

interface Staff {
  top: number
  bottom: number
  sp: number
  x0: number
  x1: number
  treble: boolean
}

interface Head extends Glyph {
  staff: number
  pitchStep: number
  hollow: boolean
  whole: boolean
  grace: boolean
  stem?: { x: number; y0: number; y1: number }
  beams: number
  flags: number
  dots: number
  accidental?: number
}

interface Event {
  kind: 'note' | 'rest'
  staff: number
  x: number
  measure: number
  beats: number
  pitch: number | null
  heads: Head[]
  tuplet?: number
  ornament?: OrnamentType
  slurred?: boolean
  tieToNext?: boolean
}

export interface NotationResult {
  tune: Tune
  warnings: string[]
  stats: { staves: number; notes: number; measures: number }
}

const LETTER_SEMI = [0, 2, 4, 5, 7, 9, 11]
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6] // F C G D A E B as letter indexes (C=0)
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3] // B E A D G C F

function diatonicToMidi(dia: number, accidental: number): number {
  const letter = ((dia % 7) + 7) % 7
  const octave = Math.floor(dia / 7)
  return 12 * (octave + 1) + LETTER_SEMI[letter] + accidental
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[s.length >> 1] ?? 0
}

export function isNotationSvg(svg: string): boolean {
  return /class="StaffLines"/.test(svg) && /class="Note"/.test(svg)
}

export function parseNotationSvg(svg: string, title = 'Imported score', whistleId = 'D'): NotationResult {
  const warnings: string[] = []
  const glyphs: Record<string, Glyph[]> = {}
  for (const e of svgElements(svg)) if (e.d) (glyphs[e.cls] ??= []).push(...pathGlyphs(e.d))
  const get = (cls: string) => glyphs[cls] ?? []

  // --- staves ---------------------------------------------------------------------------------
  const lines = get('StaffLines')
    .filter((g) => g.h < 0.5 && g.w > 20)
    .sort((a, b) => a.y0 - b.y0)
  if (lines.length < 5) throw new Error('No staff lines found, is this an SVG export of sheet music?')
  const staves: Staff[] = []
  for (let i = 0; i + 4 < lines.length; ) {
    const five = lines.slice(i, i + 5)
    const gaps = five.slice(1).map((l, k) => l.y0 - five[k].y0)
    if (Math.max(...gaps) - Math.min(...gaps) < 0.6) {
      staves.push({ top: five[0].y0, bottom: five[4].y0, sp: median(gaps), x0: Math.min(...five.map((l) => l.x0)), x1: Math.max(...five.map((l) => l.x1)), treble: true })
      i += 5
    } else i++
  }
  if (!staves.length) throw new Error('Could not group staff lines into five-line staves.')
  const sp = median(staves.map((s) => s.sp))
  const staffOf = (y: number) => {
    let best = -1
    let bd = Infinity
    staves.forEach((s, i) => {
      const d = y < s.top ? s.top - y : y > s.bottom ? y - s.bottom : 0
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return bd < sp * 12 ? best : -1
  }
  for (const c of get('Clef')) {
    const si = staffOf(c.cy)
    // a bass clef sits inside the top half of the staff and is much shorter than a treble clef
    if (si >= 0 && c.h > sp * 2 && c.h < sp * 4.2 && c.y1 < staves[si].bottom) staves[si].treble = false
  }
  if (staves.some((s) => !s.treble)) warnings.push('Bass clef detected, pitches are read in bass clef and moved into whistle range.')

  // --- key signature ---------------------------------------------------------------------------
  const keySig = get('KeySig').filter((g) => staffOf(g.cy) === 0 && g.x0 < staves[0].x0 + sp * 16)
  let keyAcc: number[] = [0, 0, 0, 0, 0, 0, 0]
  if (keySig.length) {
    const sharp = median(keySig.map((g) => g.w)) > sp * 0.95
    const order = sharp ? SHARP_ORDER : FLAT_ORDER
    keyAcc = [0, 0, 0, 0, 0, 0, 0]
    order.slice(0, Math.min(7, keySig.length)).forEach((l) => (keyAcc[l] = sharp ? 1 : -1))
  }

  // --- noteheads ------------------------------------------------------------------------------
  const rawHeads = get('Note').filter((g) => g.w > sp * 0.6 && g.h > sp * 0.5)
  const normalW = median(rawHeads.filter((g) => g.subpaths === 1).map((g) => g.w)) || sp * 1.3
  const heads: Head[] = []
  for (const g of rawHeads) {
    const staff = staffOf(g.cy)
    if (staff < 0) continue
    const s = staves[staff]
    const pos = Math.round((s.bottom - g.cy) / (s.sp / 2))
    const base = s.treble ? 30 : 18 // E4 / G2 on the bottom line (diatonic index, C0 = 0)
    heads.push({
      ...g,
      staff,
      pitchStep: base + pos,
      hollow: g.subpaths >= 2,
      whole: g.subpaths >= 2 && g.w > normalW * 1.3,
      grace: g.w < normalW * 0.8,
      beams: 0,
      flags: 0,
      dots: 0,
    })
  }
  if (!heads.length) throw new Error('No notes found in this score.')

  // stems
  const stems = get('Stem')
    .filter((g) => g.w < 0.6 && g.h > sp)
    .map((g) => ({ x: g.x0, y0: g.y0, y1: g.y1 }))
  for (const h of heads) {
    const tol = h.grace ? sp * 0.5 : sp * 0.35
    const cands = stems.filter((st) => (Math.abs(st.x - h.x0) < tol || Math.abs(st.x - h.x1) < tol) && h.cy >= st.y0 - sp * 0.8 && h.cy <= st.y1 + sp * 0.8)
    if (cands.length) h.stem = cands.sort((a, b) => Math.min(Math.abs(a.x - h.x0), Math.abs(a.x - h.x1)) - Math.min(Math.abs(b.x - h.x0), Math.abs(b.x - h.x1)))[0]
  }

  // beams: quadrilaterals; count how many cross each stem near its free end
  const beamPolys = beamQuads(svgElements(svg).filter((e) => e.cls === 'Beam').map((e) => e.d ?? ''))
  for (const h of heads) {
    if (!h.stem) continue
    const st = h.stem
    h.beams = beamPolys.filter((b) => st.x >= b.xL - 0.8 && st.x <= b.xR + 0.8 && (() => {
      const t = (st.x - b.xL) / Math.max(0.01, b.xR - b.xL)
      const y = b.yL + (b.yR - b.yL) * Math.min(1, Math.max(0, t))
      return y >= st.y0 - sp * 0.9 && y <= st.y1 + sp * 0.9
    })()).length
  }

  // flags (hooks) attach to the stem's free end
  for (const f of get('Hook')) {
    const h = heads.find((hd) => hd.stem && Math.abs(f.x0 - hd.stem.x) < sp * 0.6 && f.y1 >= hd.stem.y0 - sp && f.y0 <= hd.stem.y1 + sp)
    if (h) h.flags = Math.max(h.flags, f.h > sp * 3.6 ? 2 : 1)
  }

  // augmentation dots
  const dotGlyphs = get('NoteDot')
  for (const d of dotGlyphs) {
    const h = heads
      .filter((hd) => d.x0 > hd.x1 - 0.5 && d.x0 < hd.x1 + sp * 2.2 && Math.abs(d.cy - hd.cy) < sp * 0.8)
      .sort((a, b) => d.x0 - a.x1 - (d.x0 - b.x1))[0]
    if (h) h.dots++
  }

  // accidentals: width tells sharp from flat/natural; a flat sits above its note
  for (const a of get('Accidental')) {
    const h = heads
      .filter((hd) => hd.x0 > a.x1 - 1 && hd.x0 - a.x1 < sp * 2 && hd.cy > a.y0 - sp * 0.3 && hd.cy < a.y1 + sp * 0.3)
      .sort((p, q) => p.x0 - q.x0)[0]
    if (!h) continue
    const flatLike = h.cy - a.cy > sp * 0.5
    h.accidental = a.w > sp * 0.95 ? 1 : flatLike ? -1 : 0
  }

  // --- bar lines & measures ---------------------------------------------------------------------
  const bars = get('BarLine').filter((b) => b.h > sp * 2)
  const barsByStaff = staves.map((_, i) => bars.filter((b) => staffOf(b.cy) === i).map((b) => b.x0).sort((a, b) => a - b))

  // --- events -----------------------------------------------------------------------------------
  const events: Event[] = []
  let measureBase = 0
  staves.forEach((_, si) => {
    const staffHeads = heads.filter((h) => h.staff === si).sort((a, b) => a.cx - b.cx)
    const barX = barsByStaff[si]
    const measureOf = (x: number) => measureBase + barX.filter((b) => b < x).length
    // group chord heads sharing a stem / x position
    const groups: Head[][] = []
    for (const h of staffHeads) {
      const g = groups[groups.length - 1]
      if (g && Math.abs(g[0].cx - h.cx) < sp * 0.9 && g[0].grace === h.grace) g.push(h)
      else groups.push([h])
    }
    const measAcc = new Map<string, number>()
    let lastMeasure = -1
    for (const g of groups) {
      const top = g.reduce((a, b) => (b.cy < a.cy ? b : a))
      const m = measureOf(top.cx)
      if (m !== lastMeasure) {
        measAcc.clear()
        lastMeasure = m
      }
      let acc = keyAcc[((top.pitchStep % 7) + 7) % 7]
      if (top.accidental != null) {
        acc = top.accidental
        measAcc.set(String(top.pitchStep), acc)
      } else if (measAcc.has(String(top.pitchStep))) acc = measAcc.get(String(top.pitchStep))!
      const pitch = diatonicToMidi(top.pitchStep, acc)
      let beats: number
      if (top.whole || (top.hollow && !top.stem)) beats = 4
      else if (top.hollow) beats = 2
      else beats = 1 / Math.pow(2, Math.max(top.beams, top.flags))
      beats *= top.dots === 1 ? 1.5 : top.dots >= 2 ? 1.75 : 1
      events.push({ kind: 'note', staff: si, x: top.cx, measure: m, beats, pitch, heads: g, ornament: top.grace ? 'cut' : undefined })
    }
    // rests (+ their dots, which some exporters draw in the Rest class)
    const rests = get('Rest').filter((r) => staffOf(r.cy) === si)
    const restDots = rests.filter((r) => r.w < sp * 0.6 && r.h < sp * 0.6)
    for (const r of rests) {
      if (restDots.includes(r)) continue
      const s = staves[si]
      let beats: number
      // whole rest hangs from the 2nd line, half rest sits on the middle line
      if (r.h < sp * 0.9) beats = Math.abs(r.y0 - (s.top + s.sp)) < Math.abs(r.y1 - (s.top + 2 * s.sp)) ? -1 : 2
      else if (r.h < sp * 2.3) beats = 0.5
      else if (r.w > sp * 1.25) beats = r.h > sp * 3.4 ? 0.125 : 0.25
      else beats = 1
      const dotted = [...restDots, ...dotGlyphs].some((d) => d.x0 > r.x1 - 0.5 && d.x0 < r.x1 + sp * 1.6 && d.cy > s.top - sp && d.cy < s.bottom + sp && Math.abs(d.cy - r.cy) < sp * 2)
      if (dotted && beats > 0) beats *= 1.5
      events.push({ kind: 'rest', staff: si, x: r.cx, measure: measureOf(r.cx), beats, pitch: null, heads: [] })
    }
    measureBase += barX.length + (barX.length && barX[barX.length - 1] < staves[si].x1 - sp * 2 ? 1 : 0)
  })
  events.sort((a, b) => a.staff - b.staff || a.x - b.x)

  // --- tuplets: apply 2/3 to the three events centred under/over each "3" ------------------------
  for (const t of get('Tuplet').filter((g) => g.h > sp * 0.8 && g.h < sp * 2)) {
    const si = staffOf(t.cy)
    const inStaff = events.filter((e) => e.staff === si && !(e.ornament === 'cut' && e.heads[0]?.grace))
    if (inStaff.length < 3) continue
    let best = -1
    let bd = Infinity
    for (let i = 0; i + 2 < inStaff.length; i++) {
      const c = (inStaff[i].x + inStaff[i + 2].x) / 2
      if (Math.abs(c - t.cx) < bd) {
        bd = Math.abs(c - t.cx)
        best = i
      }
    }
    if (best >= 0 && bd < sp * 4) for (let k = 0; k < 3; k++) inStaff[best + k].tuplet = 2 / 3
  }
  for (const e of events) if (e.tuplet) e.beats *= e.tuplet

  // --- ties & slurs ---------------------------------------------------------------------------------
  const notesOnly = events.filter((e) => e.kind === 'note' && !e.heads[0]?.grace)
  const arcEnds = (s: Glyph) => {
    const si = staffOf(s.cy)
    const cand = notesOnly.filter((e) => e.staff === si)
    if (!cand.length) return null
    const nearest = (x: number) => cand.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a))
    const a = s.x0 < staves[si].x0 + sp * 6 && s.x0 < cand[0].x - sp ? cand[0] : nearest(s.x0)
    const b = s.x1 > staves[si].x1 - sp * 2 ? cand[cand.length - 1] : nearest(s.x1)
    const ia = notesOnly.indexOf(a)
    const ib = notesOnly.indexOf(b)
    return ib > ia ? [ia, ib] : null
  }
  // slurs: legato (no tongue) for every note after the first under the arc
  for (const s of get('SlurSegment')) {
    const r = arcEnds(s)
    if (r) for (let i = r[0] + 1; i <= r[1]; i++) notesOnly[i].slurred = true
  }
  // ties: same pitch joined into one longer note
  for (const s of [...get('TieSegment'), ...get('Tie')]) {
    const r = arcEnds(s)
    if (r && r[1] === r[0] + 1 && notesOnly[r[0]].pitch === notesOnly[r[1]].pitch) notesOnly[r[0]].tieToNext = true
  }

  // bends (pitch-bend arrows) → slide on the note just before them
  const bendGlyphs = get('Bend').sort((a, b) => a.x0 - b.x0)
  const bendClusters: Glyph[][] = []
  for (const g of bendGlyphs) {
    const c = bendClusters.find((cl) => cl.some((o) => Math.abs(o.cx - g.cx) < sp * 3 && Math.abs(o.cy - g.cy) < sp * 5))
    if (c) c.push(g)
    else bendClusters.push([g])
  }
  for (const cl of bendClusters) {
    const x0 = Math.min(...cl.map((g) => g.x0))
    const cy = Math.max(...cl.map((g) => g.y1))
    const si = staffOf(cy)
    const target = notesOnly.filter((e) => e.staff === si && e.x < x0 + sp).sort((a, b) => b.x - a.x)[0]
    if (target) target.ornament = 'slide'
  }

  // --- build notes --------------------------------------------------------------------------------
  const out: { note: TuneNote; staff: number; measure: number; tie?: boolean }[] = []
  let pendingGrace = false
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    if (e.kind === 'note' && e.heads[0]?.grace) {
      pendingGrace = true
      continue
    }
    const prev = out[out.length - 1]
    if (e.kind === 'note' && prev?.tie && prev.note.pitch === e.pitch) {
      prev.note.beats = Math.round((prev.note.beats + e.beats) * 10000) / 10000
      prev.tie = e.tieToNext
      continue
    }
    const note: TuneNote = { pitch: e.pitch, beats: Math.round(e.beats * 10000) / 10000 }
    if (e.pitch != null) {
      note.attack = e.slurred ? 'slur' : 'tongue'
      const orn = pendingGrace ? 'cut' : e.ornament
      if (orn) note.ornament = { type: orn }
    }
    pendingGrace = false
    out.push({ note, staff: e.staff, measure: e.measure, tie: e.tieToNext })
  }
  if (!out.length) throw new Error('No playable notes found.')

  // --- time signature from measure lengths (whole-bar rests excluded) -----------------------------------
  const perMeasure = new Map<number, number>()
  for (const o of out) if (o.note.beats > 0) perMeasure.set(o.measure, (perMeasure.get(o.measure) ?? 0) + o.note.beats)
  const counts = new Map<number, number>()
  for (const b of perMeasure.values()) {
    const r = Math.round(b * 4) / 4
    counts.set(r, (counts.get(r) ?? 0) + 1)
  }
  const beatsPerBar = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 4
  for (const o of out) if (o.note.beats < 0) {
    o.note.beats = Math.max(0.5, beatsPerBar - (perMeasure.get(o.measure) ?? 0))
    perMeasure.set(o.measure, beatsPerBar)
  }
  const irregular = [...perMeasure.values()].filter((b) => Math.abs(b - beatsPerBar) > 0.01).length
  if (irregular > 2) warnings.push(`${irregular} bars don't add up to ${beatsPerBar} beats, check rhythms in the editor.`)

  // --- fit to whistle ---------------------------------------------------------------------------------
  const fit = bestFit(out.map((o) => o.note.pitch).filter((p): p is number => p != null), whistleId)
  if (fit.shift % 12 !== 0) warnings.push(`Transposed by ${fit.shift > 0 ? '+' : ''}${fit.shift} semitones to suit the whistle.`)
  const fitted = transposeNotes(out.map((o) => o.note), fit.shift, whistleId)

  // --- phrases (two bars), lines (systems), sections (~8 bars) --------------------------------------
  const phrases: { notes: Phrase; staff: number; beats: number; measure: number }[] = []
  out.forEach((o, i) => {
    const last = phrases[phrases.length - 1]
    if (!last || last.staff !== o.staff || o.measure - last.measure >= 2) phrases.push({ notes: [fitted[i]], staff: o.staff, beats: fitted[i].beats, measure: o.measure })
    else {
      last.notes.push(fitted[i])
      last.beats += fitted[i].beats
    }
  })
  const sections: TuneSection[] = []
  const target = beatsPerBar * 8
  let cur: typeof phrases = []
  let beats = 0
  const flush = () => {
    if (!cur.length) return
    const lineBreaks = cur.map((p, k) => (k > 0 && p.staff !== cur[k - 1].staff ? k : -1)).filter((k) => k > 0)
    sections.push({ id: `s${sections.length + 1}`, name: `Section ${sections.length + 1}`, phrases: cur.map((p) => p.notes), lineBreaks: lineBreaks.length ? lineBreaks : undefined })
    cur = []
    beats = 0
  }
  for (const p of phrases) {
    if (beats > 0 && beats + p.beats > target * 1.25) flush()
    cur.push(p)
    beats += p.beats
    if (beats >= target) flush()
  }
  flush()

  const meter = Number.isInteger(beatsPerBar) ? `${beatsPerBar}/4` : `${beatsPerBar * 2}/8`
  const tune: Tune = {
    id: `user-${Date.now().toString(36)}`,
    title,
    origin: 'user',
    source: 'notation',
    type: 'air',
    whistle: whistleId,
    key: 'D',
    meter,
    bpm: 100,
    beatsPerBar,
    difficulty: estimateDifficulty(sections),
    sections,
    createdAt: Date.now(),
  }
  return { tune, warnings, stats: { staves: staves.length, notes: out.filter((o) => o.note.pitch != null).length, measures: perMeasure.size } }
}

interface BeamQuad {
  xL: number
  xR: number
  yL: number
  yR: number
}

/** Beams are drawn as "M x y l dx dy v h l -dx -dy v -h": keep their left/right edge centres. */
function beamQuads(ds: string[]): BeamQuad[] {
  const out: BeamQuad[] = []
  for (const d of ds) {
    const N = String.raw`\s*,?\s*(-?(?:\d+\.?\d*|\.\d+))`
    const slanted = new RegExp(String.raw`M` + N + N + String.raw`\s*l` + N + N + String.raw`\s*v` + N, 'g')
    const flat = new RegExp(String.raw`M` + N + N + String.raw`\s*h` + N + String.raw`\s*v` + N, 'g')
    const push = (x: number, y: number, dx: number, dy: number, t: number) => {
      const [xL, xR, yL, yR] = dx >= 0 ? [x, x + dx, y + t / 2, y + dy + t / 2] : [x + dx, x, y + dy + t / 2, y + t / 2]
      out.push({ xL, xR, yL, yR })
    }
    for (const m of d.matchAll(slanted)) push(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]))
    for (const m of d.matchAll(flat)) push(Number(m[1]), Number(m[2]), Number(m[3]), 0, Number(m[4]))
  }
  return out
}

/** Several pages (one SVG each) → one tune with the sections of all pages. */
export function mergeScorePages(results: NotationResult[], title: string): NotationResult {
  const first = results[0]
  const sections = results.flatMap((r) => r.tune.sections).map((s, i) => ({ ...s, id: `s${i + 1}`, name: `Section ${i + 1}` }))
  return {
    tune: { ...first.tune, title, sections, difficulty: estimateDifficulty(sections) },
    warnings: [...new Set(results.flatMap((r) => r.warnings))],
    stats: results.reduce((a, r) => ({ staves: a.staves + r.stats.staves, notes: a.notes + r.stats.notes, measures: a.measures + r.stats.measures }), { staves: 0, notes: 0, measures: 0 }),
  }
}
