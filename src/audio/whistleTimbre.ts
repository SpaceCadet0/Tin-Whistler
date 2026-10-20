/**
 * Tin whistle timbre by register, measured from solo recordings (three tunes, ~340 steady notes):
 * the strength of harmonics 2…6 relative to the fundamental, in dB, at a few points of the range.
 * Low notes are reedy with a strong 3rd harmonic; the second octave is purer but breathier.
 * Offsets are semitones above the whistle's bottom note, so every key gets the same character.
 */
const ANCHORS: { offset: number; harmonicsDb: number[] }[] = [
  { offset: 0, harmonicsDb: [-16, -11.5, -34, -28, -37] },
  { offset: 5, harmonicsDb: [-23, -12, -34, -29, -45] },
  { offset: 8, harmonicsDb: [-26, -21, -35, -36, -49] },
  { offset: 12, harmonicsDb: [-28, -26, -35.5, -35.5, -44] },
]

/** Breath noise relative to the low register: the second octave is about 9 dB breathier. */
const BREATH_LOW = 1
const BREATH_HIGH = 2.8

export const HARMONIC_COUNT = ANCHORS[0].harmonicsDb.length + 1

export interface Timbre {
  /** Linear amplitude of harmonics 1…6 (the fundamental is 1). */
  harmonics: number[]
  /** Breath-noise multiplier. */
  breath: number
}

const dbToGain = (db: number) => 10 ** (db / 20)

export function whistleTimbre(offset: number): Timbre {
  const last = ANCHORS[ANCHORS.length - 1]
  const x = Math.max(ANCHORS[0].offset, Math.min(last.offset, offset))
  const hi = ANCHORS.findIndex((a) => a.offset >= x)
  const b = ANCHORS[Math.max(hi, 0)]
  const a = ANCHORS[Math.max(hi - 1, 0)]
  const f = b.offset === a.offset ? 0 : (x - a.offset) / (b.offset - a.offset)
  const db = a.harmonicsDb.map((v, i) => v + (b.harmonicsDb[i] - v) * f)
  const reg = (x - ANCHORS[0].offset) / (last.offset - ANCHORS[0].offset)
  return { harmonics: [1, ...db.map(dbToGain)], breath: BREATH_LOW + (BREATH_HIGH - BREATH_LOW) * reg }
}
