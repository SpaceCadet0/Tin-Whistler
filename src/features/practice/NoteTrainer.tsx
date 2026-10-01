import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { learnedNotes } from '../../engine/lesson/course'
import { usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { FIRST_OCTAVE, SECOND_OCTAVE } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { Button, cn, PageHeader } from '../../ui/primitives'
import { NoteDrill } from './NoteDrill'

const ALL = [...FIRST_OCTAVE, ...SECOND_OCTAVE]

export default function NoteTrainer() {
  const { t } = useT()
  const [params] = useSearchParams()
  const focus = params.get('focus')
  const seconds = Number(params.get('seconds')) || 0
  const completed = useProgress((s) => s.completedLessons)
  const level = useSettings((s) => s.level)
  const known = learnedNotes(completed, level)
  const [pool, setPool] = useState<string[]>(() => (focus ? [focus] : known.length >= 3 ? known.filter((n) => ALL.includes(n)) : ['G', 'A', 'B']))
  const [left, setLeft] = useState(seconds)
  usePracticeTimer(true)

  useEffect(() => {
    if (!seconds || left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [seconds, left])

  const toggle = (n: string) => setPool((p) => (p.includes(n) ? (p.length > 1 ? p.filter((x) => x !== n) : p) : [...p, n]))
  const stablePool = useMemo(() => pool, [pool])

  return (
    <div>
      <PageHeader
        back="/practice"
        title={focus ? t('trainer.focusTitle', { note: focus }) : t('practice.notes')}
        subtitle={focus ? t('trainer.focusBody', { note: focus }) : t('practice.notesBody')}
        actions={seconds ? <span className="tabular rounded-2xl bg-brass-soft px-4 py-2 font-display text-2xl font-semibold text-brass">{Math.max(0, left)}s</span> : undefined}
      />
      {seconds > 0 && left <= 0 ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="font-display text-3xl font-semibold">{t('trainer.timeUp')}</p>
          <Button onClick={() => setLeft(seconds)} icon="repeat">
            {t('trainer.again')}
          </Button>
        </div>
      ) : (
        <NoteDrill pool={stablePool} large />
      )}
      {!focus && (
        <div className="mt-10">
          <p className="mb-3 text-center text-sm font-semibold text-ink-soft">{t('trainer.pool')}</p>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t('trainer.pool')}>
            {ALL.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={pool.includes(n)}
                onClick={() => toggle(n)}
                className={cn('h-11 min-w-12 rounded-2xl px-3 font-display text-lg font-semibold transition', pool.includes(n) ? 'bg-moss text-on-moss' : 'bg-surface-2 text-ink-soft')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
