import { FINGERING_CHART, fingeringForOffset, fingeringOffset } from './fingerings'
import { midiToFrequency, midiToName } from './pitch'
import type { Fingering, Register, WhistleKey, WhistleNote } from './types'

export const WHISTLE_KEYS: WhistleKey[] = [
  { id: 'D', label: 'D whistle', baseMidi: 74 },
  { id: 'C', label: 'C whistle', baseMidi: 72 },
  { id: 'Bb', label: 'B♭ whistle', baseMidi: 70 },
  { id: 'G', label: 'G whistle', baseMidi: 79 },
  { id: 'lowD', label: 'Low D whistle', baseMidi: 62 },
]

export const DEFAULT_WHISTLE = WHISTLE_KEYS[0]

export function getWhistle(id: string): WhistleKey {
  return WHISTLE_KEYS.find((w) => w.id === id) ?? DEFAULT_WHISTLE
}

/** Learner-facing id: letter name + apostrophe for register 2 (e.g. "D'"). */
export function noteId(name: string, register: Register): string {
  return register === 2 ? `${name}'` : name
}

/** Build every playable note for a whistle (diatonic + chromatic, two registers). */
export function buildWhistleNotes(whistle: WhistleKey): WhistleNote[] {
  const preferFlats = whistle.id === 'Bb'
  return FINGERING_CHART.filter((e) => !e.alternate).map((e) => {
    const midi = whistle.baseMidi + e.offset + (e.register === 2 ? 12 : 0)
    const name = midiToName(midi, preferFlats)
    const alternates = FINGERING_CHART.filter(
      (a) => a.alternate && a.register === e.register && a.offset === e.offset,
    ).map((a) => a.fingering)
    return {
      id: noteId(name, e.register),
      name,
      register: e.register,
      midi,
      frequency: midiToFrequency(midi),
      fingering: e.fingering,
      alternateFingerings: alternates.length ? alternates : undefined,
      chromatic: e.chromatic,
      audioRef: `${whistle.id}:${midi}`,
    }
  })
}

const cache = new Map<string, WhistleNote[]>()

export function whistleNotes(whistleId = 'D'): WhistleNote[] {
  let notes = cache.get(whistleId)
  if (!notes) {
    notes = buildWhistleNotes(getWhistle(whistleId))
    cache.set(whistleId, notes)
  }
  return notes
}

export function noteById(id: string, whistleId = 'D'): WhistleNote | undefined {
  return whistleNotes(whistleId).find((n) => n.id === id)
}

export function noteByMidi(midi: number, whistleId = 'D'): WhistleNote | undefined {
  const m = Math.round(midi)
  return whistleNotes(whistleId).find((n) => n.midi === m)
}

/** The seven diatonic notes of the low register, the beginner's first octave. */
export const FIRST_OCTAVE = ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']
export const SECOND_OCTAVE = ["D'", "E'", "F#'", "G'", "A'", "B'"]

/** Display fingering for a pitch on a whistle (standard chart). */
export function fingeringForMidi(midi: number, whistleId = 'D'): { fingering: Fingering; register: Register } | undefined {
  const w = getWhistle(whistleId)
  const entry = fingeringForOffset(Math.round(midi) - w.baseMidi)
  return entry ? { fingering: entry.fingering, register: entry.register } : undefined
}

/** Sounding MIDI pitch of a fingering in a register on a whistle. */
export function midiForFingering(fg: Fingering, register: Register, whistleId = 'D'): number {
  return getWhistle(whistleId).baseMidi + fingeringOffset(fg, register)
}

/** Whistle range in MIDI (inclusive). */
export function whistleRange(whistleId = 'D'): [number, number] {
  const base = getWhistle(whistleId).baseMidi
  return [base, base + 23]
}

/** Readable label for any pitch on the whistle, e.g. 86 → "D'". */
export function whistleLabel(midi: number, whistleId = 'D'): string {
  const base = getWhistle(whistleId).baseMidi
  const m = Math.round(midi)
  const name = midiToName(m, whistleId === 'Bb')
  return m - base >= 12 ? `${name}'` : name
}
