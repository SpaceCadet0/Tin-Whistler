import { useState } from 'react'
import type { HoldEvent } from '../../engine/scoring/noteHold'
import type { ExerciseResult, NoteExercise, PitchExercise } from '../../engine/lesson/types'
import { useNoteHold } from '../../hooks/useNoteHold'
import { useT } from '../../i18n'
import { noteById, whistleLabel } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSession } from '../../state/session'
import { AccuracyBar, TargetVsUser, TunerGauge } from '../../ui/feedback/Feedback'
import { MicControl } from '../../ui/feedback/MicControl'
import { Button, cn, ProgressBar } from '../../ui/primitives'
import { Celebrate, ExerciseHeader, FitWhistle, ListenButton, RepDots } from './shared'
import { StepActions } from './StepActions'
import { useStepFooter } from './stepFooter'

/**
 * "Play the note" with the microphone: hold the target for `holdMs`, `repetitions` times.
 * Also used for long tones (pitch exercise: one long, in-tune repetition).
 */
export function NoteStep({ exercise, onComplete }: { exercise: NoteExercise | PitchExercise; onComplete: (r: ExerciseResult) => void }) {
  const { t } = useT()
  const note = noteById(exercise.note)!
  const reps = exercise.type === 'note' ? exercise.repetitions : 1
  const tolerance = exercise.type === 'pitch' ? exercise.tolerance : 40
  const { micWanted, setMicWanted } = useSession()
  const recordNote = useProgress((s) => s.recordNote)
  const [done, setDone] = useState(0)
  const [misses, setMisses] = useState(0)
  const [lastMiss, setLastMiss] = useState<number | null>(null)
  const finished = done >= reps
  // in a lesson on a phone the whistle stands beside the feedback instead of above it
  const pinned = useStepFooter() != null

  const onEvent = (e: HoldEvent) => {
    if (finished) return
    if (e.kind === 'success') {
      recordNote(note.id, true, e.cents)
      setDone((d) => d + 1)
      setLastMiss(null)
    } else {
      recordNote(note.id, false)
      setMisses((m) => m + 1)
      setLastMiss(e.played ?? null)
    }
  }

  const hold = useNoteHold({ target: note.midi, holdMs: exercise.holdMs, tolerance, enabled: micWanted && !finished, onEvent })
  const score = reps / (reps + misses * 0.5)

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <ExerciseHeader title={exercise.title} instruction={exercise.instruction} />
      <div className={cn('flex w-full', pinned ? 'min-h-0 flex-1 gap-4 lg:flex-none lg:items-start lg:justify-center lg:gap-8' : 'flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center')}>
        <FitWhistle fingering={note.fingering} max={360} minHeight={200} wrapperClassName="w-[4.5rem] flex-none sm:w-24 lg:w-auto" label={t('whistle.fingeringFor', { note: note.id })} />
        <div className={cn('flex w-full max-w-md flex-col items-center', pinned ? 'min-w-0 flex-1 justify-center gap-2 lg:justify-start lg:gap-6' : 'gap-6')}>
          {finished ? (
            <Celebrate title={t('ex.great')}>
              <p className="text-ink-soft">{t('ex.repsDone', { n: reps })}</p>
            </Celebrate>
          ) : (
            <>
              {exercise.type === 'pitch' ? (
                <div className="flex flex-col items-center">
                  <span className="font-display text-5xl font-semibold sm:text-6xl">{note.id}</span>
                  <TunerGauge cents={hold.match.status === 'silent' ? 0 : hold.match.cents} active={hold.match.status !== 'silent'} locked={hold.match.status === 'correct'} compact={pinned} />
                </div>
              ) : (
                <TargetVsUser target={note.midi} frame={hold.frame} status={hold.match.status} />
              )}
              <div className="w-full">
                <p className="mb-2 text-sm font-semibold text-ink-soft">{hold.waitingRelease ? t('ex.release') : t('ex.hold')}</p>
                <ProgressBar value={hold.progress} tone="good" height={12} label={t('ex.hold')} />
              </div>
              <AccuracyBar value={hold.match.accuracy} />
              {reps > 1 && <RepDots done={done} total={reps} />}
              {/* reserved, so the column doesn't jump when a wrong note is heard */}
              <p className="min-h-5 text-center text-sm text-warn sm:min-h-6 sm:text-base" role="status">
                {lastMiss != null && t('ex.heardInstead', { note: whistleLabel(lastMiss) })}
              </p>
              <MicControl enabled={micWanted} onChange={setMicWanted} status={hold.status} level={hold.frame?.level ?? 0} />
            </>
          )}
        </div>
      </div>
      <StepActions>
        {finished ? (
          <Button size="lg" iconRight="next" onClick={() => onComplete({ score, missedNotes: misses > 1 ? [note.id] : [] })} autoFocus>
            {t('ex.continue')}
          </Button>
        ) : (
          <>
            <Button size="lg" variant="ghost" onClick={() => setDone((d) => d + 1)} title={t('ex.selfReportHint')}>
              {t('ex.selfReport')}
            </Button>
            <ListenButton note={note.id} duration={exercise.holdMs / 1000 + 0.4} />
          </>
        )}
      </StepActions>
    </div>
  )
}
