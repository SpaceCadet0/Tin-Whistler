import { useEffect, useRef, useState } from 'react'
import { trainerParams } from '../../engine/adaptive/smartPractice'
import type { HoldEvent } from '../../engine/scoring/noteHold'
import { useNoteHold } from '../../hooks/useNoteHold'
import { useT } from '../../i18n'
import { noteById, whistleLabel } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSession } from '../../state/session'
import { AccuracyBar, TargetVsUser } from '../../ui/feedback/Feedback'
import { MicControl } from '../../ui/feedback/MicControl'
import { cn, ProgressBar } from '../../ui/primitives'
import { AnimatePresence, motion } from '../../ui/motion'
import { WhistleView } from '../../ui/whistle/WhistleView'
import { ListenButton } from '../exercises/shared'

export interface DrillStats {
  correct: number
  attempts: number
  bestStreak: number
}

function pickNext(pool: string[], prev: string | null, mastery: Record<string, number>): string {
  const options = pool.length > 1 ? pool.filter((n) => n !== prev) : pool
  // weaker notes come up more often
  const weights = options.map((n) => 1.6 - (mastery[n] ?? 0))
  let r = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < options.length; i++) {
    r -= weights[i]
    if (r <= 0) return options[i]
  }
  return options[0]
}

/** "Play the note": random targets from a pool, adaptive tolerance, instant feedback. */
export function NoteDrill({ pool, onStats, large }: { pool: string[]; onStats?: (s: DrillStats) => void; large?: boolean }) {
  const { t } = useT()
  const { micWanted, setMicWanted } = useSession()
  const stats = useProgress((s) => s.noteStats)
  const recordNote = useProgress((s) => s.recordNote)
  const mastery = Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.mastery]))
  const [target, setTarget] = useState(() => pickNext(pool, null, mastery))
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)
  const [s, setS] = useState<DrillStats & { streak: number }>({ correct: 0, attempts: 0, bestStreak: 0, streak: 0 })
  const note = noteById(target)!
  const params = trainerParams(mastery[target] ?? 0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!pool.includes(target)) setTarget(pickNext(pool, null, mastery))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool])
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), [])
  useEffect(() => onStats?.(s), [s, onStats])

  const onEvent = (e: HoldEvent) => {
    if (flash === 'good') return
    const hit = e.kind === 'success'
    recordNote(target, hit, e.cents)
    setS((p) => {
      const streak = hit ? p.streak + 1 : 0
      return { correct: p.correct + (hit ? 1 : 0), attempts: p.attempts + 1, streak, bestStreak: Math.max(p.bestStreak, streak) }
    })
    setFlash(hit ? 'good' : 'bad')
    if (hit) {
      timer.current = window.setTimeout(() => {
        setTarget((prev) => pickNext(pool, prev, mastery))
        setFlash(null)
      }, 700)
    } else timer.current = window.setTimeout(() => setFlash(null), 1200)
  }

  const hold = useNoteHold({ target: note.midi, holdMs: params.holdMs, tolerance: params.toleranceCents, enabled: micWanted, onEvent })

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full flex-col items-center gap-6 md:flex-row md:justify-center md:gap-14">
        <div className={cn('flex flex-col items-center rounded-[2rem] p-4 transition-colors', flash === 'good' && 'bg-good-soft', flash === 'bad' && 'bg-bad-soft')}>
          <span className="text-xs font-bold tracking-[0.2em] text-ink-soft uppercase">{t('trainer.play')}</span>
          <span className={cn('relative grid overflow-hidden font-display leading-[1.05] font-semibold', large ? 'h-[9.6rem] text-[9rem]' : 'h-[6.6rem] text-8xl')}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={note.id + s.correct}
                className="col-start-1 row-start-1 text-center"
                initial={{ y: '55%', opacity: 0 }}
                animate={{ y: 0, opacity: 1, x: flash === 'bad' ? [0, -10, 9, -6, 4, 0] : 0 }}
                exit={{ y: '-55%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 460, damping: 32, x: { duration: 0.4 } }}
              >
                {note.id}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="h-8 text-2xl font-semibold" role="status" aria-live="polite">
            {flash === 'good' ? <span className="text-good">✓ {t('ex.great')}</span> : flash === 'bad' ? <span className="text-bad">{t('trainer.tryAgain')}</span> : null}
          </span>
        </div>
        <WhistleView fingering={note.fingering} height={large ? 400 : 320} label={t('whistle.fingeringFor', { note: note.id })} />
      </div>
      <div className="flex w-full max-w-xl flex-col gap-4">
        <TargetVsUser target={note.midi} frame={hold.frame} status={hold.match.status} />
        <AccuracyBar value={hold.match.accuracy} />
        <ProgressBar value={hold.progress} tone="good" label={t('ex.hold')} />
        <p className="text-center text-sm text-ink-soft">
          {t('trainer.stats', { correct: s.correct, attempts: s.attempts, streak: s.streak })}
          {hold.frame?.voiced && hold.frame.note != null && hold.match.status !== 'correct' && ` · ${t('seq.hearing', { note: whistleLabel(hold.frame.note) })}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <MicControl enabled={micWanted} onChange={setMicWanted} status={hold.status} level={hold.frame?.level ?? 0} />
        <ListenButton note={note.id} />
      </div>
    </div>
  )
}
