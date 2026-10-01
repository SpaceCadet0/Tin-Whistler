import { useEffect, useState } from 'react'
import { whistleSynth } from '../../audio/WhistleSynth'
import type { ExerciseResult, FingeringExercise } from '../../engine/lesson/types'
import { useT } from '../../i18n'
import { fingeringsEqual } from '../../music/fingerings'
import type { Fingering, HoleState } from '../../music/types'
import { noteById } from '../../music/whistles'
import { Button } from '../../ui/primitives'
import { WhistleView } from '../../ui/whistle/WhistleView'
import { Celebrate, ExerciseHeader, ListenButton } from './shared'

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
    setFg((prev) => {
      const next = [...prev] as HoleState[]
      next[i] = prev[i] === 1 ? 0 : 1
      return next as unknown as Fingering
    })
  }

  return (
    <div className="flex flex-col items-center">
      <ExerciseHeader title={exercise.title} instruction={{ en: 'Tap the holes your fingers should cover.', ru: 'Нажмите на отверстия, которые нужно закрыть.' }} />
      <p className="mb-2 text-sm font-bold tracking-[0.2em] text-ink-soft uppercase">{t('ex.note')}</p>
      <p className="mb-4 font-display text-6xl font-semibold">{note.id}</p>
      <WhistleView
        fingering={fg}
        target={hint ? note.fingering : undefined}
        interactive={!done}
        onToggle={toggle}
        height={420}
        label={t('whistle.tapToCover')}
      />
      <div className="mt-6 min-h-24">
        {done ? (
          <Celebrate title={t('ex.perfect')}>
            <Button size="lg" iconRight="next" onClick={() => onComplete({ score: tries <= 8 ? 1 : 0.8 })} autoFocus>
              {t('ex.continue')}
            </Button>
          </Celebrate>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            <ListenButton note={note.id} />
            <Button variant="ghost" icon="eye" onClick={() => setHint((h) => !h)} aria-pressed={hint}>
              {hint ? t('ex.hideHint') : t('ex.showMe')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
