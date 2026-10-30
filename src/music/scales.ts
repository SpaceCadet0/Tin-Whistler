import type { LocalizedText } from './types'
import { whistleLabel, getWhistle } from './whistles'

export interface Scale {
  id: string
  name: LocalizedText
  /** Semitones above the whistle's tonic. */
  degrees: number[]
}

/** Scales that lie naturally under the fingers of a whistle (offsets from its tonic). */
export const SCALES: Scale[] = [
  { id: 'major', name: { en: 'Major (D on a D whistle)', ru: 'Мажор (ре на флейте D)', ga: 'Mór (D ar fheadóg D)' }, degrees: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'mixolydian', name: { en: 'Mixolydian (D mix)', ru: 'Миксолидийский (D mix)', ga: 'Micsileidiach (D mix)' }, degrees: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'dorian', name: { en: 'Dorian (E dorian)', ru: 'Дорийский (E dorian)', ga: 'Dórach (E dórach)' }, degrees: [2, 4, 5, 7, 9, 11, 12] },
  { id: 'minor', name: { en: 'Natural minor (B minor)', ru: 'Натуральный минор (си минор)', ga: 'Mion nádúrtha (B mion)' }, degrees: [9, 11, 12, 14, 16, 17, 19] },
  { id: 'major-pentatonic', name: { en: 'Pentatonic', ru: 'Пентатоника', ga: 'Peinteatonach' }, degrees: [0, 2, 4, 7, 9] },
]

/** Whistle note labels of a scale, e.g. major on D → D E F# G A B C#. */
export function scaleNotes(scaleId: string, whistleId = 'D', octaves = 1): string[] {
  const scale = SCALES.find((s) => s.id === scaleId) ?? SCALES[0]
  const base = getWhistle(whistleId).baseMidi
  const out: string[] = []
  for (let o = 0; o < octaves; o++) for (const d of scale.degrees) if (d + o * 12 <= 23) out.push(whistleLabel(base + d + o * 12, whistleId))
  return out
}
