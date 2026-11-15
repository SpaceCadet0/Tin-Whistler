import { describe, expect, it } from 'vitest'
import { BUILTIN_TUNES, builtinTune } from '../data/tunes'
import { COLLECTIONS, collectionById, knownOffsets, tuneOfTheDay, tuneOffsets, withinReach, WITHIN_REACH } from './collections'

const nobody = { knownOffsets: new Set<number>() }
const player = (notes: string[]) => ({ knownOffsets: knownOffsets(notes) })

describe('collections', () => {
  it('fills every themed shelf with built-in tunes', () => {
    for (const c of COLLECTIONS) {
      if (c.id === WITHIN_REACH) continue
      expect(BUILTIN_TUNES.filter((t) => c.matches(t, nobody)).length, c.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('has unique ids and finds a collection by id', () => {
    expect(new Set(COLLECTIONS.map((c) => c.id)).size).toBe(COLLECTIONS.length)
    expect(collectionById('session')?.title.en).toBe('Session favourites')
    expect(collectionById('nope')).toBeUndefined()
  })

  it('puts a tune within reach only when every one of its notes is known', () => {
    const buns = builtinTune('hot-cross-buns')!
    expect(withinReach(buns, player(['B', 'A', 'G']))).toBe(true)
    expect(withinReach(buns, player(['B', 'A']))).toBe(false)
    expect(withinReach(buns, nobody)).toBe(false)
  })

  it('compares fingerings, so a tune for another whistle counts by its holes, not its pitch', () => {
    const prayer = builtinTune('the-prayer')!
    expect(prayer.whistle).toBe('C')
    expect(Math.min(...tuneOffsets(prayer))).toBeGreaterThanOrEqual(0)
    const everything = { knownOffsets: new Set(Array.from({ length: 30 }, (_, i) => i)) }
    expect(withinReach(prayer, everything)).toBe(true)
  })
})

describe('tune of the day', () => {
  const beginner = { ...nobody, level: 'beginner' as const, mastered: new Set<string>() }

  it('is the same all day and changes between days', () => {
    const a = tuneOfTheDay(BUILTIN_TUNES, '2026-11-16', beginner)
    expect(tuneOfTheDay(BUILTIN_TUNES, '2026-11-16', beginner)).toBe(a)
    const days = Array.from({ length: 14 }, (_, i) => tuneOfTheDay(BUILTIN_TUNES, `2026-11-${String(i + 1).padStart(2, '0')}`, beginner)!.id)
    expect(new Set(days).size).toBeGreaterThan(5)
  })

  it('keeps to easy tunes for a beginner who has learnt nothing yet', () => {
    for (let d = 1; d <= 28; d++) expect(tuneOfTheDay(BUILTIN_TUNES, `2026-02-${d}`, beginner)!.difficulty).toBeLessThanOrEqual(2)
  })

  it('picks from the tunes within reach once there are enough of them', () => {
    const p = { ...player(['D', 'E', 'F#', 'G', 'A', 'B', 'C#', "D'"]), level: 'beginner' as const, mastered: new Set<string>() }
    for (let d = 1; d <= 28; d++) expect(withinReach(tuneOfTheDay(BUILTIN_TUNES, `2026-03-${d}`, p)!, p)).toBe(true)
  })

  it('skips mastered tunes and copes with an empty library', () => {
    const allButOne = new Set(BUILTIN_TUNES.slice(1).map((t) => t.id))
    expect(tuneOfTheDay(BUILTIN_TUNES, '2026-11-16', { ...nobody, level: 'returning', mastered: allButOne })).toBe(BUILTIN_TUNES[0])
    expect(tuneOfTheDay([], '2026-11-16', beginner)).toBeUndefined()
  })
})
