import type { Fingering, HoleState, Register } from './types'

/**
 * Fingering chart, expressed as semitone offsets from the whistle's tonic.
 * Works for any whistle key: pitch = baseMidi + offset (+12 in register 2).
 */
export interface FingeringEntry {
  /** Semitones above the tonic (0 = all covered). Register 2 adds 12. */
  offset: number
  fingering: Fingering
  register: Register
  /** Needs half-holing or cross-fingering. */
  chromatic?: boolean
  alternate?: boolean
}

const f = (s: string): Fingering => {
  const holes = s.split('').map((c): HoleState => (c === '1' ? 1 : c === 'h' ? 0.5 : 0))
  return holes as unknown as Fingering
}

export const parseFingering = (s: string): Fingering | null => (/^[01h]{6}$/.test(s) ? f(s) : null)

export const fingeringToString = (fg: Fingering): string => fg.map((h) => (h === 1 ? '1' : h === 0.5 ? 'h' : '0')).join('')

export const fingeringsEqual = (a: Fingering, b: Fingering): boolean => a.every((h, i) => h === b[i])

/** Standard diatonic fingerings for both registers plus common chromatic ones. */
export const FINGERING_CHART: FingeringEntry[] = [
  { offset: 0, fingering: f('111111'), register: 1 },
  { offset: 1, fingering: f('11111h'), register: 1, chromatic: true },
  { offset: 2, fingering: f('111110'), register: 1 },
  { offset: 3, fingering: f('1111h0'), register: 1, chromatic: true },
  { offset: 4, fingering: f('111100'), register: 1 },
  { offset: 5, fingering: f('111000'), register: 1 },
  { offset: 6, fingering: f('11h000'), register: 1, chromatic: true },
  { offset: 7, fingering: f('110000'), register: 1 },
  { offset: 8, fingering: f('1h0000'), register: 1, chromatic: true },
  { offset: 9, fingering: f('100000'), register: 1 },
  { offset: 10, fingering: f('011000'), register: 1, chromatic: true },
  { offset: 10, fingering: f('h00000'), register: 1, chromatic: true, alternate: true },
  { offset: 11, fingering: f('000000'), register: 1 },
  { offset: 0, fingering: f('011111'), register: 2 },
  { offset: 0, fingering: f('111111'), register: 2, alternate: true },
  { offset: 1, fingering: f('11111h'), register: 2, chromatic: true },
  { offset: 2, fingering: f('111110'), register: 2 },
  { offset: 3, fingering: f('1111h0'), register: 2, chromatic: true },
  { offset: 4, fingering: f('111100'), register: 2 },
  { offset: 5, fingering: f('111000'), register: 2 },
  { offset: 6, fingering: f('11h000'), register: 2, chromatic: true },
  { offset: 7, fingering: f('110000'), register: 2 },
  { offset: 8, fingering: f('1h0000'), register: 2, chromatic: true },
  { offset: 9, fingering: f('100000'), register: 2 },
  { offset: 10, fingering: f('011000'), register: 2, chromatic: true },
  { offset: 11, fingering: f('000000'), register: 2 },
]

/** Offset for the "first open hole" rule: index = number of covered holes from the top. */
const OPEN_HOLE_OFFSETS = [11, 9, 7, 5, 4, 2, 0] // 0 covered → C#, … 6 covered → D

/**
 * Approximate sounding offset (semitones, may be fractional) of an arbitrary fingering.
 * Rules: pitch is set by the first open hole from the top; covered holes below it
 * (cross-fingering) flatten by ~a semitone; a half-hole sits between its neighbours.
 */
export function fingeringOffset(fg: Fingering, register: Register = 1): number {
  const exact = FINGERING_CHART.find((e) => e.register === register && fingeringsEqual(e.fingering, fg))
  if (exact) return exact.offset + (register === 2 ? 12 : 0)

  let covered = 0
  while (covered < 6 && fg[covered] === 1) covered++
  let offset: number
  if (covered === 6) offset = 0
  else if (fg[covered] === 0.5) {
    // half hole: halfway between this hole closed and open
    const closedOffset = OPEN_HOLE_OFFSETS[covered + 1]
    offset = (OPEN_HOLE_OFFSETS[covered] + closedOffset) / 2
  } else {
    offset = OPEN_HOLE_OFFSETS[covered]
    const below = fg.slice(covered + 1)
    const coveredBelow = below.filter((h) => h > 0).length
    if (coveredBelow > 0) offset -= below[0] > 0 ? 1 : 0.5
  }
  return offset + (register === 2 ? 12 : 0)
}

/** Standard fingering for an offset (0…23), undefined if the whistle can't play it. */
export function fingeringForOffset(offset: number): FingeringEntry | undefined {
  const register: Register = offset >= 12 ? 2 : 1
  const o = Math.round(offset) - (register === 2 ? 12 : 0)
  return FINGERING_CHART.find((e) => e.register === register && e.offset === o && !e.alternate)
}

/** Toggle a hole: covered → open, open/half → covered. Used for ornament grace notes. */
export function toggleHole(fg: Fingering, hole: number): Fingering {
  const next = [...fg] as HoleState[]
  next[hole] = fg[hole] === 1 ? 0 : 1
  return next as unknown as Fingering
}
