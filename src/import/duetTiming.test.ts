import { describe, expect, it } from 'vitest'
import type { TuneNote } from '../music/types'
import { mergeCutSlide, partnerOnsets, partPhrases, splitRests, type PlacedNote } from './duetTiming'

const placed = (xs: number[], ats: number[], row = 0): PlacedNote[] =>
  xs.map((x, i) => ({ note: { pitch: 74 + i, beats: 1, attack: 'tongue' }, row, x, at: ats[i], sounded: 0.3, rest: 0, groupEnd: i === xs.length - 1 }))

describe('putting the two parts of a duet page together', () => {
  it('starts a partner note with the note it stands under, and places the others between by their timing', () => {
    const main = placed([100, 140, 180, 220], [0, 0.5, 1, 1.5])
    // the partner comes in under the second note, then plays one note of its own between columns
    const partner = placed([140, 160, 220], [0, 0.3, 0.9])
    expect(partnerOnsets(partner, main, [0, 0.5, 1, 1.5], 60)).toEqual([0.5, 0.75, 1.5])
  })

  it('rests before a part that comes in late and after its last note', () => {
    const notes = placed([0, 1], [0, 0.5])
    const phrases = partPhrases(notes, [1, 1.5], 3, 60)
    expect(phrases.map((p) => p.map((n) => (n.pitch == null ? `z${n.beats}` : n.beats)).join(' '))).toEqual(['z1', '0.5 0.25 z1.25'])
  })

  it("cuts a long rest where the other part's groups begin", () => {
    const rest = (beats: number): TuneNote => ({ pitch: null, beats })
    expect(splitRests([[rest(4)]], [1.5, 3]).map((p) => p.map((n) => n.beats))).toEqual([[1.5], [1.5], [1]])
  })

  it('puts "C+S" back together: a cut on the upper ring, then a slide off the lower', () => {
    const notes: TuneNote[] = [
      { pitch: 81, beats: 1, ornament: { type: 'cut' } },
      { pitch: 83, beats: 1, ornament: { type: 'bounce', hole: 2 } },
      { pitch: 85, beats: 1, ornament: { type: 'slide' } },
    ]
    expect(mergeCutSlide(notes).map((n) => n.ornament)).toEqual([undefined, { type: 'slide', hole: 2, cut: 1 }, undefined])
  })
})
