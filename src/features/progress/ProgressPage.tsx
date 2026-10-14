import { Triskele } from '../../ui/ornaments'
import { Link } from 'react-router-dom'
import { ACHIEVEMENTS } from '../../engine/progress/achievements'
import { courseProgress } from '../../engine/lesson/course'
import { computeStreak, levelFromXp } from '../../engine/progress/levels'
import { useT } from '../../i18n'
import { dayKeyOffset } from '../../lib/storage'
import { FIRST_OCTAVE, SECOND_OCTAVE } from '../../music/whistles'
import { MASTERED_NOTE, useProgress } from '../../state/progress'
import { useAllTunes } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { Card, Chip, cn, PageHeader, ProgressBar, ProgressRing, Stat } from '../../ui/primitives'
import { Stagger } from '../../ui/motion'

export default function ProgressPage() {
  const { t, L, lang } = useT()
  const p = useProgress()
  const tunes = useAllTunes()
  const lvl = levelFromXp(p.xp)
  const active = new Set(Object.keys(p.days).filter((d) => p.days[d].seconds > 0 || p.days[d].xp > 0))
  const streak = computeStreak(active)
  const course = courseProgress(p.completedLessons)
  const totalMin = Math.round(Object.values(p.days).reduce((s, d) => s + d.seconds, 0) / 60)
  const weeks = 12
  const days = Array.from({ length: weeks * 7 }, (_, i) => dayKeyOffset(i - (weeks * 7 - 1)))
  const maxSec = Math.max(60, ...days.map((d) => p.days[d]?.seconds ?? 0))
  const learnedTunes = Object.entries(p.tunes).filter(([, x]) => x.completedFull > 0 || x.step > 0)
  const fmt = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle')} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="relative flex items-center gap-5 overflow-hidden lg:col-span-1">
          <Triskele ring className="pointer-events-none absolute -right-8 -bottom-10 h-40 w-40 text-moss opacity-[0.1]" weight={3} />
          <ProgressRing value={lvl.progress} size={96} stroke={8} label={t('progress.xpToNext')}>
            <span className="flex flex-col items-center leading-none">
              <span className="text-xs text-ink-soft">{t('progress.level')}</span>
              <span className="font-display text-3xl font-semibold">{lvl.level}</span>
            </span>
          </ProgressRing>
          <div>
            <p className="tabular font-display text-3xl font-semibold">{p.xp} XP</p>
            <p className="text-sm text-ink-soft">{t('progress.toNext', { n: lvl.next - p.xp })}</p>
          </div>
        </Card>
        <Card className="grid grid-cols-2 gap-5 lg:col-span-2 2xl:grid-cols-4">
          <Stat icon="flame" tone="brass" value={streak} label={t('home.streak')} />
          <Stat icon="timer" value={totalMin} label={t('progress.minutes')} />
          <Stat icon="book" value={`${course.done}/${course.total}`} label={t('progress.lessons')} />
          <Stat icon="trophy" tone="brass" value={`${Object.keys(p.achievements).length}/${ACHIEVEMENTS.length}`} label={t('progress.achievements')} />
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('progress.calendar')}</h2>
        <div className="scrollbar-none overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label={t('progress.calendarAria', { n: active.size })}>
            {days.map((d) => {
              const sec = p.days[d]?.seconds ?? 0
              const v = sec / maxSec
              return (
                <span
                  key={d}
                  title={`${d}: ${Math.round(sec / 60)} ${t('common.min')}${p.days[d]?.dailyDone ? ' ✓' : ''}`}
                  className={cn('h-4 w-4 rounded-[4px]', sec === 0 ? 'bg-surface-2' : '')}
                  style={sec ? { background: `color-mix(in oklab, var(--c-moss) ${25 + v * 75}%, var(--c-surface-2))` } : undefined}
                />
              )
            })}
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-xl font-semibold">{t('progress.notes')}</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {[...FIRST_OCTAVE, ...SECOND_OCTAVE].map((n) => {
              const st = p.noteStats[n]
              const mastered = st && st.mastery >= MASTERED_NOTE && st.hits >= 5
              return (
                <li key={n} className="flex items-center gap-3">
                  <span className={cn('grid h-9 w-9 place-items-center rounded-xl font-display font-semibold', mastered ? 'bg-good-soft text-good' : 'bg-surface-2')}>{n}</span>
                  <span className="flex-1">
                    <ProgressBar value={st?.mastery ?? 0} tone={mastered ? 'good' : 'moss'} height={6} label={`${n} ${t('progress.mastery')}`} />
                    <span className="text-xs text-ink-soft">{st ? `${st.hits}/${st.attempts}${mastered ? ' ✓' : ''}` : '-'}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-xl font-semibold">{t('progress.tunes')}</h2>
          {learnedTunes.length === 0 ? (
            <p className="text-ink-soft">{t('progress.noTunes')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {learnedTunes.map(([id, tp]) => {
                const tune = tunes.find((x) => x.id === id)
                if (!tune) return null
                return (
                  <li key={id}>
                    <Link to={`/tunes/${id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface-2">
                      <span className="flex-1">
                        <span className="block font-semibold">{tune.title}</span>
                        <ProgressBar value={tp.step / 7} height={6} label={t('tune.learning')} />
                      </span>
                      {tp.mastered ? <Chip tone="good">{t('tune.mastered')}</Chip> : tp.bestScore ? <Chip>{Math.round(tp.bestScore * 100)}%</Chip> : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-4 font-display text-xl font-semibold">{t('progress.achievements')}</h2>
        <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const got = p.achievements[a.id]
            return (
              <li key={a.id} className={cn('flex items-center gap-3 rounded-2xl border p-3', got ? 'border-brass/40 bg-brass-soft/40' : 'border-line opacity-60')}>
                <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', got ? 'bg-brass text-white' : 'bg-surface-2 text-ink-faint')}>
                  <Icon name={a.icon} />
                </span>
                <span>
                  <span className="block font-semibold">{L(a.title)}</span>
                  <span className="text-sm text-ink-soft">{L(a.description)}</span>
                </span>
                <span className="sr-only">{got ? t('progress.unlocked') : t('progress.locked')}</span>
              </li>
            )
          })}
        </Stagger>
      </Card>

      {p.log.length > 0 && (
        <Card className="mt-5">
          <h2 className="mb-4 font-display text-xl font-semibold">{t('progress.recent')}</h2>
          <ul className="divide-y divide-line">
            {p.log.slice(0, 12).map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Chip>{t(`log.${e.kind}`)}</Chip>
                  {e.label}
                </span>
                <span className="text-ink-soft">
                  {e.score != null && `${Math.round(e.score * 100)}% · `}
                  {fmt.format(e.at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
