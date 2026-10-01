import type { PitchFrame } from '../../audio/pitch/stabilizer'

export type MatchStatus = 'silent' | 'correct' | 'close-low' | 'close-high' | 'low' | 'high' | 'octave-low' | 'octave-high'

export interface NoteMatch {
  status: MatchStatus
  /** Deviation from the target in cents (only meaningful when voiced). */
  cents: number
  /** 0…1 closeness for accuracy meters. */
  accuracy: number
}

/**
 * Compare one pitch frame with a target MIDI note. Octave errors get their own status because
 * on the whistle they mean "blow softer / harder", not "wrong finger".
 */
export function matchNote(frame: PitchFrame | null, target: number, toleranceCents = 40): NoteMatch {
  if (!frame?.voiced || frame.midi == null) return { status: 'silent', cents: 0, accuracy: 0 }
  const diff = (frame.midi - target) * 100
  const octaves = Math.round(diff / 1200)
  if (octaves !== 0 && Math.abs(diff - octaves * 1200) < 80) {
    return { status: octaves > 0 ? 'octave-high' : 'octave-low', cents: diff, accuracy: 0.3 }
  }
  const abs = Math.abs(diff)
  const accuracy = Math.max(0, 1 - Math.max(0, abs - 5) / 150)
  if (abs <= toleranceCents) return { status: 'correct', cents: diff, accuracy }
  if (abs <= 150) return { status: diff < 0 ? 'close-low' : 'close-high', cents: diff, accuracy }
  return { status: diff < 0 ? 'low' : 'high', cents: diff, accuracy }
}
