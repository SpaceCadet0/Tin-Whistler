import { fingeringForOffset } from '../music/fingerings'
import type { TuneNote } from '../music/types'
import { getWhistle } from '../music/whistles'

export interface FitResult {
  /** Semitones added to every note. */
  shift: number
  /** Share of notes playable with standard (non half-hole) fingerings. */
  playable: number
  outOfRange: number
}

/**
 * Find the transposition that makes a melody most whistle-friendly: everything inside the
 * two-octave range, few half-holed notes, and (all else equal) as little change as possible.
 */
export function bestFit(pitches: number[], whistleId = 'D', allowKeyChange = true): FitResult {
  const base = getWhistle(whistleId).baseMidi
  const candidates: number[] = []
  const semis = allowKeyChange ? [0, 2, -2, 5, -5, 7, -7, 1, -1, 3, -3, 4, -4, 6, -6] : [0]
  for (const s of semis) for (const o of [-24, -12, 0, 12, 24, 36]) candidates.push(s + o)
  let best: (FitResult & { cost: number }) | null = null
  for (const shift of candidates) {
    let out = 0
    let chromatic = 0
    for (const p of pitches) {
      const off = p + shift - base
      if (off < 0 || off > 23) out++
      else {
        const e = fingeringForOffset(off)
        if (!e || e.chromatic) chromatic++
      }
    }
    const n = Math.max(1, pitches.length)
    const keyChange = ((shift % 12) + 12) % 12 === 0 ? 0 : 1
    const cost = (out / n) * 10 + (chromatic / n) * 3 + keyChange * 0.4 + Math.abs(shift) * 0.001
    if (!best || cost < best.cost) best = { shift, playable: 1 - (out + chromatic) / n, outOfRange: out, cost }
  }
  return { shift: best!.shift, playable: best!.playable, outOfRange: best!.outOfRange }
}

export function transposeNotes(notes: TuneNote[], shift: number, whistleId = 'D'): TuneNote[] {
  const base = getWhistle(whistleId).baseMidi
  return notes.map((n) => {
    if (n.pitch == null) return n
    let p = n.pitch + shift
    // fold stragglers into range rather than dropping them
    while (p < base) p += 12
    while (p > base + 23) p -= 12
    return { ...n, pitch: p }
  })
}
