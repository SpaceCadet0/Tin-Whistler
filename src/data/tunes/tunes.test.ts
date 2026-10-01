import { describe, expect, it } from 'vitest'
import { sectionNotes } from '../../music/tune'
import { whistleLabel } from '../../music/whistles'
import { BUILTIN_TUNES } from '.'
import { auldLangSyne, butterfly, cooleysReel, saints, scarboroughFair } from './abcTunes'
import { thePrayer } from './thePrayer'

const labels = (t: typeof saints, n: number) =>
  t.sections.flatMap(sectionNotes).filter((x) => x.pitch != null).slice(0, n).map((x) => whistleLabel(x.pitch!))

describe('ABC-defined built-in tunes', () => {
  it('cover difficulties 1 to 5', () => {
    expect([saints, auldLangSyne, scarboroughFair, cooleysReel, butterfly].map((t) => t.difficulty)).toEqual([1, 2, 3, 4, 5])
  })

  it('read in the right octave, without transposing', () => {
    expect(labels(saints, 5)).toEqual(['D', 'F#', 'G', 'A', 'D'])
    expect(labels(auldLangSyne, 6)).toEqual(['D', 'G', 'F#', 'G', 'B', 'A'])
    expect(labels(scarboroughFair, 4)).toEqual(['E', 'E', 'B', 'B'])
    expect(labels(cooleysReel, 4)).toEqual(['E', 'B', 'B', 'A'])
    expect(labels(butterfly, 4)).toEqual(['B', 'E', 'G', 'E'])
  })

  it('keep every bar the right length', () => {
    for (const t of [auldLangSyne, cooleysReel, butterfly]) {
      for (const s of t.sections) {
        const total = sectionNotes(s).reduce((a, n) => a + n.beats, 0)
        // a part may borrow up to one beat for a pickup (e.g. Cooley's A part ends a beat short)
        const rem = total % t.beatsPerBar!
        expect(rem <= 1 || rem >= t.beatsPerBar! - 1).toBe(true)
      }
    }
  })

  it('carry ornaments and compound-time settings', () => {
    expect(cooleysReel.sections[1].phrases.flat().filter((n) => n.ornament?.type === 'roll')).toHaveLength(4)
    expect(butterfly).toMatchObject({ meter: '9/8', pulse: 1.5, beatsPerBar: 4.5, type: 'jig' })
    expect(butterfly.sections).toHaveLength(3)
    expect([saints, auldLangSyne, scarboroughFair].map((t) => t.type)).toEqual(['song', 'song', 'song'])
    expect(cooleysReel.type).toBe('reel')
  })

  it('are unique and ordered by difficulty', () => {
    const ids = BUILTIN_TUNES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(BUILTIN_TUNES).toHaveLength(13)
  })
})

describe('The Prayer (transcribed from video)', () => {
  const notes = thePrayer.sections.flatMap(sectionNotes)

  it('follows the tab in four sections', () => {
    expect(thePrayer.sections).toHaveLength(4)
    expect(labels(thePrayer, 8)).toEqual(['E', 'E', 'B', 'B', 'A', 'A', 'G', 'G'])
    expect(notes.filter((n) => n.pitch != null)).toHaveLength(64 + 55 + 41 + 21)
  })

  it('keeps the performance timing (1 beat = 1 s at 60 bpm)', () => {
    const total = notes.reduce((a, n) => a + n.beats, 0)
    // first note at 4.39 s, last one fades at ~148.7 s in the recording
    expect(total).toBeGreaterThan(143)
    expect(total).toBeLessThan(146)
    expect(thePrayer.bpm).toBe(60)
  })

  it('marks cuts and slides with their ringed holes', () => {
    const slides = notes.filter((n) => n.ornament?.type === 'slide')
    expect(slides.length).toBe(11)
    expect(slides.every((n) => n.ornament?.hole)).toBe(true)
  })
})
