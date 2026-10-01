const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export const DEFAULT_A4 = 440

export function midiToFrequency(midi: number, a4 = DEFAULT_A4): number {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

export function frequencyToMidi(freq: number, a4 = DEFAULT_A4): number {
  return 69 + 12 * Math.log2(freq / a4)
}

/** Cents between two frequencies (positive = f is sharp of ref). */
export function centsBetween(f: number, ref: number): number {
  return 1200 * Math.log2(f / ref)
}

export function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12
}

export function midiToName(midi: number, preferFlats = false): string {
  const names = preferFlats ? NAMES_FLAT : NAMES_SHARP
  return names[pitchClass(midi)]
}

/** Scientific pitch name, e.g. 74 → "D5". */
export function midiToScientific(midi: number): string {
  const m = Math.round(midi)
  return `${midiToName(m)}${Math.floor(m / 12) - 1}`
}

export interface NearestNote {
  midi: number
  name: string
  /** Deviation from the nearest equal-tempered note, −50…+50. */
  cents: number
}

export function nearestNote(freq: number, a4 = DEFAULT_A4): NearestNote {
  const exact = frequencyToMidi(freq, a4)
  const midi = Math.round(exact)
  return { midi, name: midiToName(midi), cents: (exact - midi) * 100 }
}
