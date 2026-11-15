import { describe, expect, it } from 'vitest'
import { ACTIVITY_GRACE_MS, activeMs } from './activity'

describe('activeMs', () => {
  it('credits nothing when the screen was open with no activity', () => {
    expect(activeMs(100_000, 115_000, 0)).toBe(0)
  })

  it('credits the whole interval while the player keeps playing', () => {
    expect(activeMs(100_000, 115_000, 114_000)).toBe(15_000)
  })

  it('stops crediting once the grace period after the last activity has passed', () => {
    const last = 102_000
    expect(activeMs(100_000, 130_000, last)).toBe(last + ACTIVITY_GRACE_MS - 100_000)
  })

  it('credits nothing for an interval that starts after the grace period ended', () => {
    expect(activeMs(200_000, 215_000, 100_000)).toBe(0)
  })
})
