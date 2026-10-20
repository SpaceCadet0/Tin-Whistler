import { describe, expect, it } from 'vitest'
import { HARMONIC_COUNT, whistleTimbre } from './whistleTimbre'

const db = (g: number) => 20 * Math.log10(g)

describe('whistle timbre', () => {
  it('has a reedy low register with the 3rd harmonic above the 2nd', () => {
    const low = whistleTimbre(0)
    expect(low.harmonics).toHaveLength(HARMONIC_COUNT)
    expect(low.harmonics[0]).toBe(1)
    expect(low.harmonics[2]).toBeGreaterThan(low.harmonics[1])
  })

  it('gets purer and breathier in the second octave', () => {
    const low = whistleTimbre(0)
    const high = whistleTimbre(12)
    expect(db(high.harmonics[2])).toBeLessThan(db(low.harmonics[2]) - 10)
    expect(high.breath).toBeGreaterThan(low.breath * 2)
  })

  it('interpolates between measured points and clamps outside the range', () => {
    const mid = whistleTimbre(2.5).harmonics[1]
    expect(mid).toBeLessThan(whistleTimbre(0).harmonics[1])
    expect(mid).toBeGreaterThan(whistleTimbre(5).harmonics[1])
    expect(whistleTimbre(-3)).toEqual(whistleTimbre(0))
    expect(whistleTimbre(20)).toEqual(whistleTimbre(12))
  })
})
