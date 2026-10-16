import { useEffect, useState } from 'react'
import { whistleSynth } from '../../audio/WhistleSynth'
import type { ExerciseResult, FingeringExercise } from '../../engine/lesson/types'
import { useT } from '../../i18n'
import { fingeringsEqual, tapHole } from '../../music/fingerings'
import type { Fingering } from '../../music/types'
import { noteById } from '../../music/whistles'
import { Button } from '../../ui/primitives'
import { ExerciseHeader, FitWhistle, ListenButton } from './shared'
import { StepActions } from './StepActions'
import { motion } from '../../ui/motion'

const OPEN: Fingering = [0, 0, 0, 0, 0, 0]

/** Tap the holes to build the fingering, learn the shape before blowing. */
export function FingeringStep({ exercise, onComplete }: { exercise: FingeringExercise; onComplete: (r: ExerciseResult) => void }) {
  const { t } = useT()
  const note = noteById(exercise.note)!
  const [fg, setFg] = useState<Fingering>(OPEN)
  const [hint, setHint] = useState(false)
  const [tries, setTries] = useState(0)
  const done = fingeringsEqual(fg, note.fingering)

  useEffect(() => {
    if (done) whistleSynth.playNote(note.midi, 0.9)
  }, [done, note.midi])

  const toggle = (i: number) => {
    if (done) return
    setTries((n) => n + 1)
    setFg((prev) => tapHole(prev, i))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <ExerciseHeader title={exercise.title} instruction={{ en: 'Tap the holes your fingers should cover.', ru: 'Нажмите на отверстия, которые нужно закрыть.' }} />
      {/* phone: the whistle stands tall on the left, the note and the result beside it; wide screens stack them */}
      <div className="flex min-h-0 w-full flex-1 flex-row items-stretch justify-center gap-6 lg:flex-none lg:flex-col lg:items-center lg:gap-0">
        <FitWhistle fingering={fg} target={hint ? note.fingering : undefined} interactive={!done} onToggle={toggle} max={420} minHeight={180} wrapperClassName="w-28 flex-none lg:w-full" label={t('whistle.tapToCover')} />
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 max-lg:w-32 lg:order-first lg:mb-2 lg:gap-0">
          <p className="text-sm font-bold tracking-[0.2em] text-ink-soft uppercase">{t('ex.note')}</p>
          <p className="font-display text-6xl font-semibold">{note.id}</p>
          {/* always there, so nothing changes size when the step is solved */}
          <div className="flex h-10 items-center justify-center lg:mt-2" role="status">
            {done && (
              <motion.p className="text-center font-display text-xl font-semibold text-good sm:text-2xl" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                ✓ {t('ex.perfect')}
              </motion.p>
            )}
          </div>
        </div>
      </div>
      <StepActions>
        {done ? (
          <Button size="lg" iconRight="next" onClick={() => onComplete({ score: tries <= 8 ? 1 : 0.8 })} autoFocus>
            {t('ex.continue')}
          </Button>
        ) : (
          <>
            <Button size="lg" variant="ghost" icon="eye" onClick={() => setHint((h) => !h)} aria-pressed={hint}>
              {hint ? t('ex.hideHint') : t('ex.showMe')}
            </Button>
            <ListenButton note={note.id} />
          </>
        )}
      </StepActions>
    </div>
  )
}
