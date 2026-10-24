import { isFiniteNumber, isRecord } from '../lib/validate'
import { TUNE_TYPES, type Phrase, type Tune, type TuneNote, type TuneSection, type TuneType } from './types'


function normalizeNote(x: unknown): TuneNote | null {
  if (!isRecord(x)) return null
  const pitch = x.pitch === null ? null : isFiniteNumber(x.pitch) ? x.pitch : undefined
  if (pitch === undefined || !isFiniteNumber(x.beats) || x.beats <= 0) return null
  const note = { ...x, pitch, beats: x.beats } as TuneNote
  if (note.fingering && !(Array.isArray(note.fingering) && note.fingering.length === 6 && note.fingering.every((h) => h === 0 || h === 0.5 || h === 1))) {
    delete note.fingering
  }
  if (note.ornament && !(isRecord(note.ornament) && typeof note.ornament.type === 'string')) delete note.ornament
  return note
}

function normalizeSection(x: unknown, i: number): TuneSection | null {
  if (!isRecord(x) || !Array.isArray(x.phrases)) return null
  const phrases: Phrase[] = x.phrases
    .filter(Array.isArray)
    .map((p: unknown[]) => p.map(normalizeNote).filter((n): n is TuneNote => n != null))
    .filter((p) => p.length > 0)
  if (!phrases.length) return null
  return {
    ...(x as object),
    id: typeof x.id === 'string' ? x.id : `s${i + 1}`,
    name: typeof x.name === 'string' ? x.name : `Section ${i + 1}`,
    phrases,
    lineBreaks: Array.isArray(x.lineBreaks) ? x.lineBreaks.filter(isFiniteNumber) : undefined,
  } as TuneSection
}

/**
 * A user tune read back from storage, repaired where it safely can be (missing metadata gets
 * defaults, broken notes and empty sections are dropped) or null when nothing playable is left.
 */
export function normalizeTune(x: unknown): Tune | null {
  if (!isRecord(x) || typeof x.id !== 'string' || !x.id || !Array.isArray(x.sections)) return null
  const sections = x.sections.map(normalizeSection).filter((s): s is TuneSection => s != null)
  if (!sections.length) return null
  return {
    ...(x as object),
    id: x.id,
    title: typeof x.title === 'string' && x.title ? x.title : 'Untitled',
    origin: 'user',
    type: (TUNE_TYPES as readonly string[]).includes(x.type as string) ? (x.type as TuneType) : 'air',
    whistle: typeof x.whistle === 'string' ? x.whistle : 'D',
    key: typeof x.key === 'string' ? x.key : 'D',
    bpm: isFiniteNumber(x.bpm) && x.bpm > 0 ? x.bpm : 90,
    difficulty: isFiniteNumber(x.difficulty) ? Math.min(5, Math.max(1, Math.round(x.difficulty))) : 2,
    sections,
  } as Tune
}
