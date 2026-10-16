import { describe, expect, it } from 'vitest'
import { tapHole, toFingering } from '../music/fingerings'
import type { Fingering } from '../music/types'
import { normalizeTune } from '../music/validateTune'
import { sanitizeProgress } from '../state/progress'
import { sanitizeSettings } from '../state/settings'
import { parseBackup, sanitizeAgainst } from './validate'

describe('stored data guards', () => {
  it('keeps valid settings and drops wrong types, enums and ranges', () => {
    const s = sanitizeSettings({ language: 'ru', theme: 'neon', volume: 7, a4: 442, whistleId: 'C', level: 42, extra: 'x' })
    expect(s).toEqual({ language: 'ru', a4: 442, whistleId: 'C' })
    expect(sanitizeSettings(null)).toEqual({})
    expect(sanitizeSettings('garbage')).toEqual({})
  })

  it('repairs malformed progress instead of crashing', () => {
    const p = sanitizeProgress({
      xp: 120,
      days: { '2026-01-01': { seconds: 60, xp: 5, dailyDone: true }, bad: null },
      noteStats: [],
      achievements: { first: 1, broken: 'x' },
      log: [{ at: 1, kind: 'lesson', label: 'x' }],
      tunerLocks: Number.NaN,
    })
    expect(p.xp).toBe(120)
    // maps are repaired entry by entry: one bad day must not erase the history
    expect(p.days).toEqual({ '2026-01-01': { seconds: 60, xp: 5, dailyDone: true } })
    expect(p.noteStats).toBeUndefined() // wrong type entirely → initial {}
    expect(p.achievements).toEqual({ first: 1 })
    expect(p.log).toHaveLength(1)
    expect(p.tunerLocks).toBeUndefined()
    expect(sanitizeProgress({ tunes: { a: { step: 2 }, b: 'x' } }).tunes).toEqual({ a: { step: 2, sections: {} } })
  })

  it('only accepts real backup files', () => {
    const settings = JSON.stringify({ state: { language: 'en' }, version: 1 })
    expect(parseBackup(JSON.stringify({ settings, progress: 'not json' }))).toEqual({ settings })
    expect(parseBackup('{"progress":"{\\"xp\\":1}"}')).toBeNull()
    expect(parseBackup('[1,2]')).toBeNull()
    expect(parseBackup('<html>')).toBeNull()
  })

  it('restores user tunes from a backup and drops unplayable ones', () => {
    const good = { id: 'u1', title: 'Jig', sections: [{ phrases: [[{ pitch: 74, beats: 1 }]] }] }
    const backup = parseBackup(JSON.stringify({ tunes: [good, { id: 'bad', sections: [] }, 'x'] }))
    expect(backup?.tunes).toHaveLength(1)
    expect(backup?.tunes?.[0].id).toBe('u1')
    expect(parseBackup(JSON.stringify({ tunes: [] }))).toBeNull()
  })

  it('compares shapes against defaults', () => {
    expect(sanitizeAgainst({ a: 1, b: [] as number[], c: {} }, { a: '1', b: [2], c: [] })).toEqual({ b: [2] })
  })

  it('normalizes saved tunes, rejecting unplayable ones', () => {
    const t = normalizeTune({ id: 'u1', sections: [{ phrases: [[{ pitch: 74, beats: 1 }, { pitch: 'x', beats: 1 }], []] }, { phrases: [] }] })
    expect(t).not.toBeNull()
    expect(t!.title).toBe('Untitled')
    expect(t!.bpm).toBe(90)
    expect(t!.sections).toHaveLength(1)
    expect(t!.sections[0].phrases).toEqual([[{ pitch: 74, beats: 1 }]])
    expect(normalizeTune({ id: 'u2', sections: [{ phrases: [[{ pitch: 74, beats: 0 }]] }] })).toBeNull()
    expect(normalizeTune({ sections: [] })).toBeNull()
    expect(normalizeTune(null)).toBeNull()
  })
})

describe('whistle hole taps', () => {
  const fg = (s: string): Fingering => toFingering([...s].map((c) => (c === '1' ? 1 : c === 'h' ? 0.5 : 0)))

  it('toggles covered and open the same way everywhere', () => {
    expect(tapHole(fg('111000'), 0)).toEqual(fg('011000'))
    expect(tapHole(fg('011000'), 0)).toEqual(fg('111000'))
    expect(tapHole(fg('1111h0'), 4)).toEqual(fg('111110'))
  })

  it('offers a half-hole only where it changes the pitch', () => {
    // lowest closed position: covered → open → half → covered
    expect(tapHole(fg('111100'), 3, true)).toEqual(fg('111000'))
    expect(tapHole(fg('111000'), 3, true)).toEqual(fg('111h00'))
    expect(tapHole(fg('111h00'), 3, true)).toEqual(fg('111100'))
    // a hole with covered holes below it never goes half
    expect(tapHole(fg('011100'), 0, true)).toEqual(fg('111100'))
  })

  it('rejects anything but six holes', () => {
    expect(() => toFingering([1, 1, 1])).toThrow()
  })
})
