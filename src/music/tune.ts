import type { Phrase, TimedNote, Tune, TuneNote, TuneSection } from './types'
import { whistleLabel } from './whistles'

export const sectionNotes = (section: TuneSection): TuneNote[] => section.phrases.flat()

export const sectionBeats = (section: TuneSection): number =>
  sectionNotes(section).reduce((sum, n) => sum + n.beats, 0)

export const tuneNoteCount = (tune: Tune): number =>
  tune.sections.reduce((sum, s) => sum + sectionNotes(s).length, 0)

export const tuneBeats = (tune: Tune): number => tune.sections.reduce((sum, s) => sum + sectionBeats(s), 0)

export function tuneDurationSec(tune: Tune, tempo = 1): number {
  return (tuneBeats(tune) * 60) / (tune.bpm * tempo)
}

/** Distinct whistle note labels used in a tune, ordered by pitch. */
export function usedNotes(tune: Tune): string[] {
  const pitches = new Set<number>()
  for (const s of tune.sections) for (const n of sectionNotes(s)) if (n.pitch != null) pitches.add(Math.round(n.pitch))
  return [...pitches].sort((a, b) => a - b).map((p) => whistleLabel(p, tune.whistle))
}

export interface FlattenOptions {
  /** Tempo multiplier (1 = written bpm). */
  tempo?: number
  /** Only these section indexes (default: all). */
  sections?: number[]
  /** Honour section.repeat. */
  repeats?: boolean
}

/** Lay a tune out in time. Times are seconds from the first note. */
export function flattenTune(tune: Tune, opts: FlattenOptions = {}): TimedNote[] {
  const secPerBeat = 60 / (tune.bpm * (opts.tempo ?? 1))
  const indexes = opts.sections ?? tune.sections.map((_, i) => i)
  const out: TimedNote[] = []
  let beat = 0
  for (const sectionIndex of indexes) {
    const section = tune.sections[sectionIndex]
    if (!section) continue
    const times = opts.repeats ? Math.max(1, section.repeat ?? 1) : 1
    for (let r = 0; r < times; r++) {
      let noteInSection = 0
      section.phrases.forEach((phrase, phraseIndex) => {
        for (const note of phrase) {
          out.push({
            index: out.length,
            sectionIndex,
            phraseIndex,
            noteInSection,
            note,
            start: beat * secPerBeat,
            duration: note.beats * secPerBeat,
            startBeat: beat,
          })
          beat += note.beats
          noteInSection++
        }
      })
    }
  }
  return out
}

/** Second-voice notes of a section laid out in time, relative to the section's first note. */
export function flattenSecondVoice(tune: Tune, sectionIndex: number, tempo = 1): TimedNote[] {
  const section = tune.sections[sectionIndex]
  if (!section?.secondVoice) return []
  const secPerBeat = 60 / (tune.bpm * tempo)
  const main = sectionNotes(section)
  let beat = main.slice(0, section.secondVoice.startNote).reduce((s, n) => s + n.beats, 0)
  return section.secondVoice.notes.map((note, i) => {
    const t: TimedNote = {
      index: i,
      sectionIndex,
      phraseIndex: -1,
      noteInSection: i,
      note,
      start: beat * secPerBeat,
      duration: note.beats * secPerBeat,
      startBeat: beat,
    }
    beat += note.beats
    return t
  })
}

/**
 * Split a flat note list into learnable sections of roughly `targetBeats`,
 * cutting at phrase ends or long notes/rests so musical phrases stay together.
 */
export function autoSection(phrases: Phrase[], targetBeats = 16, namePrefix = 'Part'): TuneSection[] {
  const sections: TuneSection[] = []
  let current: Phrase[] = []
  let beats = 0
  const flush = () => {
    if (!current.length) return
    const n = sections.length + 1
    sections.push({ id: `s${n}`, name: `${namePrefix} ${n}`, phrases: current })
    current = []
    beats = 0
  }
  for (const phrase of phrases) {
    const pb = phrase.reduce((s, n) => s + n.beats, 0)
    if (beats > 0 && beats + pb > targetBeats * 1.35) flush()
    current.push(phrase)
    beats += pb
    if (beats >= targetBeats) flush()
  }
  flush()
  return sections
}

/**
 * Break a long monophonic note list into phrases: after long notes / rests or
 * every `maxBeats` beats (aligned to `barBeats`).
 */
export function phrasesFromNotes(notes: TuneNote[], barBeats = 4, maxBeats = 8): Phrase[] {
  const phrases: Phrase[] = []
  let current: TuneNote[] = []
  let beats = 0
  for (const n of notes) {
    current.push(n)
    beats += n.beats
    const atBar = Math.abs(beats / barBeats - Math.round(beats / barBeats)) < 1e-6
    const longNote = n.pitch == null || n.beats >= barBeats / 2
    if ((atBar && (beats >= maxBeats || longNote)) || beats >= maxBeats * 1.5) {
      phrases.push(current)
      current = []
      beats = 0
    }
  }
  if (current.length) phrases.push(current)
  return phrases
}

export function cloneTune(tune: Tune): Tune {
  return structuredClone(tune)
}
