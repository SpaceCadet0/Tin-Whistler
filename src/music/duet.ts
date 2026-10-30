import { parseTabText } from './tabText'
import type { DuetPart, Tune, TuneNote, TuneSection } from './types'
import { getWhistle } from './whistles'

/** Duets: tunes for two whistles, often in different keys, that take turns or play together. */

export const isDuet = (tune: Tune): boolean => (tune.duet?.parts.length ?? 0) > 1

/** A duet section from each part's tab text (same beats in each; a part rests where it is silent). */
export function duetSection(id: string, name: string, texts: string[], parts: DuetPart[]): TuneSection {
  const sectionParts = texts.map((text, i) => {
    const { phrases, lineBreaks } = parseTabText(text, parts[i].whistle)
    return { phrases, lineBreaks: lineBreaks.length ? lineBreaks : undefined }
  })
  return { id, name, phrases: sectionParts[0].phrases, lineBreaks: sectionParts[0].lineBreaks, parts: sectionParts }
}

/** The part that sounds first (a listen from the start shouldn't open on the other part's rests). */
export function leadingPart(tune: Tune): number {
  if (!isDuet(tune)) return 0
  let best = 0
  let bestAt = Infinity
  tune.duet!.parts.forEach((_, i) => {
    let at = 0
    for (const s of tune.sections) {
      const notes = s.parts?.[i]?.phrases.flat() ?? []
      const k = notes.findIndex((n) => n.pitch != null)
      if (k >= 0) {
        at += notes.slice(0, k).reduce((sum, n) => sum + n.beats, 0)
        break
      }
      at += notes.reduce((sum, n) => sum + n.beats, 0)
    }
    if (at < bestAt) {
      best = i
      bestAt = at
    }
  })
  return best
}

/** A part's name by its whistle: "Low D", "High D", "High C"… (the same in every language). */
export function partName(whistle: string): string {
  if (whistle === 'lowD') return 'Low D'
  return `High ${getWhistle(whistle).label.replace(/ whistle$/, '')}`
}

/**
 * The partner's notes under each of my notes: the ones that start while it sounds (a rest of mine
 * gathers everything the partner plays meanwhile). For the shadow over the tab.
 */
export function partnerUnder(mine: TuneNote[], partner: TuneNote[]): TuneNote[][] {
  const EPS = 1e-6
  const starts: number[] = []
  let beat = 0
  for (const n of partner) {
    starts.push(beat)
    beat += n.beats
  }
  let at = 0
  return mine.map((n) => {
    const from = at
    at += n.beats
    return partner.filter((p, k) => p.pitch != null && starts[k] >= from - EPS && starts[k] < at - EPS)
  })
}

/**
 * The tune as one part's player sees it: that part's whistle and tab, with the other part as the
 * partner of every section (played along, shown as a shadow). Not a duet: the tune itself.
 */
export function tuneForPart(tune: Tune, part: number): Tune {
  if (!isDuet(tune)) return tune
  const parts = tune.duet!.parts
  const other = (part + 1) % parts.length
  return {
    ...tune,
    whistle: parts[part].whistle,
    sections: tune.sections.map((s) => {
      const mine = s.parts?.[part]
      const theirs = s.parts?.[other]
      if (!mine || !theirs) return s
      return { ...s, phrases: mine.phrases, lineBreaks: mine.lineBreaks, partner: { whistle: parts[other].whistle, notes: theirs.phrases.flat() } }
    }),
  }
}
