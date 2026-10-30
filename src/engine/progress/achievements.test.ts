import { beforeEach, describe, expect, it } from 'vitest'
import { snapshot, useProgress } from '../../state/progress'
import { ACHIEVEMENTS, newlyUnlocked } from './achievements'

const unlockedNow = () => newlyUnlocked(snapshot(useProgress.getState()), {}).map((a) => a.id)

describe('achievements', () => {
  beforeEach(() => useProgress.getState().resetAll())

  it('gives every achievement its own id and icon', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    expect(new Set(ACHIEVEMENTS.map((a) => a.icon)).size).toBe(ACHIEVEMENTS.length)
  })

  it('counts a whole tune with every note right as a clean run, and a part of a duet as a duet', () => {
    useProgress.getState().recordTune('t1', null, 0.9, 1, 'T', { notes: 1, duet: true })

    expect(unlockedNow()).toEqual(expect.arrayContaining(['clean-run', 'duet']))
  })

  it('needs the whole tune for a clean run and a decent score for a duet', () => {
    useProgress.getState().recordTune('t1', 's1', 1, 1, 'T', { notes: 1, duet: true })
    useProgress.getState().recordTune('t1', null, 0.3, 1, 'T', { notes: 0.4, duet: true })

    expect(unlockedNow()).not.toContain('clean-run')
    expect(unlockedNow()).not.toContain('duet')
  })

  it('counts quick fingers from 120% tempo and the composer from a saved edit', () => {
    useProgress.getState().recordTune('t1', null, 0.8, 1.2, 'T')
    useProgress.getState().recordEdit()

    expect(unlockedNow()).toEqual(expect.arrayContaining(['quick-fingers', 'composer']))
  })

  it('counts an hour in one day as a marathon', () => {
    useProgress.getState().addPracticeTime(59 * 60)
    expect(unlockedNow()).not.toContain('marathon')

    useProgress.getState().addPracticeTime(60)
    expect(unlockedNow()).toContain('marathon')
  })
})
