import type { LocalizedText, Tune } from '../music/types'
import { sectionNotes } from '../music/tune'
import { isSet } from '../music/tuneSet'
import { getWhistle, noteById } from '../music/whistles'

/** What a collection may need to know about the player. */
export interface PlayerContext {
  /** Fingerings the player has learnt, as semitones above the whistle's bottom note. */
  knownOffsets: ReadonlySet<number>
}

export interface Collection {
  id: string
  title: LocalizedText
  matches: (tune: Tune, player: PlayerContext) => boolean
}

const hasTag = (tune: Tune, ...tags: string[]) => tags.some((tag) => tune.tags?.includes(tag))
const hasOrnaments = (tune: Tune) => tune.sections.some((s) => sectionNotes(s).some((n) => n.ornament))

/** Fingerings a tune asks for: semitones above the bottom note of the whistle it is written for. */
export function tuneOffsets(tune: Tune): number[] {
  const base = getWhistle(tune.whistle).baseMidi
  const offsets = new Set<number>()
  for (const s of tune.sections) for (const n of sectionNotes(s)) if (n.pitch != null) offsets.add(Math.round(n.pitch) - base)
  return [...offsets]
}

/** Note names from the lessons ("B", "D'") as fingerings: semitones above the D whistle's bottom note. */
export function knownOffsets(noteIds: string[]): Set<number> {
  const base = getWhistle('D').baseMidi
  return new Set(noteIds.flatMap((id) => {
    const note = noteById(id)
    return note ? [note.midi - base] : []
  }))
}

/** Every note of the tune is one the player has already learnt. */
export function withinReach(tune: Tune, player: PlayerContext): boolean {
  if (!player.knownOffsets.size) return false
  const offsets = tuneOffsets(tune)
  return offsets.length > 0 && offsets.every((o) => player.knownOffsets.has(o))
}

export const WITHIN_REACH = 'within-reach'

/** Themed shelves of the library, in the order they are offered. */
export const COLLECTIONS: Collection[] = [
  { id: WITHIN_REACH, title: { en: 'Within your reach', ru: 'Вам уже по силам', ga: 'Faoi do chumas' }, matches: withinReach },
  { id: 'first-steps', title: { en: 'First steps', ru: 'Первые шаги', ga: 'Na chéad chéimeanna' }, matches: (t) => t.difficulty <= 1 },
  { id: 'sets', title: { en: 'Sets', ru: 'Сеты', ga: 'Seiteanna' }, matches: isSet },
  { id: 'session', title: { en: 'Session favourites', ru: 'Для сейшена', ga: 'Rogha an tseisiúin' }, matches: (t) => hasTag(t, 'session') },
  { id: 'sing-along', title: { en: 'Songs to sing along', ru: 'Песни, которым подпевают', ga: 'Amhráin le canadh' }, matches: (t) => t.type === 'song' || t.type === 'shanty' },
  { id: 'sea', title: { en: 'Songs of the sea', ru: 'Морские песни', ga: 'Amhráin na farraige' }, matches: (t) => t.type === 'shanty' || hasTag(t, 'shanty') },
  { id: 'slow', title: { en: 'Slow and tender', ru: 'Медленные и нежные', ga: 'Mall agus caoin' }, matches: (t) => t.type === 'air' || t.type === 'waltz' || t.type === 'hymn' || hasTag(t, 'slow', 'air') },
  { id: 'ornamented', title: { en: 'With ornaments', ru: 'С украшениями', ga: 'Le maisiúcháin' }, matches: hasOrnaments },
  { id: 'winter', title: { en: 'Christmas and winter', ru: 'Рождество и зима', ga: 'An Nollaig agus an geimhreadh' }, matches: (t) => t.type === 'carol' || hasTag(t, 'christmas') },
  { id: 'screen', title: { en: 'From games and films', ru: 'Из игр и кино', ga: 'Ó chluichí agus ó scannáin' }, matches: (t) => t.type === 'soundtrack' },
]

export const collectionById = (id: string): Collection | undefined => COLLECTIONS.find((c) => c.id === id)

/** A small stable number from a string, so the same day always picks the same tune. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Hardest tune offered as the tune of the day while nothing is within reach yet, by experience. */
const DAILY_MAX_DIFFICULTY = { beginner: 2, some: 3, returning: 5 } as const
/** With fewer tunes within reach than this, the day's tune would repeat too often to be a surprise. */
const MIN_REACH_POOL = 5

/**
 * One tune for the day, the same all day: from those within the player's reach when there are
 * enough of them, otherwise from those no harder than their experience allows. Tunes already
 * mastered are left out while anything else remains.
 */
export function tuneOfTheDay(
  tunes: Tune[],
  day: string,
  player: PlayerContext & { level: keyof typeof DAILY_MAX_DIFFICULTY; mastered: ReadonlySet<string> },
): Tune | undefined {
  const fresh = tunes.filter((t) => !player.mastered.has(t.id))
  const candidates = fresh.length ? fresh : tunes
  const reach = candidates.filter((t) => withinReach(t, player))
  const byLevel = candidates.filter((t) => t.difficulty <= DAILY_MAX_DIFFICULTY[player.level])
  const pool = reach.length >= MIN_REACH_POOL ? reach : byLevel.length ? byLevel : candidates
  return pool.length ? pool[hash(day) % pool.length] : undefined
}
