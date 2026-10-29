import { describe, expect, it } from 'vitest'
import { alignNotes, HOP, type PitchFrame } from './align'
import { fixBySound } from './soundFix'

const NOTE = 0.5
/** A recording of these notes, NOTE seconds each, with a short dip in level between them. */
function played(notes: (number | null)[]): PitchFrame[] {
  const per = Math.round(NOTE / HOP)
  return notes.flatMap((midi, k) =>
    Array.from({ length: per }, (_, i): PitchFrame => {
      const dip = i < 4
      return { t: (k * per + i) * HOP, midi: dip ? null : midi, rms: dip ? 0.01 : 0.3, clarity: dip ? 0.3 : 0.95 }
    }),
  )
}
const anyNote = () => true

describe('notes put right by the sound', () => {
  it('replaces a lone note the tab has wrong with the one clearly played', () => {
    const frames = played([79, 74, 79, 74, 79])
    const tab = [79, 74, 76, 74, 79]
    const fix = fixBySound(frames, tab, alignNotes(frames, tab), anyNote)
    expect(fix.fixed).toEqual([2])
    expect(fix.pitches).toEqual([79, 74, 79, 74, 79])
  })

  it('leaves the tab alone where the recording matches it', () => {
    const frames = played([74, 76, 78, 79, 81])
    const tab = [74, 76, 78, 79, 81]
    expect(fixBySound(frames, tab, alignNotes(frames, tab), anyNote).fixed).toEqual([])
  })

  it('takes nothing from a run of misfits: the alignment slipped, not the tab', () => {
    const frames = played([74, 76, 81, 83, 85, 81, 79])
    const tab = [74, 76, 78, 79, 81, 81, 79]
    expect(fixBySound(frames, tab, alignNotes(frames, tab), anyNote).fixed).toEqual([])
  })

  it('keeps the tab when the whistle has no note that fits', () => {
    const frames = played([79, 74, 79, 74, 79])
    const tab = [79, 74, 76, 74, 79]
    expect(fixBySound(frames, tab, alignNotes(frames, tab), (m) => m === 74 || m === 76).fixed).toEqual([])
  })

  it('leaves the first and last notes of a page as written', () => {
    const frames = played([74, 79, 74, 79, 74, 79])
    const tab = [76, 79, 74, 79, 74, 77]
    expect(fixBySound(frames, tab, alignNotes(frames, tab), anyNote).fixed).toEqual([])
  })

  it('changes nothing on a page that fits the recording poorly throughout', () => {
    const frames = played([74, 79, 74, 79, 74, 79, 74, 79, 74, 79])
    const tab = [74, 79, 76, 79, 74, 81, 74, 81, 76, 79]
    expect(fixBySound(frames, tab, alignNotes(frames, tab), anyNote).fixed).toEqual([])
  })
})
