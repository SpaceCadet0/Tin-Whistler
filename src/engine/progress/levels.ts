import { dayKeyOffset, todayKey } from '../../lib/storage'

/** XP awarded per activity. */
export const XP = {
  correctNote: 2,
  exercise: 10,
  lesson: 40,
  tuneSection: 25,
  tuneLearned: 100,
  dailyPractice: 50,
  earCorrect: 3,
  gameHit: 1,
} as const

/** XP needed to reach level n: 0, 100, 300, 600, 1000, … */
export const xpForLevel = (n: number): number => 50 * n * (n - 1)

export function levelFromXp(xp: number): { level: number; current: number; next: number; progress: number } {
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2))
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, current, next, progress: (xp - current) / (next - current) }
}

/** Consecutive practice days ending today (or yesterday, so the streak survives until tonight). */
export function computeStreak(activeDays: Set<string>, today = new Date()): number {
  let offset = activeDays.has(todayKey(today)) ? 0 : -1
  let streak = 0
  while (activeDays.has(dayKeyOffset(offset, today))) {
    streak++
    offset--
  }
  return streak
}

/** Exponential moving average mastery update (0…1). */
export const updateMastery = (prev: number, hit: boolean, weight = 0.2): number => prev * (1 - weight) + (hit ? 1 : 0) * weight
