import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildDailyPlan, type DailyBlock } from '../../engine/daily'
import { learnedNotes, nextLesson } from '../../engine/lesson/course'
import { XP } from '../../engine/progress/levels'
import { usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { todayKey } from '../../lib/storage'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { useShallow } from 'zustand/react/shallow'
import { useTune } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { EASE_OUT, motion } from '../../ui/motion'
import { Button, ButtonLink, Card, cn } from '../../ui/primitives'
import { EarQuiz } from '../exercises/EarQuiz'
import { NoteStep } from '../exercises/NoteStep'
import { SequenceRun } from '../exercises/SequenceRun'
import { Celebrate } from '../exercises/shared'
import { NoteDrill, type DrillStats } from '../practice/NoteDrill'
import { TunePractice } from '../tunes/TunePractice'

function useCountdown(seconds: number, running: boolean) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => setLeft(seconds), [seconds])
  useEffect(() => {
    if (!running || left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [running, left])
  return left
}

function WarmUp({ block, onDone }: { block: DailyBlock; onDone: () => void }) {
  const [i, setI] = useState(0)
  const note = block.notes[i]
  return (
    <NoteStep
      key={note + i}
      exercise={{ id: `warm-${i}`, type: 'pitch', note, holdMs: 3000, tolerance: 35, title: { en: `Long ${note}`, ru: `Длинная ${note}` }, instruction: { en: 'Steady breath, steady needle.', ru: 'Ровное дыхание, ровная стрелка.' } }}
      onComplete={() => (i + 1 < block.notes.length ? setI(i + 1) : onDone())}
    />
  )
}

function Challenge({ block, onDone }: { block: DailyBlock; onDone: () => void }) {
  const { t } = useT()
  const notes = block.notes.length >= 3 ? block.notes : ['G', 'A', 'B']
  if (block.challenge === 'ear') return <EarQuiz choices={notes.slice(0, 4)} rounds={5} onComplete={onDone} />
  const seq = [...notes, ...[...notes].reverse().slice(1)].slice(0, 6)
  return (
    <div className="flex flex-col items-center gap-4">
      {block.challenge === 'game' && (
        <p className="text-center text-ink-soft">
          {t('daily.gameHint')}{' '}
          <Link to="/practice/game" className="font-semibold text-moss underline">
            {t('practice.game')}
          </Link>
        </p>
      )}
      <SequenceRun notes={seq} onFinish={() => onDone()} />
    </div>
  )
}

/** ~10 minutes: warm-up → notes → melody → challenge, then a short summary. */
export default function DailyPractice() {
  const { t, L } = useT()
  const { dailyGoalMin, level } = useSettings(useShallow((s) => ({ dailyGoalMin: s.dailyGoalMin, level: s.level })))
  const p = useProgress()
  const completeDaily = useProgress((s) => s.completeDaily)
  const known = learnedNotes(p.completedLessons, level)
  const lastTune = Object.entries(p.tunes).sort((a, b) => b[1].lastPlayed - a[1].lastPlayed)[0]?.[0]
  const lessonTune = nextLesson(p.completedLessons, level)?.melody
  const tuneId = lastTune ?? lessonTune ?? 'hot-cross-buns'
  const tune = useTune(tuneId)
  const plan = useMemo(
    () => buildDailyPlan({ goalMinutes: dailyGoalMin, known, stats: p.noteStats, tuneId, dayIndex: new Date().getDate() }),
    // plan is fixed for the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [idx, setIdx] = useState(0)
  const [drill, setDrill] = useState<DrillStats>({ correct: 0, attempts: 0, bestStreak: 0 })
  const startedAt = useRef(Date.now())
  const xpAtStart = useRef(p.xp)
  const finished = idx >= plan.length
  const block = plan[Math.min(idx, plan.length - 1)]
  const left = useCountdown(block.seconds, !finished)
  const alreadyDone = p.days[todayKey()]?.dailyDone
  usePracticeTimer(!finished)

  useEffect(() => {
    if (finished && !alreadyDone) completeDaily()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  const next = () => setIdx((i) => i + 1)
  const mm = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" aria-label={t('common.close')} className="grid h-11 w-11 place-items-center rounded-2xl text-ink-soft hover:bg-surface-2">
          <Icon name="x" />
        </Link>
        <ol className="flex flex-1 gap-2" aria-label={t('daily.title')}>
          {plan.map((b, i) => (
            <li key={b.kind} className="flex flex-1 flex-col gap-1">
              <span className={cn('h-2 rounded-full', i < idx ? 'bg-good' : i === idx ? 'bg-moss' : 'bg-surface-2')} />
              <span className={cn('hidden text-xs font-semibold sm:block', i === idx ? 'text-ink' : 'text-ink-faint')}>
                {Math.round(b.seconds / 60)} {t('common.min')} · {L(b.title)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {finished ? (
        <Card className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 p-8 text-center">
          <Celebrate title={t('daily.complete')} />
          <div className="grid w-full grid-cols-3 gap-3">
            <div>
              <p className="tabular font-display text-3xl font-semibold">{Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))}</p>
              <p className="text-sm text-ink-soft">{t('common.min')}</p>
            </div>
            <div>
              <p className="tabular font-display text-3xl font-semibold">{drill.correct}</p>
              <p className="text-sm text-ink-soft">{t('daily.notesHit')}</p>
            </div>
            <div>
              <p className="tabular font-display text-3xl font-semibold text-brass">+{Math.max(XP.dailyPractice, p.xp - xpAtStart.current)}</p>
              <p className="text-sm text-ink-soft">XP</p>
            </div>
          </div>
          <ButtonLink to="/" size="lg" iconRight="next">
            {t('daily.backHome')}
          </ButtonLink>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-brass uppercase">{t('daily.block', { n: idx + 1, of: plan.length })}</p>
              <h1 className="font-display text-3xl font-semibold">{L(block.title)}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('tabular rounded-2xl px-4 py-2 font-display text-2xl font-semibold', left <= 0 ? 'bg-good-soft text-good' : 'bg-surface-2')} aria-live="off">
                {mm(left)}
              </span>
              <Button variant={left <= 0 ? 'primary' : 'secondary'} iconRight="next" onClick={next}>
                {left <= 0 ? t('ex.next') : t('ex.skip')}
              </Button>
            </div>
          </div>
          <motion.div key={idx} initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.38, ease: EASE_OUT }}>
            {block.kind === 'warmup' && <WarmUp block={block} onDone={next} />}
            {block.kind === 'notes' && <NoteDrill pool={block.notes} onStats={setDrill} />}
            {block.kind === 'melody' && tune && <TunePractice tune={tune} compact preset={{ tempo: 0.8 }} />}
            {block.kind === 'challenge' && <Challenge block={block} onDone={next} />}
          </motion.div>
        </>
      )}
    </div>
  )
}
