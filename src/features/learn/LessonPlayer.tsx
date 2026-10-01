import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LESSONS, lessonById } from '../../data/lessons/course'
import type { ExerciseResult } from '../../engine/lesson/types'
import { XP } from '../../engine/progress/levels'
import { usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { useProgress } from '../../state/progress'
import { Icon } from '../../ui/Icon'
import { AnimatedNumber, EASE_OUT, motion } from '../../ui/motion'
import { Button, ButtonLink, Card, cn } from '../../ui/primitives'
import { ExerciseRunner } from '../exercises/ExerciseRunner'

/** Lesson = a short list of small steps: Learn → Play → Feedback → Repeat. */
export default function LessonPlayer() {
  const { lessonId } = useParams()
  const lesson = lessonById(lessonId ?? '')
  const { t, L } = useT()
  const navigate = useNavigate()
  const completeLesson = useProgress((s) => s.completeLesson)
  const addXp = useProgress((s) => s.addXp)
  const [step, setStep] = useState(0)
  const [results, setResults] = useState<ExerciseResult[]>([])
  usePracticeTimer(true)

  useEffect(() => {
    setStep(0)
    setResults([])
  }, [lessonId])

  if (!lesson) return <p>{t('learn.notFound')}</p>
  const total = lesson.exercises.length
  const finished = step >= total
  const score = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0
  const nextL = LESSONS[LESSONS.indexOf(lesson) + 1]
  const missed = [...new Set(results.flatMap((r) => r.missedNotes ?? []))]

  const onComplete = (r: ExerciseResult) => {
    const ex = lesson.exercises[step]
    if (ex.type !== 'info' && ex.type !== 'fingering') addXp(XP.exercise)
    const all = [...results, r]
    setResults(all)
    if (step + 1 >= total) completeLesson(lesson.id, all.reduce((s, x) => s + x.score, 0) / all.length, L(lesson.title))
    setStep((s) => s + 1)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/learn" aria-label={t('common.close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-soft hover:bg-surface-2">
          <Icon name="x" />
        </Link>
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(step, total)} aria-label={t('lesson.progress')}>
          {lesson.exercises.map((_, i) => (
            <span key={i} className={cn('h-2 flex-1 rounded-full transition-colors', i < step ? 'bg-good' : i === step ? 'bg-moss' : 'bg-surface-2')} />
          ))}
        </div>
        <span className="tabular text-sm font-semibold text-ink-soft">
          {Math.min(step + 1, total)}/{total}
        </span>
      </div>

      {!finished ? (
        <motion.div key={step} initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.38, ease: EASE_OUT }}>
          {step === 0 && (
            <p className="mb-2 text-center text-sm font-semibold text-ink-soft">
              {L(lesson.title)} · {lesson.objectives.map((o) => L(o)).join(' · ')}
            </p>
          )}
          <ExerciseRunner exercise={lesson.exercises[step]} onComplete={onComplete} />
          <div className="mt-8 flex justify-center">
            <button type="button" className="text-sm text-ink-faint underline-offset-4 hover:underline" onClick={() => onComplete({ score: 0.5 })}>
              {t('lesson.skipStep')}
            </button>
          </div>
        </motion.div>
      ) : (
        <Card className="mx-auto flex w-full max-w-xl animate-pop flex-col items-center gap-5 p-8 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-good-soft text-good">
            <Icon name="trophy" size={40} />
          </span>
          <h1 className="font-display text-4xl font-semibold">{t('lesson.done')}</h1>
          <p className="text-lg text-ink-soft">{L(lesson.title)}</p>
          <div className="flex gap-8">
            <div>
              <p className="tabular font-display text-3xl font-semibold">
                <AnimatedNumber value={score * 100} format={(n) => `${Math.round(n)}%`} />
              </p>
              <p className="text-sm text-ink-soft">{t('lesson.score')}</p>
            </div>
            <div>
              <p className="tabular font-display text-3xl font-semibold text-brass">+{XP.lesson}</p>
              <p className="text-sm text-ink-soft">XP</p>
            </div>
          </div>
          {missed.length > 0 && (
            <p className="rounded-2xl bg-warn-soft px-4 py-3 text-warn">{t('lesson.practiceMissed', { notes: missed.join(', ') })}</p>
          )}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            {nextL ? (
              <Button size="lg" iconRight="next" onClick={() => navigate(`/learn/${nextL.id}`)}>
                {t('lesson.next')}
              </Button>
            ) : (
              <ButtonLink to="/tunes" size="lg" iconRight="next">
                {t('home.allTunes')}
              </ButtonLink>
            )}
            {lesson.melody && (
              <ButtonLink to={`/tunes/${lesson.melody}`} size="lg" variant="secondary" icon="music">
                {t('lesson.openTune')}
              </ButtonLink>
            )}
            <Button size="lg" variant="ghost" icon="repeat" onClick={() => { setStep(0); setResults([]) }}>
              {t('lesson.again')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
