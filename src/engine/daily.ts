import type { LocalizedText } from '../music/types'
import { weakNotes } from './adaptive/smartPractice'
import type { NoteStat } from '../state/progress'

export type DailyBlockKind = 'warmup' | 'notes' | 'melody' | 'challenge'
export type ChallengeKind = 'sequence' | 'ear' | 'game'

export interface DailyBlock {
  kind: DailyBlockKind
  title: LocalizedText
  seconds: number
  /** Notes to focus on (warm-up long tones / note drill). */
  notes: string[]
  tuneId?: string
  challenge?: ChallengeKind
}

const TITLES: Record<DailyBlockKind, LocalizedText> = {
  warmup: { en: 'Warm-up: long tones', ru: 'Разминка: длинные ноты', ga: 'Téamh suas: nótaí fada' },
  notes: { en: 'Note practice', ru: 'Тренировка нот', ga: 'Cleachtadh nótaí' },
  melody: { en: 'Melody', ru: 'Мелодия', ga: 'Séis' },
  challenge: { en: 'Challenge', ru: 'Испытание', ga: 'Dúshlán' },
}

/** Split of a 10-minute session: 2 / 3 / 3 / 2 minutes, scaled to the daily goal. */
const SPLIT: [DailyBlockKind, number][] = [
  ['warmup', 0.2],
  ['notes', 0.3],
  ['melody', 0.3],
  ['challenge', 0.2],
]

export function buildDailyPlan(opts: {
  goalMinutes: number
  known: string[]
  stats: Record<string, NoteStat>
  tuneId: string
  dayIndex: number
}): DailyBlock[] {
  const known = opts.known.length ? opts.known : ['B', 'A', 'G']
  const weak = weakNotes(opts.stats).map((w) => w.note).filter((n) => known.includes(n))
  const focus = [...new Set([...weak, ...known])].slice(0, 4)
  const challenges: ChallengeKind[] = ['sequence', 'ear', 'game']
  return SPLIT.map(([kind, share]) => ({
    kind,
    title: TITLES[kind],
    seconds: Math.round(opts.goalMinutes * 60 * share),
    notes: kind === 'warmup' ? [known.includes('D') ? 'D' : known[known.length - 1], known.includes('A') ? 'A' : known[0]] : focus,
    tuneId: kind === 'melody' ? opts.tuneId : undefined,
    challenge: kind === 'challenge' ? challenges[opts.dayIndex % challenges.length] : undefined,
  }))
}
