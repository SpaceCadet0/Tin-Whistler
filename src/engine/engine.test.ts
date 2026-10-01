import { describe, expect, it } from 'vitest'
import { yin } from '../audio/pitch/yin'
import { PitchStabilizer, type PitchFrame } from '../audio/pitch/stabilizer'
import { flattenTune } from '../music/tune'
import { hotCrossBuns } from '../data/tunes/beginner'
import { scorePerformance } from './scoring/performance'
import { segmentNotes } from './scoring/segmenter'
import { computeStreak, levelFromXp } from './progress/levels'
import { dayKeyOffset } from '../lib/storage'

const SR = 48000

function tone(freq: number, n = 2048, noise = 0): Float32Array {
  const b = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    b[i] = 0.5 * Math.sin(2 * Math.PI * freq * t) + 0.05 * Math.sin(4 * Math.PI * freq * t) + (Math.random() * 2 - 1) * noise
  }
  return b
}

describe('YIN pitch detection', () => {
  it.each([587.33, 659.26, 880, 1174.66, 1975.5])('detects %f Hz', (f) => {
    const r = yin(tone(f), SR, { minFreq: 380, maxFreq: 2700 })
    expect(Math.abs(1200 * Math.log2(r.freq / f))).toBeLessThan(5)
    expect(r.clarity).toBeGreaterThan(0.9)
  })

  it('stays accurate with background noise', () => {
    const r = yin(tone(783.99, 2048, 0.15), SR, { minFreq: 380, maxFreq: 2700 })
    expect(Math.abs(1200 * Math.log2(r.freq / 783.99))).toBeLessThan(10)
  })

  it('reports silence', () => {
    expect(yin(new Float32Array(2048), SR, { minFreq: 380, maxFreq: 2700 }).freq).toBe(0)
  })
})

/** Synthetic frames for a list of [midi|null, seconds]. */
function framesFor(notes: [number | null, number][], start = 0, hop = 0.0107): PitchFrame[] {
  const s = new PitchStabilizer()
  const out: PitchFrame[] = []
  let t = start
  for (const [midi, dur] of notes) {
    const end = t + dur
    for (; t < end; t += hop) {
      const freq = midi == null ? 0 : 440 * 2 ** ((midi - 69) / 12)
      out.push(s.process({ time: t, freq, clarity: midi == null ? 0.1 : 0.97, rms: midi == null ? 0.0005 : 0.05 }))
    }
  }
  return out
}

describe('segmenter + scorer', () => {
  it('segments separate notes', () => {
    const notes = segmentNotes(framesFor([[83, 0.4], [null, 0.05], [81, 0.4], [79, 0.4]]))
    expect(notes.map((n) => Math.round(n.midi))).toEqual([83, 81, 79])
  })

  it('ignores a short ornament blip', () => {
    const notes = segmentNotes(framesFor([[79, 0.3], [83, 0.02], [79, 0.3]]))
    expect(notes.map((n) => Math.round(n.midi))).toEqual([79])
  })

  it('scores a perfect performance highly and a wrong one low', () => {
    const tl = flattenTune(hotCrossBuns)
    const perfect = framesFor(tl.map((n) => [n.note.pitch, n.duration - 0.03] as [number, number]).flatMap((x) => [x, [null, 0.03] as [null, number]]))
    const good = scorePerformance(tl, perfect, 0)
    expect(good.notes).toBeGreaterThan(0.95)
    expect(good.overall).toBeGreaterThan(0.85)

    const wrong = framesFor(tl.map((n) => [74, n.duration] as [number, number]))
    const bad = scorePerformance(tl, wrong, 0)
    expect(bad.notes).toBeLessThan(0.2)
    expect(bad.weakPhrases.length).toBeGreaterThan(0)
  })
})

describe('progress', () => {
  it('levels up on the XP curve', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(299).level).toBe(2)
    expect(levelFromXp(300).level).toBe(3)
  })

  it('counts streaks', () => {
    const days = new Set([dayKeyOffset(0), dayKeyOffset(-1), dayKeyOffset(-2), dayKeyOffset(-4)])
    expect(computeStreak(days)).toBe(3)
    expect(computeStreak(new Set([dayKeyOffset(-1)]))).toBe(1)
  })
})
