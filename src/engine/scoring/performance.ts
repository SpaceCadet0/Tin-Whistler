import type { PitchFrame } from '../../audio/pitch/stabilizer'
import type { TimedNote } from '../../music/types'
import { segmentNotes, type PlayedNote } from './segmenter'

export type TimingVerdict = 'perfect' | 'early' | 'late' | 'missed' | 'unknown'

export interface NoteResult {
  index: number
  sectionIndex: number
  phraseIndex: number
  expected: number
  /** Median pitch heard during the note (null = silence). */
  played: number | null
  /** 1 = right note, 0.5 = right note in the wrong octave, 0 = wrong / missing. */
  credit: number
  /** Played onset − expected onset, seconds (null when it can't be measured, e.g. slurred repeats). */
  onsetDelta: number | null
  timing: TimingVerdict
  /** Played / expected length ratio. */
  lengthRatio: number | null
}

export interface PhraseScore {
  sectionIndex: number
  phraseIndex: number
  score: number
  firstIndex: number
  lastIndex: number
}

export interface PerformanceReport {
  notes: number
  rhythm: number
  timing: number
  overall: number
  results: NoteResult[]
  weakPhrases: PhraseScore[]
  /** Index where things first fell apart (3 wrong notes in a row), if anywhere. */
  lostAt: number | null
}

export interface ScoreOptions {
  /** Pitch tolerance in semitones. */
  tolerance?: number
  /** Seconds of timing error that still earns partial credit. */
  timingWindow?: number
}

const PERFECT = 0.06

function octaveMatch(a: number, b: number, tol: number): 'same' | 'octave' | null {
  const d = a - b
  if (Math.abs(d) <= tol) return 'same'
  const k = Math.round(d / 12)
  if (k !== 0 && Math.abs(d - 12 * k) <= tol) return 'octave'
  return null
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[s.length >> 1]
}

/**
 * Compare what was played (pitch frames) with what was expected (timed notes).
 * `origin` is the AudioContext time that corresponds to expected time 0.
 */
export function scorePerformance(
  expected: TimedNote[],
  frames: PitchFrame[],
  origin: number,
  opts: ScoreOptions = {},
): PerformanceReport {
  const tol = opts.tolerance ?? 0.55
  const window = opts.timingWindow ?? 0.25
  const played: PlayedNote[] = segmentNotes(frames)
  const used = new Set<number>()
  const results: NoteResult[] = []

  expected.forEach((tn, i) => {
    const pitch = tn.note.pitch
    if (pitch == null) return
    const s = origin + tn.start
    const d = tn.duration
    const inner = frames.filter((f) => f.time >= s + Math.min(0.06, d * 0.25) && f.time <= s + d * 0.85)
    const voiced = inner.filter((f) => f.voiced && f.midi != null)
    const heard = voiced.length >= Math.max(1, inner.length * 0.3) ? median(voiced.map((f) => f.midi!)) : null
    const match = heard == null ? null : octaveMatch(heard, pitch, tol)
    const credit = match === 'same' ? 1 : match === 'octave' ? 0.5 : 0

    // onset: nearest unused played note of (octave-insensitive) matching pitch around the expected start
    const w = Math.min(window, d * 0.8 + 0.08)
    let best: { idx: number; delta: number } | null = null
    played.forEach((p, pi) => {
      if (used.has(pi) || !octaveMatch(p.midi, pitch, tol)) return
      const delta = p.start - s
      if (Math.abs(delta) <= w && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { idx: pi, delta }
    })
    const prev = expected[i - 1]
    const slurredRepeat = prev?.note.pitch === pitch && tn.note.attack === 'slur'
    let onsetDelta: number | null = null
    let timing: TimingVerdict = credit > 0 ? 'unknown' : 'missed'
    let lengthRatio: number | null = null
    if (best) {
      const b = best as { idx: number; delta: number }
      used.add(b.idx)
      onsetDelta = b.delta
      const p = played[b.idx]
      lengthRatio = (p.end - p.start) / d
      timing = Math.abs(b.delta) <= PERFECT ? 'perfect' : b.delta < 0 ? 'early' : 'late'
    } else if (slurredRepeat && credit > 0) timing = 'unknown'

    results.push({
      index: tn.index,
      sectionIndex: tn.sectionIndex,
      phraseIndex: tn.phraseIndex,
      expected: pitch,
      played: heard,
      credit,
      onsetDelta,
      timing,
      lengthRatio,
    })
  })

  const count = results.length || 1
  const notes = results.reduce((s, r) => s + r.credit, 0) / count
  const timed = results.filter((r) => r.timing !== 'unknown')
  const timing = timed.length
    ? timed.reduce((s, r) => s + (r.onsetDelta == null ? 0 : Math.max(0, 1 - Math.max(0, Math.abs(r.onsetDelta) - PERFECT) / window)), 0) /
      timed.length
    : notes
  const measured = results.filter((r) => r.lengthRatio != null)
  const rhythmMeasured = measured.length
    ? measured.reduce((s, r) => s + Math.max(0, 1 - Math.abs(Math.log2(Math.max(0.05, r.lengthRatio!))) * 0.9), 0) / measured.length
    : 0
  // rhythm can't be better than the share of notes we could actually measure
  const rhythm = rhythmMeasured * Math.min(1, (measured.length / count) * 1.25)
  const overall = notes * 0.5 + timing * 0.25 + rhythm * 0.25

  const phraseMap = new Map<string, PhraseScore & { sum: number; n: number }>()
  for (const r of results) {
    const key = `${r.sectionIndex}:${r.phraseIndex}`
    const t = r.timing === 'perfect' || r.timing === 'unknown' ? 1 : r.timing === 'missed' ? 0 : 0.6
    const ps = phraseMap.get(key) ?? {
      sectionIndex: r.sectionIndex,
      phraseIndex: r.phraseIndex,
      score: 0,
      firstIndex: r.index,
      lastIndex: r.index,
      sum: 0,
      n: 0,
    }
    ps.sum += r.credit * 0.7 + t * 0.3
    ps.n++
    ps.lastIndex = r.index
    phraseMap.set(key, ps)
  }
  const weakPhrases = [...phraseMap.values()]
    .map(({ sum, n, ...p }) => ({ ...p, score: sum / n }))
    .filter((p) => p.score < 0.7)
    .sort((a, b) => a.score - b.score)

  let lostAt: number | null = null
  for (let i = 0; i + 2 < results.length; i++) {
    if (results[i].credit === 0 && results[i + 1].credit === 0 && results[i + 2].credit === 0) {
      lostAt = results[i].index
      break
    }
  }

  return { notes, rhythm, timing, overall, results, weakPhrases, lostAt }
}
