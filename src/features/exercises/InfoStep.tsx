import type { ExerciseResult, InfoExercise } from '../../engine/lesson/types'
import { useT } from '../../i18n'
import { noteById } from '../../music/whistles'
import { Illustration } from '../../ui/Illustration'
import { Button } from '../../ui/primitives'
import { WhistleView } from '../../ui/whistle/WhistleView'
import { ExerciseHeader, ListenButton } from './shared'

export function InfoStep({ exercise, onComplete }: { exercise: InfoExercise; onComplete: (r: ExerciseResult) => void }) {
  const { t, L } = useT()
  const note = exercise.note ? noteById(exercise.note) : undefined
  return (
    <div className="flex flex-col items-center">
      <ExerciseHeader title={exercise.title} />
      <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
        {exercise.illustration && <Illustration kind={exercise.illustration} />}
        {note && <WhistleView fingering={note.fingering} height={280} label={t('whistle.fingeringFor', { note: note.id })} />}
      </div>
      <p className="mt-6 max-w-lg text-center text-xl leading-relaxed text-balance">{L(exercise.body)}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {note && <ListenButton note={note.id} />}
        <Button size="lg" iconRight="next" onClick={() => onComplete({ score: 1 })} autoFocus>
          {t('ex.gotIt')}
        </Button>
      </div>
    </div>
  )
}
