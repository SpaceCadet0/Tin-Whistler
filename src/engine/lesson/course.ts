import { LESSONS } from '../../data/lessons/course'
import type { PlayerLevel } from '../../state/settings'
import type { Lesson } from './types'

export type LessonStatus = 'done' | 'next' | 'available' | 'ahead'

/** Lessons a player of this level can treat as already covered. */
export function skippedFor(level: PlayerLevel): Set<string> {
  if (level === 'some') return new Set(LESSONS.filter((l) => l.level === 1 && l.difficulty <= 1).map((l) => l.id))
  if (level === 'returning') return new Set(LESSONS.filter((l) => l.level <= 2).map((l) => l.id))
  return new Set()
}

const isCovered = (id: string, completed: Record<string, unknown>, skipped: Set<string>) => !!completed[id] || skipped.has(id)

export function nextLesson(completed: Record<string, unknown>, level: PlayerLevel): Lesson | undefined {
  const skipped = skippedFor(level)
  return LESSONS.find((l) => !completed[l.id] && !skipped.has(l.id) && l.prerequisites.every((p) => isCovered(p, completed, skipped)))
    ?? LESSONS.find((l) => !completed[l.id])
}

/**
 * Nothing is hard-locked (players may always skip ahead), but lessons whose prerequisites
 * aren't met are shown as "ahead".
 */
export function lessonStatus(lesson: Lesson, completed: Record<string, unknown>, level: PlayerLevel): LessonStatus {
  if (completed[lesson.id]) return 'done'
  if (nextLesson(completed, level)?.id === lesson.id) return 'next'
  const skipped = skippedFor(level)
  return lesson.prerequisites.every((p) => isCovered(p, completed, skipped)) ? 'available' : 'ahead'
}

export function courseProgress(completed: Record<string, unknown>): { done: number; total: number; fraction: number } {
  const done = LESSONS.filter((l) => completed[l.id]).length
  return { done, total: LESSONS.length, fraction: done / LESSONS.length }
}

/** Notes the learner has been introduced to (from completed or skipped lessons). */
export function learnedNotes(completed: Record<string, unknown>, level: PlayerLevel): string[] {
  const skipped = skippedFor(level)
  const notes = LESSONS.filter((l) => isCovered(l.id, completed, skipped)).flatMap((l) => l.notes)
  return [...new Set(notes)]
}
