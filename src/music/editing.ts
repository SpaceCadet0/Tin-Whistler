import type { TuneNote, TuneSection } from './types'

/** Immutable editing operations on a section, addressed by flat note index. */

export function locate(section: TuneSection, index: number): { phrase: number; offset: number } {
  let i = index
  for (let p = 0; p < section.phrases.length; p++) {
    if (i < section.phrases[p].length) return { phrase: p, offset: i }
    i -= section.phrases[p].length
  }
  const last = section.phrases.length - 1
  return { phrase: last, offset: section.phrases[last].length - 1 }
}

const clone = (s: TuneSection): TuneSection => ({ ...s, phrases: s.phrases.map((p) => [...p]), lineBreaks: s.lineBreaks ? [...s.lineBreaks] : undefined })

export function updateNote(section: TuneSection, index: number, note: TuneNote): TuneSection {
  const s = clone(section)
  const { phrase, offset } = locate(s, index)
  s.phrases[phrase][offset] = note
  return s
}

export function insertNote(section: TuneSection, index: number, note: TuneNote, after: boolean): TuneSection {
  const s = clone(section)
  const { phrase, offset } = locate(s, index)
  s.phrases[phrase].splice(after ? offset + 1 : offset, 0, note)
  return s
}

export function deleteNote(section: TuneSection, index: number): TuneSection {
  const s = clone(section)
  const { phrase, offset } = locate(s, index)
  s.phrases[phrase].splice(offset, 1)
  if (!s.phrases[phrase].length) {
    if (s.phrases.length === 1) {
      s.phrases[0] = [{ pitch: 74, beats: 1 }]
      return s
    }
    s.phrases.splice(phrase, 1)
    s.lineBreaks = s.lineBreaks?.map((b) => (b > phrase ? b - 1 : b)).filter((b) => b > 0)
  }
  return s
}

/** Start a new phrase at `index`; if it already starts one, merge with the previous phrase. */
export function togglePhraseBreak(section: TuneSection, index: number): TuneSection {
  const s = clone(section)
  const { phrase, offset } = locate(s, index)
  if (offset === 0) {
    if (phrase === 0) return s
    s.phrases[phrase - 1] = [...s.phrases[phrase - 1], ...s.phrases[phrase]]
    s.phrases.splice(phrase, 1)
    s.lineBreaks = s.lineBreaks?.filter((b) => b !== phrase).map((b) => (b > phrase ? b - 1 : b))
    return s
  }
  const head = s.phrases[phrase].slice(0, offset)
  const tail = s.phrases[phrase].slice(offset)
  s.phrases.splice(phrase, 1, head, tail)
  s.lineBreaks = s.lineBreaks?.map((b) => (b > phrase ? b + 1 : b))
  return s
}

/** Toggle a line break before the phrase containing `index`. */
export function toggleLineBreak(section: TuneSection, index: number): TuneSection {
  const s = clone(section)
  const { phrase } = locate(s, index)
  if (phrase === 0) return s
  const set = new Set(s.lineBreaks ?? [])
  if (set.has(phrase)) set.delete(phrase)
  else set.add(phrase)
  s.lineBreaks = [...set].sort((a, b) => a - b)
  return s
}
