import type { Tune, TuneNote, TuneSection } from './types'
import { getWhistle } from './whistles'

const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** "D" → "C", "Em" → "Dm", "Ador" → "Gdor" for a shift of −2 semitones; unknown keys pass through. */
export function transposeKeyName(key: string, semitones: number): string {
  const m = /^([A-G])([#b]?)(.*)$/.exec(key.trim())
  if (!m) return key
  const pc = LETTER_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
  return KEY_NAMES[(((pc + semitones) % 12) + 12) % 12] + m[3]
}

/**
 * Move a tune to a whistle in another key while keeping the tab: every fingering stays the same,
 * so every note sounds shifted by the interval between the two whistles (a C-whistle tab played
 * on a D whistle sounds a tone higher). Explicit fingerings and the second voice move along.
 */
export function changeWhistle(tune: Tune, whistleId: string): Tune {
  const shift = getWhistle(whistleId).baseMidi - getWhistle(tune.whistle).baseMidi
  if (!shift) return { ...tune, whistle: whistleId }
  const move = (n: TuneNote): TuneNote => (n.pitch == null ? n : { ...n, pitch: n.pitch + shift })
  return {
    ...tune,
    whistle: whistleId,
    key: transposeKeyName(tune.key, shift),
    sections: tune.sections.map((s) => ({
      ...s,
      phrases: s.phrases.map((p) => p.map(move)),
      secondVoice: s.secondVoice && { ...s.secondVoice, notes: s.secondVoice.notes.map(move) },
    })),
  }
}

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

// --- ranges: copy, cut, paste and drag several tab columns at once ------------------------------

/** Copies of the notes `from`…`to` (inclusive, flat indexes). */
export function sliceNotes(section: TuneSection, from: number, to: number): TuneNote[] {
  return section.phrases
    .flat()
    .slice(from, to + 1)
    .map((n) => structuredClone(n))
}

/** Remove the notes `from`…`to`; emptied phrases disappear (a section keeps at least one note). */
export function removeRange(section: TuneSection, from: number, to: number): TuneSection {
  let s = section
  for (let i = from; i <= to; i++) s = deleteNote(s, from)
  return s
}

/** Insert `notes` after the note at `index` (or before it with `after = false`), in its phrase. */
export function insertNotes(section: TuneSection, index: number, notes: TuneNote[], after = true): TuneSection {
  let s = section
  notes.forEach((n, i) => {
    s = i === 0 ? insertNote(s, index, structuredClone(n), after) : insertNote(s, (after ? index : index - 1) + i, structuredClone(n), true)
  })
  return s
}

/** Copied columns with the phrase structure inside them, so pasting keeps the breaks. */
export interface TabClip {
  notes: TuneNote[]
  /** Offsets (within `notes`, > 0) where a new phrase starts. */
  breaks: number[]
  /** The subset of `breaks` whose phrase also starts a new display line. */
  lines: number[]
}

/** Copy the notes `from`…`to` together with the phrase and line breaks between them. */
export function sliceClip(section: TuneSection, from: number, to: number): TabClip {
  const breaks: number[] = []
  const lines: number[] = []
  const lineSet = new Set(section.lineBreaks ?? [])
  let start = 0
  section.phrases.forEach((p, pi) => {
    const offset = start - from
    if (offset > 0 && start <= to) {
      breaks.push(offset)
      if (lineSet.has(pi)) lines.push(offset)
    }
    start += p.length
  })
  return { notes: sliceNotes(section, from, to), breaks, lines }
}

/** Start a new phrase at `index` unless one already starts there. */
function splitPhraseAt(section: TuneSection, index: number): TuneSection {
  return locate(section, index).offset > 0 ? togglePhraseBreak(section, index) : section
}

/** Make the phrase containing `index` start a new display line. */
function startLineAt(section: TuneSection, index: number): TuneSection {
  const { phrase } = locate(section, index)
  if (phrase === 0 || section.lineBreaks?.includes(phrase)) return section
  return { ...section, lineBreaks: [...(section.lineBreaks ?? []), phrase].sort((a, b) => a - b) }
}

/** Insert copied columns after the note at `index` (before it with `after = false`), restoring their breaks. */
export function insertClip(section: TuneSection, index: number, clip: TabClip, after = true): TuneSection {
  const start = after ? index + 1 : index
  let s = insertNotes(section, index, clip.notes, after)
  for (const b of clip.breaks) s = splitPhraseAt(s, start + b)
  for (const b of clip.lines) s = startLineAt(s, start + b)
  return s
}

/**
 * Move the notes `from`…`to` so they start at the gap `target` (0 = before the first note,
 * count = after the last), as when dragging columns; phrase breaks inside the range move along.
 * Returns the section and the new range.
 */
export function moveRange(section: TuneSection, from: number, to: number, target: number): { section: TuneSection; from: number; to: number } {
  const len = to - from + 1
  if (target >= from && target <= to + 1) return { section, from, to }
  const clip = sliceClip(section, from, to)
  const rest = removeRange(section, from, to)
  const gap = target > to ? target - len : target
  const moved = gap === 0 ? insertClip(rest, 0, clip, false) : insertClip(rest, gap - 1, clip, true)
  return { section: moved, from: gap, to: gap + len - 1 }
}
