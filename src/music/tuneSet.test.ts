import { describe, expect, it } from 'vitest'
import { builtinTune } from '../data/tunes'
import { sectionNotes } from './tune'
import { buildSet, canJoinSet, isSet, setTitle } from './tuneSet'

const tune = (id: string) => builtinTune(id)!

describe('tune sets', () => {
  it('joins tunes in the same metre and for the same whistle only', () => {
    expect(canJoinSet(tune('kesh-jig'), tune('morrisons-jig'))).toBe(true)
    expect(canJoinSet(tune('kesh-jig'), tune('silver-spear'))).toBe(false)
    expect(canJoinSet(tune('kesh-jig'), tune('the-prayer'))).toBe(false)
  })

  it('plays every section of every tune in order, at the first tune\'s tempo', () => {
    const kesh = tune('kesh-jig')
    const morrisons = tune('morrisons-jig')
    const set = buildSet([kesh, morrisons], { id: 'set-1' })
    expect(set.title).toBe(setTitle([kesh, morrisons]))
    expect(set.sections).toHaveLength(kesh.sections.length + morrisons.sections.length)
    expect(set.bpm).toBe(kesh.bpm)
    expect(set.setOf).toEqual(['kesh-jig', 'morrisons-jig'])
    expect(isSet(set)).toBe(true)
    expect(new Set(set.sections.map((s) => s.id)).size).toBe(set.sections.length)
    const notes = (t: typeof kesh) => t.sections.flatMap(sectionNotes).length
    expect(notes(set)).toBe(notes(kesh) + notes(morrisons))
    expect(set.sections[0].name).toContain(kesh.title)
  })

  it('rescales a tune counted in other beats to the first tune\'s', () => {
    const kesh = tune('kesh-jig')
    const morrisons = tune('morrisons-jig')
    expect(kesh.pulse).not.toBe(morrisons.pulse)
    const beats = (sections: typeof kesh.sections) => sections.flatMap(sectionNotes).reduce((a, n) => a + n.beats, 0)
    const set = buildSet([morrisons, kesh], { id: 'set-3' })
    const keshInSet = set.sections.slice(morrisons.sections.length)
    expect(beats(keshInSet)).toBeCloseTo(beats(kesh.sections) * (morrisons.pulse! / kesh.pulse!))
    expect(set.pulse).toBe(morrisons.pulse)
  })

  it('does not share notes with the tunes it was built from', () => {
    const kesh = tune('kesh-jig')
    const set = buildSet([kesh, tune('morrisons-jig')], { id: 'set-2' })
    expect(set.sections[0].phrases[0]).not.toBe(kesh.sections[0].phrases[0])
    expect(set.sections[0].phrases[0]).toEqual(kesh.sections[0].phrases[0])
  })

  it('refuses a single tune, too many tunes, tunes that do not fit, and sets of sets', () => {
    const kesh = tune('kesh-jig')
    expect(() => buildSet([kesh], { id: 'x' })).toThrow()
    expect(() => buildSet([kesh, kesh, kesh, kesh, kesh], { id: 'x' })).toThrow()
    expect(() => buildSet([kesh, tune('silver-spear')], { id: 'x' })).toThrow(/does not fit/)
    const set = buildSet([kesh, tune('morrisons-jig')], { id: 'x' })
    expect(canJoinSet(set, kesh)).toBe(false)
  })
})
