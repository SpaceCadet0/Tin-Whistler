import { describe, expect, it } from 'vitest'
import { alignNotes, correctTuning, HOP, type PitchFrame, timedNotes } from './align'

/** A synthetic pitch track: [midi or null, seconds, level] segments, 5 ms frames. */
function track(segments: [number | null, number, number?][]): PitchFrame[] {
  const frames: PitchFrame[] = []
  for (const [midi, secs, level = 0.3] of segments) {
    const n = Math.round(secs / HOP)
    for (let k = 0; k < n; k++) frames.push({ t: frames.length * HOP, midi, rms: midi == null ? 0.001 : level, clarity: midi == null ? 0 : 1 })
  }
  return frames
}

const startsAt = (frames: PitchFrame[], onsets: number[]) => onsets.map((f) => Math.round(frames[f].t * 100) / 100)

describe('aligning tab notes to a recording', () => {
  it('finds each note where its pitch starts, after a lead-in of silence', () => {
    const frames = track([[null, 0.5], [74, 0.4], [76, 0.3], [78, 0.6]])
    const al = alignNotes(frames, [74, 76, 78])
    expect(startsAt(frames, al.onsets)).toEqual([0.5, 0.9, 1.2])
  })

  it('splits a repeated note where the level dips, not anywhere along it', () => {
    const frames = track([[81, 0.6], [81, 0.03, 0.05], [81, 0.9]])
    const al = alignNotes(frames, [81, 81])
    expect(Math.abs(frames[al.onsets[1]].t - 0.6)).toBeLessThan(0.04)
  })

  it('turns a breath into a rest and keeps the octave that was played', () => {
    const frames = track([[74, 0.5], [null, 0.3], [86, 0.5]])
    const al = alignNotes(frames, [74, 74])
    const notes = timedNotes([{ pitch: 74, beats: 1 }, { pitch: 74, beats: 1 }], frames, al, 60)
    expect(notes.map((n) => n.pitch)).toEqual([74, null, 86])
    expect(notes.map((n) => n.beats)).toEqual([0.5, 0.3, 0.5])
  })

  it('fits a whole performance of many notes (every note at least the minimum length)', () => {
    const segments: [number, number][] = Array.from({ length: 200 }, (_, k) => [k % 3 ? 76 : 74, 0.4 + (k % 4) * 0.1])
    const frames = track(segments)
    const al = alignNotes(frames, segments.map(([m]) => m))
    expect(al.onsets).toHaveLength(200)
    expect(al.onsets.every((o, k) => k === 0 || o > al.onsets[k - 1])).toBe(true)
    expect(startsAt(frames, [al.onsets[199]])[0]).toBeCloseTo(segments.slice(0, 199).reduce((t, [, s]) => t + s, 0), 1)
  })

  it('undoes a sharp upper register before matching', () => {
    const frames = track([[74.3, 0.5], [86.7, 0.5], [88.7, 0.5]])
    const tuned = correctTuning(frames, [74, 86, 88], 85.5)
    expect(tuned.low).toBeCloseTo(0.3, 1)
    expect(tuned.high).toBeCloseTo(0.7, 1)
  })
})
