import { toggleHole } from './fingerings'
import type { Fingering, Ornament, Register } from './types'
import { fingeringForMidi, getWhistle, midiForFingering } from './whistles'

/** One pitch segment inside a note (times in seconds from the note start). */
export interface PitchSegment {
  at: number
  midi: number
  /** Glide from the previous segment's pitch instead of jumping. */
  glide?: boolean
}

export const GRACE_SEC = 0.035
/**
 * One open or closed step of a trill: ~9 flicks of the finger per second, a fast, sharp
 * tremolo. Fixed, so a longer note gets more flicks rather than slower ones.
 */
export const TRILL_STEP_SEC = 0.055

/** Fingering + register used to play a pitch (explicit override wins). */
export function noteFingering(
  midi: number,
  explicit: Fingering | undefined,
  whistleId = 'D',
): { fingering: Fingering; register: Register } | undefined {
  const std = fingeringForMidi(midi, whistleId)
  if (explicit) {
    const register: Register = Math.round(midi) - getWhistle(whistleId).baseMidi >= 12 ? 2 : 1
    return { fingering: explicit, register }
  }
  return std
}

/**
 * Pitch of the grace note for an ornament: the ringed hole is flicked (covered ↔ open).
 * Falls back to conventional intervals when no hole is given or the flick barely changes pitch.
 */
export function gracePitch(midi: number, ornament: Ornament, fingering?: Fingering, whistleId = 'D'): number {
  const fallback = ornament.type === 'bounce' ? midi - 2 : ornament.type === 'trill' ? midi + 2 : midi + 3
  if (!ornament.hole) return fallback
  const fg = noteFingering(midi, fingering, whistleId)
  if (!fg) return fallback
  const flicked = toggleHole(fg.fingering, ornament.hole - 1)
  const g = midiForFingering(flicked, fg.register, whistleId)
  return Math.abs(g - midi) < 0.75 ? fallback : g
}

/**
 * Timing of a slide (S). Measured from recordings: the ringed finger rolls slowly off its hole
 * near the end of the note and the pitch glides into the next note over ~0.35 s at a slow
 * tempo, fast at first and settling at the end. The glide straddles the next note's onset,
 * so `lead` of it happens before the onset and the rest after. Leaps (register breaks) snap.
 */
export function slideGlide(duration: number, from: number, to: number, continues: boolean): { start: number; length: number } {
  const leap = Math.abs(to - from) > 2.5
  const length = leap ? 0.08 : Math.min(0.38, Math.max(0.12, duration * 0.45))
  const start = continues ? duration - length / 2 : Math.max(duration * 0.35, duration * 0.92 - length)
  return { start: Math.max(0, start), length: continues ? length : Math.min(length, duration * 0.92 - Math.max(0, start)) }
}

/**
 * Expand a note + ornament into timed pitch segments for the synth.
 * `slideTo` is the pitch of the following note for slides; segments may then run past
 * `duration` (the glide finishes inside the next note, which must not reset the pitch).
 */
export function ornamentSegments(
  midi: number,
  duration: number,
  ornament: Ornament | undefined,
  fingering?: Fingering,
  whistleId = 'D',
  slideTo?: number | null,
): PitchSegment[] {
  const segments = ownSegments(midi, duration, ornament, fingering, whistleId, slideTo)
  if (!ornament?.cut || ornament.type === 'cut') return segments
  // "C+S" and the like: a cut grace first, then the note goes on into its own ornament
  const grace = Math.min(GRACE_SEC, duration * 0.3)
  const cut = gracePitch(midi, { type: 'cut', hole: ornament.cut }, fingering, whistleId)
  return [{ at: 0, midi: cut }, { ...segments[0], at: grace }, ...segments.slice(1).filter((s) => s.at > grace)]
}

function ownSegments(
  midi: number,
  duration: number,
  ornament: Ornament | undefined,
  fingering: Fingering | undefined,
  whistleId: string,
  slideTo?: number | null,
): PitchSegment[] {
  if (!ornament) return [{ at: 0, midi }]
  const grace = Math.min(GRACE_SEC, duration * 0.3)
  switch (ornament.type) {
    case 'cut':
      return [
        { at: 0, midi: gracePitch(midi, ornament, fingering, whistleId) },
        { at: grace, midi },
      ]
    case 'bounce': {
      const b = Math.min(0.09, duration * 0.35)
      return [
        { at: 0, midi },
        { at: b, midi: gracePitch(midi, ornament, fingering, whistleId) },
        { at: b + grace, midi },
      ]
    }
    case 'slide': {
      const target = slideTo ?? gracePitch(midi, ornament, fingering, whistleId)
      const { start, length } = slideGlide(duration, midi, target, slideTo != null)
      // two linear ramps approximate the ease-out: 60 % of the interval in the first 40 % of the time
      return [
        { at: 0, midi },
        { at: start, midi },
        { at: start + length * 0.4, midi: midi + (target - midi) * 0.6, glide: true },
        { at: start + length, midi: target, glide: true },
      ]
    }
    case 'trill':
      return trillSegments(midi, duration, gracePitch(midi, ornament, fingering, whistleId))
    case 'roll': {
      const d1 = duration * 0.28
      const d2 = duration * 0.55
      return [
        { at: 0, midi },
        { at: d1, midi: midi + 3 },
        { at: d1 + grace, midi },
        { at: d2, midi: midi - 2 },
        { at: d2 + grace, midi },
      ]
    }
  }
}

/**
 * Trill: the ringed hole is opened and closed over and over at a fixed fast rate
 * (TRILL_STEP_SEC per step), starting and ending on the main note. Very short notes still
 * get one flick, squeezed into the note.
 */
export function trillSegments(midi: number, duration: number, upper: number): PitchSegment[] {
  const step = Math.min(TRILL_STEP_SEC, duration / 3)
  const segments: PitchSegment[] = [{ at: 0, midi }]
  // flicks at odd steps, back to the main note at even ones; keep a full step on the main note at the end
  for (let at = step; at + step * 2 <= duration + 1e-9; at += step * 2) {
    segments.push({ at, midi: upper }, { at: at + step, midi })
  }
  return segments
}
