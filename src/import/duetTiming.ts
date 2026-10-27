import type { Phrase, TuneNote } from '../music/types'
import type { RecognizedSystem } from './tabImage'

/**
 * Putting the two parts of a duet page together. Each part is timed from the recording on its own
 * (the video plays them one after the other); on the page, notes that sound together stand in the
 * same column, one line above the other. So the second part is laid onto the first part's beats
 * through those shared columns, and in between by its own measured timing.
 */

/** Grid of the written lengths: sixteenths (a beat is a quarter). */
const STEP = 0.25
/** A column of one line stands over a column of the other when they are this close (share of the column spacing). */
const SAME_COLUMN = 0.5
/** A lone all-open column this many column spacings away from the rest is a frame line or a label, not a note. */
const STRAY_GAP = 3

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]
const onGrid = (beats: number) => Math.round(beats / STEP) * STEP

/** The usual spacing of a line's columns. */
export const columnSpacing = (xs: number[]): number => median(xs.slice(1).map((x, i) => x - xs[i])) || 1

/** Drop what isn't a note: an all-open column with no "+" or articulation, far from the others (page frames, labels). */
export function dropStrays(line: RecognizedSystem): RecognizedSystem {
  const xs = line.columns.map((c) => c.x)
  const gap = columnSpacing(xs)
  const stray = line.columns.map((c, i) => {
    const near = Math.min(i > 0 ? c.x - xs[i - 1] : Infinity, i + 1 < xs.length ? xs[i + 1] - c.x : Infinity)
    return c.fingering.every((h) => h === 0) && !c.plus && !c.attack && near > gap * STRAY_GAP
  })
  const kept = line.columns.filter((_, i) => !stray[i])
  // a group break stays before the column it stood before (or the next one kept)
  const newIndex = line.columns.map((_, i) => stray.slice(0, i).filter(Boolean).length)
  const phraseBreaks = [...new Set(line.phraseBreaks.map((b) => b - newIndex[Math.min(b, newIndex.length - 1)]).filter((b) => b > 0 && b < kept.length))]
  return { ...line, columns: kept, phraseBreaks }
}

/**
 * "C+S" over one column reads as three letters: C over the column before (no ring), "+" taken for a
 * B over the column itself (with one of its two rings) and S over the column after (no ring). Put
 * them back together: a cut on the upper ringed hole, then a slide off the lower.
 */
export function mergeCutSlide(notes: TuneNote[]): TuneNote[] {
  const out = notes.map((n) => ({ ...n }))
  for (let k = 1; k + 1 < out.length; k++) {
    const [a, b, c] = [out[k - 1].ornament, out[k].ornament, out[k + 1].ornament]
    if (a?.type !== 'cut' || a.hole || b?.type !== 'bounce' || !b.hole || c?.type !== 'slide' || c.hole) continue
    const slide = b.hole === 1 ? 2 : b.hole
    out[k].ornament = { type: 'slide', hole: slide, cut: slide - 1 }
    delete out[k - 1].ornament
    delete out[k + 1].ornament
  }
  return out
}

/** A note of a part with where it stands on the page and when it was heard. */
export interface PlacedNote {
  note: TuneNote
  /** Row of the page (lines one above the other share a row) and x of the column. */
  row: number
  x: number
  /** Seconds from the part's first note to this one's start (its own performance). */
  at: number
  /** Measured seconds the note sounded, and the rest after it (only at the end of a group). */
  sounded: number
  rest: number
  /** Last note of its group (a gap on the page follows). */
  groupEnd: boolean
}

/**
 * The second part's onsets in the first part's beats. Notes standing in a column of the first part
 * take that note's onset; the others are placed between those anchors in proportion to the time
 * they were heard (beyond the anchors, at the tune's tempo), on the grid, each after the one before.
 */
export function partnerOnsets(partner: PlacedNote[], main: PlacedNote[], mainOnsets: number[], bpm: number): number[] {
  const spacing = columnSpacing(main.map((m) => m.x))
  const anchors: { at: number; beat: number }[] = []
  partner.forEach((p) => {
    const j = main.findIndex((m) => m.row === p.row && Math.abs(m.x - p.x) < spacing * SAME_COLUMN)
    if (j >= 0) anchors.push({ at: p.at, beat: mainOnsets[j] })
  })
  const perSecond = bpm / 60
  const beatAt = (at: number): number => {
    if (!anchors.length) return at * perSecond
    const i = anchors.findIndex((a) => a.at >= at - 1e-9)
    if (i === 0) return anchors[0].beat - (anchors[0].at - at) * perSecond
    if (i < 0) return anchors[anchors.length - 1].beat + (at - anchors[anchors.length - 1].at) * perSecond
    const [a, b] = [anchors[i - 1], anchors[i]]
    return b.at === a.at ? b.beat : a.beat + ((at - a.at) / (b.at - a.at)) * (b.beat - a.beat)
  }
  const out: number[] = []
  for (const p of partner) out.push(Math.max(out.length ? out[out.length - 1] + STEP : 0, onGrid(beatAt(p.at))))
  return out
}

/**
 * A part's phrases from its notes' onsets (beats): each note lasts until the next one starts. After a
 * group the recording breathed, the note keeps about the time it sounded and a rest takes the rest;
 * after the part's last note it rests until `end`. A part that starts late rests first.
 */
export function partPhrases(notes: PlacedNote[], onsets: number[], end: number, bpm: number): Phrase[] {
  const perSecond = bpm / 60
  const phrases: Phrase[] = []
  if (onsets[0] > 0) phrases.push([{ pitch: null, beats: onsets[0] }])
  let group: TuneNote[] = []
  notes.forEach((n, k) => {
    const next = k + 1 < notes.length ? onsets[k + 1] : Math.max(end, onsets[k] + STEP)
    const span = next - onsets[k]
    const last = k + 1 === notes.length
    const breathes = (n.groupEnd && n.rest > 0) || last
    const keep = breathes ? Math.min(span, Math.max(STEP, onGrid(n.sounded * perSecond))) : span
    group.push({ ...n.note, beats: keep })
    if (span - keep >= STEP) group.push({ pitch: null, beats: span - keep })
    if (n.groupEnd || last) {
      phrases.push(group)
      group = []
    }
  })
  return phrases
}

/**
 * Cut a part's long rests where the other part's groups begin, so the other part's notes shown
 * over a rest stay with their own group. A rest that covers no such onset stays whole.
 */
export function splitRests(phrases: Phrase[], cuts: number[]): Phrase[] {
  let beat = 0
  return phrases.flatMap((p) => {
    // a phrase of rests only is cut into phrases of its own; rests inside a group just get cut
    const restOnly = p.every((n) => n.pitch == null)
    const pieces: Phrase[] = [[]]
    for (const n of p) {
      if (n.pitch != null) {
        pieces[pieces.length - 1].push(n)
        beat += n.beats
        continue
      }
      let from = beat
      const to = beat + n.beats
      for (const c of cuts.filter((c) => c > from + 1e-6 && c < to - 1e-6)) {
        pieces[pieces.length - 1].push({ pitch: null, beats: c - from })
        if (restOnly) pieces.push([])
        from = c
      }
      pieces[pieces.length - 1].push({ pitch: null, beats: to - from })
      beat = to
    }
    return pieces.filter((x) => x.length)
  })
}
