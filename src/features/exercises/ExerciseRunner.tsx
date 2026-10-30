import { useState } from 'react'
import type { Exercise, ExerciseResult, MelodyExercise, RhythmExercise, SequenceExercise } from '../../engine/lesson/types'
import { useT } from '../../i18n'
import { isDuet } from '../../music/duet'
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
import { StepActions } from './StepActions'
import { Celebrate, ExerciseHeader } from './shared'

type Done = (r: ExerciseResult) => void

function SequenceStep({ exercise, onComplete }: { exercise: SequenceExercise; onComplete: Done }) {
  const { t } = useT()
  const [round, setRound] = useState(0)
  const [results, setResults] = useState<SequenceOutcome[]>([])
  const last = results[results.length - 1]
  const finished = results.length >= exercise.rounds
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <ExerciseHeader title={exercise.title} instruction={exercise.instruction} step={exercise.rounds > 1 ? t('ex.round', { n: Math.min(round + 1, exercise.rounds), of: exercise.rounds }) : undefined} />
      {results.length > round || finished ? (
        <>
          <Celebrate title={t('seq.result', { correct: last.correct, total: last.total })} />
          <StepActions>
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
          </StepActions>
        </>
      ) : (
        <SequenceRun key={round} notes={exercise.notes} onFinish={(o) => setResults((r) => [...r, o])} />
      )}
    </div>
  )
}

function RhythmStep({ exercise, onComplete }: { exercise: RhythmExercise; onComplete: Done }) {
  const { t } = useT()
  const [best, setBest] = useState<number | null>(null)
  const ok = best != null && best >= 0.6
  // the main action is right-most: "Skip" stands left of "Start", "Continue" right of "Try again"
  const next = (
    <StepActions>
      <Button size="lg" variant={ok ? 'primary' : 'ghost'} iconRight="next" onClick={() => onComplete({ score: best ?? 0.5 })}>
        {best == null ? t('ex.skip') : t('ex.continue')}
      </Button>
    </StepActions>
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 sm:gap-6">
      <ExerciseHeader title={exercise.title} instruction={exercise.instruction} />
      {!ok && next}
      <RhythmRun note={exercise.note} bpm={exercise.bpm} pattern={exercise.pattern} bars={exercise.bars} startVariant={ok ? 'secondary' : 'primary'} onFinish={(r) => setBest((b) => Math.max(b ?? 0, r.timing))} />
      {ok && next}
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
    if (run.complete) recordTune(tune.id, run.sectionId, run.report.overall, run.tempo, tune.title, { notes: run.report.notes, duet: isDuet(tune) })
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* two short lines: what to play, and what the step is for */}
      <div className="shrink-0 text-center">
        <h2 className="font-display text-xl font-semibold text-balance sm:text-3xl">{L(exercise.title)}</h2>
        {exercise.instruction && <p className="mt-0.5 text-sm text-ink-soft sm:text-base">{L(exercise.instruction)}</p>}
      </div>
      <TunePractice
        tune={tune}
        initialSection={exercise.sections?.[0] ?? 0}
        preset={{ tempo: exercise.tempo, melody: true }}
        compact
        onScored={onScored}
        // before the first run "I played it" stands left of Play; once there is a result, Continue takes the right-most place
        playPrimary={best == null}
        leadAction={
          best == null ? (
            <Button size="lg" variant="secondary" onClick={() => onComplete({ score: 0.6 })} className="min-w-0 flex-1 px-3">
              {t('melody.iPlayedIt')}
            </Button>
          ) : undefined
        }
        afterAction={
          best != null ? (
            <Button size="lg" iconRight="next" onClick={() => onComplete({ score: best })} className="min-w-0 flex-1 px-3">
              {t('ex.continue')}
            </Button>
          ) : undefined
        }
      />
      {best != null && <p className="text-center text-sm font-semibold text-good">{t('melody.best', { n: Math.round(best * 100) })}</p>}
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
        <div className="flex min-h-0 flex-1 flex-col items-center">
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
