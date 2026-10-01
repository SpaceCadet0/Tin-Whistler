import type { PitchFrame } from '../../audio/pitch/stabilizer'
import { segmentNotes } from './segmenter'

export type BeatVerdict = 'perfect' | 'early' | 'late' | 'missed'

export interface RhythmStepResult {
  expected: number
  delta: number | null
  verdict: BeatVerdict
}

export interface RhythmReport {
  steps: RhythmStepResult[]
  /** 0…1 */
  timing: number
  /** Played notes that didn't belong to any beat. */
  extra: number
  /** Mean signed offset in ms (negative = rushing). */
  bias: number
}

const PERFECT = 0.07
const WINDOW = 0.3

/** Match played onsets to expected onsets (AudioContext times). */
export function scoreRhythm(expected: number[], frames: PitchFrame[]): RhythmReport {
  const onsets = segmentNotes(frames, { minDuration: 0.05, confirmFrames: 2 }).map((n) => n.start)
  const used = new Set<number>()
  const steps = expected.map((e): RhythmStepResult => {
    let best = -1
    for (let i = 0; i < onsets.length; i++) {
      if (used.has(i)) continue
      const d = onsets[i] - e
      if (Math.abs(d) <= WINDOW && (best < 0 || Math.abs(d) < Math.abs(onsets[best] - e))) best = i
    }
    if (best < 0) return { expected: e, delta: null, verdict: 'missed' }
    used.add(best)
    const delta = onsets[best] - e
    return { expected: e, delta, verdict: Math.abs(delta) <= PERFECT ? 'perfect' : delta < 0 ? 'early' : 'late' }
  })
  const timing =
    steps.reduce((s, r) => s + (r.delta == null ? 0 : Math.max(0, 1 - Math.max(0, Math.abs(r.delta) - PERFECT) / (WINDOW - PERFECT))), 0) /
    Math.max(1, steps.length)
  const hit = steps.filter((s) => s.delta != null)
  const bias = hit.length ? (hit.reduce((s, r) => s + r.delta!, 0) / hit.length) * 1000 : 0
  const first = expected[0] ?? 0
  const last = expected[expected.length - 1] ?? 0
  const extra = onsets.filter((o, i) => !used.has(i) && o > first - WINDOW && o < last + WINDOW).length
  return { steps, timing, extra, bias }
}
