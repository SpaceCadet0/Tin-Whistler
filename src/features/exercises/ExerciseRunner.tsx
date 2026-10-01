import { useState } from 'react'
import type { Exercise, ExerciseResult, MelodyExercise, RhythmExercise, SequenceExercise } from '../../engine/lesson/types'
import { useT } from '../../i18n'
import { useProgress } from '../../state/progress'
import { useTune } from '../../state/tunes'
import { Button } from '../../ui/primitives'
import { TunePractice, type ScoredRun } from '../tunes/TunePractice'
import { EarQuiz } from './EarQuiz'
import { FingeringStep } from './FingeringStep'
import { FreePlayStep } from './FreePlayStep'
import { InfoStep } from './InfoStep'
import { NoteStep } from './NoteStep'
import { RhythmRun } from './RhythmRun'
import { SequenceRun, type SequenceOutcome } from './SequenceRun'
import { Celebrate, ExerciseHeader } from './shared'

type Done = (r: ExerciseResult) => void

function SequenceStep({ exercise, onComplete }: { exercise: SequenceExercise; onComplete: Done }) {
  const { t } = useT()
  const [round, setRound] = useState(0)
  const [results, setResults] = useState<SequenceOutcome[]>([])
  const last = results[results.length - 1]
  const finished = results.length >= exercise.rounds
  return (
    <div className="flex flex-col items-center">
      <ExerciseHeader title={exercise.title} instruction={exercise.instruction} step={exercise.rounds > 1 ? t('ex.round', { n: Math.min(round + 1, exercise.rounds), of: exercise.rounds }) : undefined} />
      {results.length > round || finished ? (
        <Celebrate title={t('seq.result', { correct: last.correct, total: last.total })}>
          {finished ? (
            <Button
              size="lg"
              iconRight="next"
              autoFocus
              onClick={() =>
                onComplete({
                  score: results.reduce((s, r) => s + r.correct / r.total, 0) / results.length,
                  missedNotes: results.flatMap((r) => r.missed),
                })
              }
            >
              {t('ex.continue')}
            </Button>
          ) : (
            <Button size="lg" iconRight="next" autoFocus onClick={() => setRound((r) => r + 1)}>
              {t('ex.nextRound')}
            </Button>
          )}
        </Celebrate>
      ) : (
        <SequenceRun key={round} notes={exercise.notes} onFinish={(o) => setResults((r) => [...r, o])} />
      )}
    </div>
  )
}

function RhythmStep({ exercise, onComplete }: { exercise: RhythmExercise; onComplete: Done }) {
  const { t } = useT()
  const [best, setBest] = useState<number | null>(null)
  return (
    <div className="flex flex-col items-center gap-6">
      <ExerciseHeader title={exercise.title} instruction={exercise.instruction} />
      <RhythmRun note={exercise.note} bpm={exercise.bpm} pattern={exercise.pattern} bars={exercise.bars} onFinish={(r) => setBest((b) => Math.max(b ?? 0, r.timing))} />
      <Button size="lg" variant={best != null && best >= 0.6 ? 'primary' : 'ghost'} iconRight="next" onClick={() => onComplete({ score: best ?? 0.5 })}>
        {best == null ? t('ex.skip') : t('ex.continue')}
      </Button>
    </div>
  )
}

function MelodyStep({ exercise, onComplete }: { exercise: MelodyExercise; onComplete: Done }) {
  const { t, L } = useT()
  const tune = useTune(exercise.tuneId)
  const recordTune = useProgress((s) => s.recordTune)
  const [best, setBest] = useState<number | null>(null)
  if (!tune) return null
  const onScored = (run: ScoredRun) => {
    setBest((b) => Math.max(b ?? 0, run.report.overall))
    if (run.complete) recordTune(tune.id, run.sectionId, run.report.overall, run.tempo, tune.title)
  }
  return (
    <div className="flex flex-col gap-4">
      <ExerciseHeader title={exercise.title} instruction={exercise.instruction} />
      <p className="-mt-3 text-center text-ink-soft">{L(tune.description)}</p>
      <TunePractice tune={tune} initialSection={exercise.sections?.[0] ?? 0} preset={{ tempo: exercise.tempo, melody: true }} compact onScored={onScored} />
      <div className="flex flex-col items-center gap-2">
        {best != null && <p className="font-semibold text-good">{t('melody.best', { n: Math.round(best * 100) })}</p>}
        <Button size="lg" iconRight="next" variant={best != null ? 'primary' : 'secondary'} onClick={() => onComplete({ score: best ?? 0.6 })}>
          {best != null ? t('ex.continue') : t('melody.iPlayedIt')}
        </Button>
      </div>
    </div>
  )
}

/** Renders any exercise by type, the lesson engine never needs to know the details. */
export function ExerciseRunner({ exercise, onComplete }: { exercise: Exercise; onComplete: Done }) {
  switch (exercise.type) {
    case 'info':
      return <InfoStep exercise={exercise} onComplete={onComplete} />
    case 'fingering':
      return <FingeringStep exercise={exercise} onComplete={onComplete} />
    case 'note':
    case 'pitch':
      return <NoteStep exercise={exercise} onComplete={onComplete} />
    case 'listening':
      return (
        <div className="flex flex-col items-center">
          <ExerciseHeader title={exercise.title} instruction={exercise.instruction} />
          <EarQuiz choices={exercise.choices} rounds={exercise.rounds} playBack={exercise.playBack} onComplete={onComplete} />
        </div>
      )
    case 'rhythm':
      return <RhythmStep exercise={exercise} onComplete={onComplete} />
    case 'sequence':
      return <SequenceStep exercise={exercise} onComplete={onComplete} />
    case 'melody':
      return <MelodyStep exercise={exercise} onComplete={onComplete} />
    case 'free-play':
      return <FreePlayStep exercise={exercise} onComplete={onComplete} />
  }
}
