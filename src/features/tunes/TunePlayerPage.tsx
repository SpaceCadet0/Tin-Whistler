import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { recommendTempo } from '../../engine/adaptive/smartPractice'
import { usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { useProgress } from '../../state/progress'
import { useTune } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { Chip } from '../../ui/primitives'
import { LEARNING_STEPS } from './learningSteps'
import { TunePractice, type ScoredRun } from './TunePractice'

export default function TunePlayerPage() {
  const { tuneId } = useParams()
  const [params] = useSearchParams()
  const tune = useTune(tuneId)
  const { t } = useT()
  const tp = useProgress((s) => (tuneId ? s.tunes[tuneId] : undefined))
  const recordTune = useProgress((s) => s.recordTune)
  const setStep = useProgress((s) => s.setTuneStep)
  const stepN = Number(params.get('step')) || 0
  const step = LEARNING_STEPS.find((s) => s.n === stepN)
  usePracticeTimer(true)

  const onScored = useCallback(
    (run: ScoredRun) => {
      if (!tune) return
      if (run.complete) recordTune(tune.id, run.sectionId, run.report.overall, run.tempo, tune.title)
      if (step?.pass && run.complete && run.report.overall >= step.pass) setStep(tune.id, step.n)
    },
    [tune, step, recordTune, setStep],
  )

  if (!tune) return null
  const firstSection = tune.sections[0]
  const preset = step?.preset ? { ...step.preset } : { tempo: recommendTempo(tp?.sections[firstSection.id], 0.8), melody: true }
  if (step?.n === 6) preset.tempo = recommendTempo(tp?.sections[firstSection.id], 0.7)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-2 flex items-center gap-3 sm:mb-4">
        <Link to={`/tunes/${tune.id}`} aria-label={t('common.back')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-soft hover:bg-surface-2">
          <Icon name="back" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold sm:text-3xl">{tune.title}</h1>
          {step && (
            <p className="text-sm text-ink-soft">
              {t('steps.step', { n: step.n })}: {t(step.title)}. {t(step.body)}
            </p>
          )}
        </div>
        {tp?.bestScore ? <Chip tone="good">{t('tune.best', { n: Math.round(tp.bestScore * 100) })}</Chip> : null}
      </div>
      <TunePractice key={stepN} tune={tune} preset={preset} onScored={onScored} />
    </div>
  )
}
