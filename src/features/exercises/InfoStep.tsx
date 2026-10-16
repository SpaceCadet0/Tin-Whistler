import type { ExerciseResult, InfoExercise } from '../../engine/lesson/types'
import { useT } from '../../i18n'
import { noteById } from '../../music/whistles'
import { Illustration } from '../../ui/Illustration'
import { Button } from '../../ui/primitives'
import { ExerciseHeader, FitWhistle, ListenButton } from './shared'
import { StepActions } from './StepActions'

export function InfoStep({ exercise, onComplete }: { exercise: InfoExercise; onComplete: (r: ExerciseResult) => void }) {
  const { t, L } = useT()
  const note = exercise.note ? noteById(exercise.note) : undefined
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <ExerciseHeader title={exercise.title} />
      {/* the picture takes the height that is left; text and buttons keep theirs */}
      <div className="flex min-h-36 w-full flex-1 flex-row items-center justify-center gap-4 sm:gap-10 lg:flex-none">
        {exercise.illustration && (
          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center lg:w-80 lg:flex-none">
            <Illustration kind={exercise.illustration} className="h-full max-h-56 lg:h-44" />
          </div>
        )}
        {note && <FitWhistle fingering={note.fingering} max={280} wrapperClassName="w-16 flex-none lg:w-auto" label={t('whistle.fingeringFor', { note: note.id })} />}
      </div>
      <p className="mt-4 max-w-lg shrink-0 text-center text-base leading-relaxed text-balance sm:mt-6 sm:text-xl">{L(exercise.body)}</p>
      <StepActions>
        {note && <ListenButton note={note.id} />}
        <Button size="lg" iconRight="next" onClick={() => onComplete({ score: 1 })} autoFocus>
          {t('ex.gotIt')}
        </Button>
      </StepActions>
    </div>
  )
}
