import { isDuet } from './duet'
import type { LocalizedText, Tune, TuneSection } from './types'

/** How many tunes a set may hold: sessions rarely string together more. */
export const MAX_SET_TUNES = 4
export const SET_TAG = 'set'

export const isSet = (tune: Tune): boolean => (tune.setOf?.length ?? 0) > 0

const pulseOf = (t: Tune) => t.pulse ?? 1
const pulsesPerBar = (t: Tune) => (t.beatsPerBar ?? 4) / pulseOf(t)

/**
 * Two tunes can follow each other without a stop: same whistle, same metre, the same number of
 * pulses in a bar. (They may still count their beats differently, e.g. a jig written in eighths
 * and one written in quarters: buildSet rescales those.)
 */
export function canJoinSet(a: Tune, b: Tune): boolean {
  if (isDuet(a) || isDuet(b) || isSet(a) || isSet(b)) return false
  return a.whistle === b.whistle && (a.meter ?? '4/4') === (b.meter ?? '4/4') && Math.abs(pulsesPerBar(a) - pulsesPerBar(b)) < 1e-9
}

/** A section with every note length multiplied, so a tune counted in other beats fits the set's. */
function rescale(section: TuneSection, factor: number): TuneSection {
  const copy = structuredClone(section)
  if (factor === 1) return copy
  // the second voice is timed in the tune's own beats: without it the section still plays right
  const { secondVoice: _dropped, ...rest } = copy
  return { ...rest, phrases: copy.phrases.map((p) => p.map((n) => ({ ...n, beats: n.beats * factor }))) }
}

export const setTitle = (tunes: Tune[]): string => tunes.map((t) => t.title).join(' / ')

/**
 * Tunes played one after another as one, the way a session plays them: the sections of each in
 * order, at the first tune's tempo and in its beats. A tune with several sections keeps their
 * names under its own.
 */
export function buildSet(tunes: Tune[], meta: { id: string; title?: string; description?: LocalizedText; origin?: Tune['origin'] }): Tune {
  if (tunes.length < 2 || tunes.length > MAX_SET_TUNES) throw new Error(`A set holds 2 to ${MAX_SET_TUNES} tunes`)
  const [first, ...rest] = tunes
  const stranger = rest.find((t) => !canJoinSet(first, t))
  if (stranger) throw new Error(`"${stranger.title}" does not fit a set with "${first.title}"`)
  return {
    id: meta.id,
    title: meta.title ?? setTitle(tunes),
    composer: first.composer,
    description: meta.description,
    origin: meta.origin ?? 'user',
    source: meta.origin === 'builtin' ? undefined : 'editor',
    type: first.type,
    whistle: first.whistle,
    key: first.key,
    meter: first.meter,
    bpm: first.bpm,
    pulse: first.pulse,
    beatsPerBar: first.beatsPerBar,
    difficulty: Math.max(...tunes.map((t) => t.difficulty)),
    tags: [SET_TAG],
    setOf: tunes.map((t) => t.id),
    sections: tunes.flatMap((t, i) =>
      t.sections.map((s) => ({
        ...rescale(s, pulseOf(first) / pulseOf(t)),
        id: `t${i + 1}-${s.id}`,
        name: t.sections.length > 1 ? `${t.title}: ${s.name}` : t.title,
      })),
    ),
  }
}
