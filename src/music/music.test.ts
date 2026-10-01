import { describe, expect, it } from 'vitest'
import { shepardsFlute } from '../data/tunes/shepardsFlute'
import { BUILTIN_TUNES } from '../data/tunes'
import { fingeringOffset, parseFingering } from './fingerings'
import { gracePitch, ornamentSegments } from './ornaments'
import { nearestNote } from './pitch'
import { parseTabText, sectionToTabText } from './tabText'
import { autoSection, flattenTune, sectionNotes, usedNotes } from './tune'
import { scaleNotes } from './scales'
import { noteById, whistleLabel } from './whistles'

describe('whistle notes', () => {
  it('maps standard D whistle fingerings', () => {
    expect(noteById('D')?.midi).toBe(74)
    expect(noteById('F#')?.midi).toBe(78)
    expect(noteById('C#')?.midi).toBe(85)
    expect(noteById("D'")?.midi).toBe(86)
    expect(noteById('C')?.midi).toBe(84)
    expect(whistleLabel(88)).toBe("E'")
  })

  it('estimates pitch of cross-fingerings and half holes', () => {
    expect(fingeringOffset(parseFingering('011000')!)).toBe(10)
    expect(fingeringOffset(parseFingering('h00000')!)).toBe(10)
    expect(fingeringOffset(parseFingering('1111h0')!)).toBe(3)
    expect(fingeringOffset(parseFingering('111111')!, 2)).toBe(12)
  })

  it('computes ornament grace notes from the ringed hole', () => {
    // cut on E with hole 4 → lifts the F# finger → higher note
    expect(gracePitch(76, { type: 'cut', hole: 4 })).toBeGreaterThan(76)
    // bounce on A with hole 2 (covered) → lifting it → B
    expect(gracePitch(81, { type: 'bounce', hole: 2 })).toBe(83)
  })

  it('glides a slide smoothly into the next note across the boundary', () => {
    const segs = ornamentSegments(74, 2, { type: 'slide', hole: 6 }, undefined, 'D', 76)
    // holds the note, then eases into the next pitch, arriving just after its onset
    expect(segs[0]).toEqual({ at: 0, midi: 74 })
    expect(segs[1].midi).toBe(74)
    expect(segs.at(-1)).toMatchObject({ midi: 76, glide: true })
    const glide = segs.at(-1)!.at - segs[1].at
    expect(glide).toBeGreaterThan(0.3)
    expect(glide).toBeLessThan(0.4)
    expect(segs[1].at).toBeLessThan(2)
    expect(segs.at(-1)!.at).toBeGreaterThan(2)
    // ease-out: more than half the interval in the first half of the glide
    expect(segs[2].midi - 74).toBeGreaterThan(1)
    expect(segs[2].at - segs[1].at).toBeLessThan(glide / 2)
    // leaps across the register break snap quickly
    const leap = ornamentSegments(88, 1, { type: 'slide', hole: 2 }, undefined, 'D', 95)
    expect(leap.at(-1)!.at - leap[1].at).toBeLessThan(0.1)
    // without a following note it slides toward the flicked hole within the note
    const alone = ornamentSegments(76, 1, { type: 'slide', hole: 4 })
    expect(alone.at(-1)!.midi).toBeGreaterThan(76)
    expect(alone.at(-1)!.at).toBeLessThanOrEqual(1)
  })

  it('builds scales on the whistle', () => {
    expect(scaleNotes('major')).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
    expect(scaleNotes('mixolydian')).toContain('C')
  })

  it('names frequencies', () => {
    expect(nearestNote(587.33).name).toBe('D')
    expect(Math.abs(nearestNote(440).cents)).toBeLessThan(0.01)
  })
})

describe('tab text', () => {
  it('parses tokens with articulation, ornaments and registers', () => {
    const { phrases, lineBreaks } = parseTabText('t:D*0.5 -:E^C4*0.25 | r:A+! -:C[h00000] / t:z*2')
    expect(phrases).toHaveLength(3)
    expect(lineBreaks).toEqual([2])
    expect(phrases[0][1]).toMatchObject({ pitch: 76, attack: 'slur', ornament: { type: 'cut', hole: 4 }, beats: 0.25 })
    expect(phrases[1][0]).toMatchObject({ pitch: 93, attack: 'ru', stop: true })
    expect(phrases[1][1].fingering).toEqual([0.5, 0, 0, 0, 0, 0])
    expect(phrases[2][0].pitch).toBeNull()
  })

  it('round-trips a section', () => {
    const s = shepardsFlute.sections[0]
    const text = sectionToTabText(s)
    const back = parseTabText(text)
    expect(back.phrases.flat()).toEqual(sectionNotes(s))
  })
})

describe('built-in tunes', () => {
  it('all parse and fit the whistle', () => {
    for (const t of BUILTIN_TUNES) {
      for (const s of t.sections) for (const n of sectionNotes(s)) if (n.pitch != null) {
        expect(n.pitch).toBeGreaterThanOrEqual(74)
        expect(n.pitch).toBeLessThanOrEqual(97)
      }
    }
  })

  it("Shepard's Flute matches the tab layout", () => {
    const counts = shepardsFlute.sections.map((s) => sectionNotes(s).length)
    expect(counts).toEqual([48, 45, 51, 40, 14])
    expect(shepardsFlute.sections[3].secondVoice?.notes).toHaveLength(4)
    expect(usedNotes(shepardsFlute)).toContain("B'")
  })

  it('flattens in time', () => {
    const tl = flattenTune(shepardsFlute, { sections: [4] })
    expect(tl[0].start).toBe(0)
    expect(tl[1].start).toBeCloseTo((0.25 * 60) / 75)
  })
})

describe('auto sectioning', () => {
  it('groups phrases into ~target-beat sections', () => {
    const phrases = Array.from({ length: 10 }, () => [{ pitch: 74, beats: 4 }])
    const sections = autoSection(phrases, 8)
    expect(sections).toHaveLength(5)
  })
})
