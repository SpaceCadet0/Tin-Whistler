import type { MessageKey } from '../../i18n'
import type { PracticePreset } from './TunePractice'

/** The seven-step path from "never heard it" to "I play it on my own". */
export interface LearningStep {
  n: number
  icon: string
  title: MessageKey
  body: MessageKey
  /** Player preset; null = handled on the tune page itself. */
  preset: Partial<PracticePreset> | null
  /** Minimum overall score for the step to count as done (mic steps). */
  pass?: number
}

export const LEARNING_STEPS: LearningStep[] = [
  { n: 1, icon: 'headphones', title: 'steps.listen', body: 'steps.listenBody', preset: { melody: true, tempo: 1, mic: false } },
  { n: 2, icon: 'eye', title: 'steps.notes', body: 'steps.notesBody', preset: null },
  { n: 3, icon: 'hand', title: 'steps.fingering', body: 'steps.fingeringBody', preset: null },
  { n: 4, icon: 'music', title: 'steps.along', body: 'steps.alongBody', preset: { melody: true, tempo: 0.8, mic: true }, pass: 0.5 },
  { n: 5, icon: 'slow', title: 'steps.slow', body: 'steps.slowBody', preset: { melody: true, tempo: 0.6, mic: true, metronome: true }, pass: 0.7 },
  { n: 6, icon: 'fast', title: 'steps.faster', body: 'steps.fasterBody', preset: { melody: true, mic: true, metronome: true }, pass: 0.75 },
  { n: 7, icon: 'trophy', title: 'steps.alone', body: 'steps.aloneBody', preset: { melody: false, tempo: 1, mic: true, metronome: true }, pass: 0.85 },
]
