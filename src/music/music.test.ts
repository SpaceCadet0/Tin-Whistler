import { describe, expect, it } from 'vitest'
import { shepardsFlute } from '../data/tunes/shepardsFlute'
import { BUILTIN_TUNES } from '../data/tunes'
import { changeWhistle, insertClip, insertNotes, moveRange, removeRange, sliceClip, sliceNotes, transposeKeyName } from './editing'
import { fingeringOffset, fingeringToString, parseFingering } from './fingerings'
import { gracePitch, ornamentSegments, TRILL_STEP_SEC } from './ornaments'
import { nearestNote } from './pitch'
import { parseTabText, sectionToTabText } from './tabText'
import { autoSection, flattenTune, sectionNotes, usedNotes } from './tune'
import { scaleNotes } from './scales'
import type { TuneSection } from './types'
import { fingeringForMidi, noteById, whistleLabel } from './whistles'

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

describe('changing the whistle key', () => {
  const fingerings = (tune: typeof shepardsFlute) =>
    tune.sections.flatMap(sectionNotes).map((n) => (n.pitch == null ? '-' : n.fingering ? fingeringToString(n.fingering) : fingeringForMidi(n.pitch, tune.whistle)?.fingering.join('') ?? '?'))

  it('keeps every fingering and moves the notes by the interval between the whistles', () => {
    const onC = changeWhistle(shepardsFlute, 'C')
    expect(onC.whistle).toBe('C')
    expect(onC.key).toBe('C')
    expect(fingerings(onC)).toEqual(fingerings(shepardsFlute))
    const before = shepardsFlute.sections.flatMap(sectionNotes)
    onC.sections.flatMap(sectionNotes).forEach((n, i) => expect(n.pitch).toBe(before[i].pitch == null ? null : before[i].pitch! - 2))
    // the second voice moves too, and going back restores the original
    expect(onC.sections[3].secondVoice!.notes[0].pitch).toBe(shepardsFlute.sections[3].secondVoice!.notes[0].pitch! - 2)
    expect(changeWhistle(onC, 'D')).toEqual(shepardsFlute)
  })

  it('renames the key with the same interval', () => {
    expect(transposeKeyName('D', -2)).toBe('C')
    expect(transposeKeyName('Em', 5)).toBe('Am')
    expect(transposeKeyName('Ador', -12)).toBe('Ador')
    expect(transposeKeyName('G', 3)).toBe('Bb')
    expect(transposeKeyName('?', 2)).toBe('?')
  })
})

describe('copy, paste and drag of tab columns', () => {
  const sec: TuneSection = { id: 's', name: 'S', phrases: [[74, 76, 78].map((p) => ({ pitch: p, beats: 1 })), [79, 81].map((p) => ({ pitch: p, beats: 1 }))] }
  const pitches = (s: TuneSection) => s.phrases.flat().map((n) => n.pitch)

  it('copies and pastes a range after the marker', () => {
    const copied = sliceNotes(sec, 0, 1)
    expect(copied.map((n) => n.pitch)).toEqual([74, 76])
    expect(pitches(insertNotes(sec, 4, copied))).toEqual([74, 76, 78, 79, 81, 74, 76])
    expect(pitches(insertNotes(sec, 0, copied, false))).toEqual([74, 76, 74, 76, 78, 79, 81])
    expect(pitches(removeRange(sec, 1, 3))).toEqual([74, 81])
  })

  it('drags a range to another gap, forwards and backwards', () => {
    const fwd = moveRange(sec, 0, 1, 4)
    expect(pitches(fwd.section)).toEqual([78, 79, 74, 76, 81])
    expect([fwd.from, fwd.to]).toEqual([2, 3])
    const back = moveRange(sec, 3, 4, 0)
    expect(pitches(back.section)).toEqual([79, 81, 74, 76, 78])
    expect(pitches(moveRange(sec, 1, 2, 2).section)).toEqual(pitches(sec)) // dropped onto itself
    expect(pitches(moveRange(sec, 0, 0, 5).section)).toEqual([76, 78, 79, 81, 74])
  })

  const shape = (s: TuneSection) => s.phrases.map((p) => p.map((n) => n.pitch))

  it('keeps phrase and line breaks inside a copied range', () => {
    const lined: TuneSection = { ...sec, lineBreaks: [1] }
    const clip = sliceClip(lined, 1, 3) // 76 78 | 79
    expect(clip.breaks).toEqual([2])
    expect(clip.lines).toEqual([2])
    const pasted = insertClip(lined, 4, clip)
    expect(shape(pasted)).toEqual([[74, 76, 78], [79, 81, 76, 78], [79]])
    expect(pasted.lineBreaks).toEqual([1, 2])
    // a range that starts on a phrase boundary has no break before its first note
    expect(sliceClip(sec, 3, 4).breaks).toEqual([])
  })

  it('moves phrase breaks along when dragging', () => {
    const moved = moveRange(sec, 1, 3, 5) // drag "76 78 | 79" to the end
    expect(shape(moved.section)).toEqual([[74], [81, 76, 78], [79]])
  })
})

describe('trill', () => {
  const flicks = (duration: number) => ornamentSegments(74, duration, { type: 'trill', hole: 3 }).filter((s) => s.midi !== 74).length

  it('keeps the same fast rate, so longer notes get more flicks', () => {
    const short = ornamentSegments(74, 0.5, { type: 'trill', hole: 3 })
    const long = ornamentSegments(74, 2, { type: 'trill', hole: 3 })
    expect(short[1].at).toBeCloseTo(TRILL_STEP_SEC)
    expect(long[1].at).toBeCloseTo(TRILL_STEP_SEC)
    expect(long[2].at - long[1].at).toBeCloseTo(TRILL_STEP_SEC)
    expect(flicks(2)).toBeGreaterThan(flicks(1))
    expect(flicks(1)).toBeGreaterThan(flicks(0.5))
    expect(flicks(2)).toBe(Math.floor((2 / TRILL_STEP_SEC - 1) / 2))
  })

  it('flicks the ringed hole and ends on the main note', () => {
    const segs = ornamentSegments(74, 1, { type: 'trill', hole: 3 })
    // lifting the third finger off a low D sounds higher
    expect(segs[1].midi).toBe(gracePitch(74, { type: 'trill', hole: 3 }))
    expect(segs[1].midi).toBeGreaterThan(74)
    expect(segs[segs.length - 1].midi).toBe(74)
    expect(segs[segs.length - 1].at).toBeLessThanOrEqual(1 - TRILL_STEP_SEC + 1e-9)
  })

  it('still trills a very short note and round-trips in the tab text', () => {
    expect(flicks(0.1)).toBe(1)
    const text = 't:E^T4*2'
    const { phrases } = parseTabText(text)
    expect(phrases[0][0].ornament).toEqual({ type: 'trill', hole: 4 })
    expect(sectionToTabText({ id: 's', name: 'A', phrases })).toContain('^T4')
  })
})
