import { describe, expect, it } from 'vitest'
import { hope } from '../data/tunes/hope'
import { duetSection, isDuet, partName, partnerUnder, tuneForPart } from './duet'
import { flattenPartner, sectionBeats } from './tune'
import type { DuetPart, Tune } from './types'

const PARTS: DuetPart[] = [
  { id: 'D', whistle: 'D' },
  { id: 'lowD', whistle: 'lowD' },
]
// high D plays two notes, then rests while low D answers with three
const section = duetSection('s1', 'Section 1', ['t:D*0.5 -:E*0.5 | z', 't:A*0.5 | -:B*0.5 | t:D+*0.5 -:E+*0.5'], PARTS)
const tune: Tune = { id: 'x', title: 'X', origin: 'builtin', type: 'air', whistle: 'D', key: '', bpm: 60, difficulty: 1, sections: [section], duet: { parts: PARTS } }

describe('duets', () => {
  it('makes one part the tune to play, with the other as its partner on its own whistle', () => {
    expect(isDuet(tune)).toBe(true)
    const low = tuneForPart(tune, 1)
    expect(low.whistle).toBe('lowD')
    expect(low.sections[0].phrases.flat().map((n) => n.pitch)).toEqual([69, 71, 74, 76])
    expect(low.sections[0].partner).toMatchObject({ whistle: 'D' })
    expect(flattenPartner(low, 0).map((n) => n.start)).toEqual([0, 0.5, 1])
  })

  it('shows over each of my notes the partner notes that start while it sounds', () => {
    const high = tuneForPart(tune, 0).sections[0]
    const under = partnerUnder(high.phrases.flat(), high.partner!.notes)
    // D: low A; E: low B; the rest gathers both notes low D plays meanwhile
    expect(under.map((ns) => ns.map((n) => n.pitch))).toEqual([[69], [71], [74, 76]])
  })

  it('names the parts by their whistles', () => {
    expect(PARTS.map((p) => partName(p.whistle))).toEqual(['High D', 'Low D'])
  })

  it('gives both parts of Hope the same length in every section', () => {
    expect(isDuet(hope)).toBe(true)
    for (const s of hope.sections) {
      const [a, b] = s.parts!.map((p) => sectionBeats({ ...s, phrases: p.phrases }))
      expect(a).toBeCloseTo(b, 6)
    }
  })
})
