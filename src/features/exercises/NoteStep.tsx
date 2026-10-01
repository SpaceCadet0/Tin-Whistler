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
import { Button, ProgressBar } from '../../ui/primitives'
import { WhistleView } from '../../ui/whistle/WhistleView'
import { Celebrate, ExerciseHeader, ListenButton, RepDots } from './shared'

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
    <div className="flex flex-col items-center">
      <ExerciseHeader title={exercise.title} instruction={exercise.instruction} />
      <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
        <WhistleView fingering={note.fingering} height={360} label={t('whistle.fingeringFor', { note: note.id })} />
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          {finished ? (
            <Celebrate title={t('ex.great')}>
              <p className="text-ink-soft">{t('ex.repsDone', { n: reps })}</p>
              <Button size="lg" iconRight="next" onClick={() => onComplete({ score, missedNotes: misses > 1 ? [note.id] : [] })} autoFocus>
                {t('ex.continue')}
              </Button>
            </Celebrate>
          ) : (
            <>
              {exercise.type === 'pitch' ? (
                <div className="flex flex-col items-center">
                  <span className="font-display text-6xl font-semibold">{note.id}</span>
                  <TunerGauge cents={hold.match.status === 'silent' ? 0 : hold.match.cents} active={hold.match.status !== 'silent'} locked={hold.match.status === 'correct'} />
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
              {lastMiss != null && (
                <p className="text-center text-warn" role="status">
                  {t('ex.heardInstead', { note: whistleLabel(lastMiss) })}
                </p>
              )}
              <MicControl enabled={micWanted} onChange={setMicWanted} status={hold.status} level={hold.frame?.level ?? 0} />
              <div className="flex flex-wrap justify-center gap-2">
                <ListenButton note={note.id} duration={exercise.holdMs / 1000 + 0.4} />
                <Button variant="ghost" onClick={() => setDone((d) => d + 1)} title={t('ex.selfReportHint')}>
                  {t('ex.selfReport')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
