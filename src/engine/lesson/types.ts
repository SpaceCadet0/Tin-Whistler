import type { LocalizedText } from '../../music/types'

/** Visual cue shown with an explanation step. */
export type Illustration = 'hold' | 'cover' | 'breath' | 'blow' | 'tongue' | 'overblow' | 'cut' | 'bounce' | 'slide' | 'posture'

interface ExerciseBase {
  id: string
  title: LocalizedText
  /** One short instruction line, no walls of text. */
  instruction?: LocalizedText
}

/** A tiny explanation card (Learn → Play). */
export interface InfoExercise extends ExerciseBase {
  type: 'info'
  body: LocalizedText
  illustration?: Illustration
  /** Note whose fingering is shown with the card. */
  note?: string
}

/** Set the fingering on the interactive whistle. */
export interface FingeringExercise extends ExerciseBase {
  type: 'fingering'
  note: string
}

/** Play a note into the mic and hold it. */
export interface NoteExercise extends ExerciseBase {
  type: 'note'
  note: string
  /** How long the note must be held, ms. */
  holdMs: number
  repetitions: number
}

/** Hold a long, steady, in-tune note. */
export interface PitchExercise extends ExerciseBase {
  type: 'pitch'
  note: string
  holdMs: number
  /** Allowed deviation in cents. */
  tolerance: number
}

/** Hear a note and pick it. */
export interface ListeningExercise extends ExerciseBase {
  type: 'listening'
  choices: string[]
  rounds: number
  /** Also ask the learner to play the answer back. */
  playBack?: boolean
}

/** Play notes on the beat with a metronome. */
export interface RhythmExercise extends ExerciseBase {
  type: 'rhythm'
  note: string
  bpm: number
  /** Beats per step in the pattern (1 = quarter, 0.5 = eighth); null = rest. */
  pattern: (number | null)[]
  bars: number
}

/** Play a short sequence of notes in order. */
export interface SequenceExercise extends ExerciseBase {
  type: 'sequence'
  notes: string[]
  rounds: number
}

/** Learn / play (part of) a tune. */
export interface MelodyExercise extends ExerciseBase {
  type: 'melody'
  tuneId: string
  sections?: number[]
  tempo: number
}

/** Open-ended playing with a prompt (e.g. try ornaments). */
export interface FreePlayExercise extends ExerciseBase {
  type: 'free-play'
  seconds: number
  prompt: LocalizedText
  /** Example to listen to first. */
  demo?: { notes: string[]; ornament?: 'cut' | 'bounce' | 'slide' }
}

export type Exercise =
  | InfoExercise
  | FingeringExercise
  | NoteExercise
  | PitchExercise
  | ListeningExercise
  | RhythmExercise
  | SequenceExercise
  | MelodyExercise
  | FreePlayExercise

export type ExerciseType = Exercise['type']

export interface Lesson {
  id: string
  title: LocalizedText
  description: LocalizedText
  /** Course level (unit) this lesson belongs to. */
  level: number
  /** Estimated minutes. */
  duration: number
  objectives: LocalizedText[]
  exercises: Exercise[]
  /** Notes introduced in this lesson. */
  notes: string[]
  melody?: string
  /** 1…5 */
  difficulty: number
  prerequisites: string[]
}

export interface CourseLevel {
  id: number
  title: LocalizedText
  subtitle: LocalizedText
}

export interface ExerciseResult {
  /** 0…1 */
  score: number
  /** Notes the learner struggled with (for smart practice). */
  missedNotes?: string[]
}
