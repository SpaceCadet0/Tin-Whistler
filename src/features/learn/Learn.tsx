import { Triskele } from '../../ui/ornaments'
import { Link } from 'react-router-dom'
import { COURSE_LEVELS, LESSONS } from '../../data/lessons/course'
import { courseProgress, lessonStatus } from '../../engine/lesson/course'
import { useT } from '../../i18n'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { Icon } from '../../ui/Icon'
import { ButtonLink, Chip, cn, PageHeader, ProgressBar } from '../../ui/primitives'
import { Stagger } from '../../ui/motion'

export default function Learn() {
  const { t, L } = useT()
  const completed = useProgress((s) => s.completedLessons)
  const level = useSettings((s) => s.level)
  const course = courseProgress(completed)

  return (
    <div>
      <PageHeader
        title={t('learn.title')}
        subtitle={t('learn.subtitle')}
        actions={
          <ButtonLink to="/tunes" variant="secondary" icon="music" size="sm">
            {t('learn.skipToTunes')}
          </ButtonLink>
        }
      />
      <div className="mb-8 max-w-md">
        <ProgressBar value={course.fraction} label={t('home.course')} />
        <p className="mt-2 text-sm text-ink-soft">{t('learn.progress', { done: course.done, total: course.total })}</p>
      </div>

      <div className="flex flex-col gap-10">
        {COURSE_LEVELS.map((cl) => {
          const lessons = LESSONS.filter((l) => l.level === cl.id)
          const done = lessons.filter((l) => completed[l.id]).length
          return (
            <section key={cl.id} aria-labelledby={`level-${cl.id}`}>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-brass uppercase">
                    <Triskele className="h-4 w-4" weight={7} />
                    {t('home.level', { n: cl.id })}
                  </p>
                  <h2 id={`level-${cl.id}`} className="font-display text-2xl font-semibold">
                    {L(cl.title)}
                  </h2>
                  <p className="text-ink-soft">{L(cl.subtitle)}</p>
                </div>
                <span className="tabular text-sm font-semibold text-ink-soft">
                  {done}/{lessons.length}
                </span>
              </div>
              <Stagger as="ol" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {lessons.map((l) => {
                  const status = lessonStatus(l, completed, level)
                  const n = LESSONS.indexOf(l) + 1
                  return (
                    <li key={l.id}>
                      <Link
                        to={`/learn/${l.id}`}
                        className={cn(
                          'group flex h-full items-start gap-4 rounded-[var(--radius-card)] border bg-surface p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift',
                          status === 'next' ? 'border-moss ring-2 ring-moss/30' : 'border-line/70',
                          status === 'ahead' && 'opacity-70',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-lg font-semibold',
                            status === 'done' ? 'bg-good-soft text-good' : status === 'next' ? 'bg-moss text-on-moss' : 'bg-surface-2 text-ink-soft',
                          )}
                        >
                          {status === 'done' ? <Icon name="check" size={20} /> : n}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{L(l.title)}</span>
                          <span className="mt-0.5 block text-sm text-ink-soft">{L(l.description)}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Chip>
                              <Icon name="timer" size={12} /> {l.duration} {t('common.min')}
                            </Chip>
                            {l.notes.map((note) => (
                              <Chip key={note} tone="moss">
                                {note}
                              </Chip>
                            ))}
                            {l.melody && (
                              <Chip tone="brass">
                                <Icon name="music" size={12} /> {t('learn.tune')}
                              </Chip>
                            )}
                            {status === 'next' && <Chip tone="moss">{t('learn.upNext')}</Chip>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </Stagger>
            </section>
          )
        })}
      </div>
    </div>
  )
}
