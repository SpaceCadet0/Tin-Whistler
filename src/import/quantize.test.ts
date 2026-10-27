import { describe, expect, it } from 'vitest'
import type { Phrase, TuneNote, TuneSection } from '../music/types'
import { quantizeSections } from './quantize'

/** A measured group: [pitch, seconds] notes, then an optional rest in seconds. */
const group = (notes: [number, number][], rest = 0): Phrase => [
  ...notes.map(([pitch, beats]): TuneNote => ({ pitch, beats, attack: 'tongue' })),
  ...(rest ? [{ pitch: null, beats: rest }] : []),
]
const section = (phrases: Phrase[]): TuneSection => ({ id: 's', name: 'S', phrases })
const lengths = (p: Phrase) => p.map((n) => (n.pitch == null ? `z${n.beats}` : n.beats)).join(' ')

describe('measured timing to musical lengths', () => {
  it('writes eighths and quarters at the tempo the short notes give, not their exact seconds', () => {
    const q = quantizeSections([section([group([[74, 0.2], [76, 0.23], [78, 0.39], [79, 0.21], [81, 0.43]])])])
    expect(q.bpm).toBeGreaterThan(135)
    expect(q.bpm).toBeLessThan(150)
    expect(lengths(q.sections[0].phrases[0])).toBe('0.5 0.5 1 0.5 1')
  })

  it('gives every group of a size the rest most of them breathe, the same length, and none when most do not', () => {
    const breathing = [0, 1, 2, 3].map((k) => group([[86, 0.33], [93, 0.25], [89, 0.18]], k === 2 ? 0 : 0.3))
    const running = [0, 1, 2].map((k) => group([[86, 0.2], [88, 0.2]], k === 0 ? 0.15 : 0))
    const q = quantizeSections([section([...breathing, group([[86, 1]])]), section([...running, group([[86, 1]])])])
    const [a, b] = q.sections.map((s) => s.phrases.slice(0, -1).map(lengths))
    expect(new Set(a).size).toBe(1)
    expect(a[0]).toMatch(/ z/)
    expect(b.every((x) => !x.includes('z'))).toBe(true)
  })

  it('plays a repeated phrase alike, even where a repeated note was split wrongly', () => {
    const ddd = (a: number, b: number, c: number) => group([[86, a], [86, b], [86, c]])
    const q = quantizeSections([section([ddd(0.21, 0.32, 0.22), ddd(0.2, 0.33, 0.21), group([[88, 0.3]])]), section([ddd(0.34, 0.52, 0.29), ddd(0.21, 0.34, 0.22), group([[88, 0.3]])])])
    const all = q.sections.flatMap((s) => s.phrases.slice(0, -1).map(lengths))
    expect(new Set(all)).toEqual(new Set(['0.5 0.75 0.5']))
  })

  it("keeps a section's last group its own: a held ending is no repeat of a running phrase", () => {
    const pair = group([[84, 0.21], [86, 0.33]])
    const q = quantizeSections([section([pair, pair, group([[84, 0.27], [86, 2.3]])])])
    expect(q.sections[0].phrases[2].at(-1)!.beats).toBeGreaterThanOrEqual(4)
  })
})
