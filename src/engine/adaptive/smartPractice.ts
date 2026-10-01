import type { NoteStat, SectionProgress } from '../../state/progress'

export type Suggestion =
  | { kind: 'note'; note: string; accuracy: number }
  | { kind: 'transition'; from: string; to: string; missRate: number }

const MIN_ATTEMPTS = 4

/** Notes the player keeps missing, weakest first. */
export function weakNotes(stats: Record<string, NoteStat>): { note: string; mastery: number }[] {
  return Object.entries(stats)
    .filter(([, s]) => s.attempts >= MIN_ATTEMPTS && s.mastery < 0.6)
    .map(([note, s]) => ({ note, mastery: s.mastery }))
    .sort((a, b) => a.mastery - b.mastery)
}

export function weakTransitions(t: Record<string, { attempts: number; misses: number }>) {
  return Object.entries(t)
    .filter(([, v]) => v.attempts >= 3 && v.misses / v.attempts > 0.4)
    .map(([k, v]) => {
      const [from, to] = k.split('>')
      return { from, to, missRate: v.misses / v.attempts }
    })
    .sort((a, b) => b.missRate - a.missRate)
}

/** The single most useful thing to practise right now, if anything stands out. */
export function smartSuggestion(
  stats: Record<string, NoteStat>,
  transitions: Record<string, { attempts: number; misses: number }>,
): Suggestion | null {
  const n = weakNotes(stats)[0]
  const t = weakTransitions(transitions)[0]
  if (t && (!n || t.missRate > 1 - n.mastery)) return { kind: 'transition', ...t }
  if (n) return { kind: 'note', note: n.note, accuracy: n.mastery }
  return null
}

/** Note-trainer difficulty scales with how well the note is known. */
export function trainerParams(mastery: number): { toleranceCents: number; holdMs: number } {
  const m = Math.max(0, Math.min(1, mastery))
  return { toleranceCents: Math.round(50 - m * 25), holdMs: Math.round(400 + m * 500) }
}

/** Sequence length grows with consecutive clean rounds, shrinks after misses. */
export function nextSequenceLength(current: number, success: boolean, min = 3, max = 8): number {
  return Math.max(min, Math.min(max, current + (success ? 1 : -1)))
}

/** Tempo to suggest for the next attempt at a tune section. */
export function recommendTempo(p: SectionProgress | undefined, start = 0.6): number {
  if (!p || p.plays === 0) return start
  if (p.bestScore >= 0.85) return Math.min(1, Math.max(start, p.bestTempo) + 0.1)
  if (p.bestScore < 0.5) return Math.max(0.4, (p.bestTempo || start) - 0.1)
  return Math.max(start, p.bestTempo || start)
}
