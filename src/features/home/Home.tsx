import { Link } from 'react-router-dom'
import { BUILTIN_TUNES } from '../../data/tunes'
import { COURSE_LEVELS } from '../../data/lessons/course'
import { smartSuggestion } from '../../engine/adaptive/smartPractice'
import { courseProgress, nextLesson } from '../../engine/lesson/course'
import { computeStreak, levelFromXp } from '../../engine/progress/levels'
import { useT } from '../../i18n'
import { todayKey } from '../../lib/storage'
import { MASTERED_NOTE, useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { useAllTunes } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { ButtonLink, Card, Difficulty, ProgressBar, ProgressRing, Stat } from '../../ui/primitives'
import { AnimatedNumber, Stagger } from '../../ui/motion'

export default function Home() {
  const { t, L } = useT()
  const level = useSettings((s) => s.level)
  const goal = useSettings((s) => s.dailyGoalMin)
  const p = useProgress()
  const tunes = useAllTunes()
  const lesson = nextLesson(p.completedLessons, level)
  const course = courseProgress(p.completedLessons)
  const xp = levelFromXp(p.xp)
  const activeDays = new Set(Object.keys(p.days).filter((d) => p.days[d].seconds > 0 || p.days[d].xp > 0))
  const streak = computeStreak(activeDays)
  const today = p.days[todayKey()]
  const todayMin = Math.round((today?.seconds ?? 0) / 60)
  const notesLearned = Object.values(p.noteStats).filter((n) => n.mastery >= MASTERED_NOTE && n.hits >= 5).length
  const tunesLearned = Object.values(p.tunes).filter((x) => x.completedFull > 0).length
  const suggestion = smartSuggestion(p.noteStats, p.transitions)
  const courseLevel = COURSE_LEVELS.find((c) => c.id === lesson?.level)
  const recent = Object.entries(p.tunes)
    .sort((a, b) => b[1].lastPlayed - a[1].lastPlayed)
    .map(([id]) => tunes.find((x) => x.id === id))
    .filter(Boolean)
    .slice(0, 3)
  const featured = recent.length ? recent : BUILTIN_TUNES.slice(0, 3)
  const hour = new Date().getHours()
  const greeting = t(hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-ink-soft">
            <Icon name="clover" size={16} className="text-brass" />
            {greeting}
          </p>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">{t('home.title')}</h1>
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-surface px-4 py-3 shadow-soft">
          <ProgressRing value={Math.min(1, todayMin / goal)} size={52} stroke={5} label={t('home.goalAria', { n: todayMin, goal })}>
            <Icon name="timer" size={18} />
          </ProgressRing>
          <div>
            <p className="tabular font-semibold">
              {todayMin} / {goal} {t('common.min')}
            </p>
            <p className="text-sm text-ink-soft">{t('home.todayGoal')}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* current lesson */}
        <Card className="relative overflow-hidden bg-moss p-6 text-on-moss sm:p-8">
          <svg className="pointer-events-none absolute -right-10 -bottom-12 h-64 w-64 opacity-[0.08]" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 5 C 80 5 95 30 95 50 S 75 95 50 95 S 5 75 5 50 S 25 20 50 20 S 80 40 80 55 S 65 80 50 80 S 20 65 20 50" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          <p className="text-sm font-semibold tracking-wide uppercase opacity-80">
            {lesson ? `${t('home.level', { n: lesson.level })} · ${L(courseLevel?.title)}` : t('home.courseDone')}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{lesson ? L(lesson.title) : t('home.allLessons')}</h2>
          {lesson && <p className="mt-2 max-w-md text-lg opacity-85">{L(lesson.description)}</p>}
          <div className="mt-6 max-w-sm">
            <div className="mb-1.5 flex justify-between text-sm opacity-85">
              <span>{t('home.course')}</span>
              <span className="tabular">
                {course.done}/{course.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label={t('home.course')} aria-valuenow={Math.round(course.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-white" style={{ width: `${course.fraction * 100}%` }} />
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink to={lesson ? `/learn/${lesson.id}` : '/tunes'} size="lg" variant="secondary" icon="play" className="flex-1 border-0 bg-surface whitespace-nowrap text-moss sm:flex-none">
              {t('home.continue')}
            </ButtonLink>
            <ButtonLink to="/daily" size="lg" variant="ghost" icon="calendar" className="flex-1 border border-on-moss/30 whitespace-nowrap text-on-moss hover:bg-white/10 hover:text-on-moss sm:flex-none">
              {t('home.practiceToday')}
            </ButtonLink>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="grid grid-cols-2 gap-5">
            <Stat icon="flame" tone="brass" value={<AnimatedNumber value={streak} />} label={t('home.streak')} />
            <Stat icon="star" value={<AnimatedNumber value={xp.level} />} label={t('progress.level')} />
            <Stat icon="hand" value={<AnimatedNumber value={notesLearned} />} label={t('home.notesLearned')} />
            <Stat icon="music" value={<AnimatedNumber value={tunesLearned} />} label={t('home.tunesLearned')} />
            <div className="col-span-2">
              <ProgressBar value={xp.progress} tone="brass" label={t('progress.xpToNext')} />
              <p className="mt-1.5 text-xs text-ink-soft">{t('progress.xpLine', { xp: p.xp, next: xp.next })}</p>
            </div>
          </Card>
          <Link
            to="/practice/notes"
            className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line/70 bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brass-soft text-brass">
              <Icon name="fast" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{t('home.quickTrainer')}</span>
              <span className="text-sm text-ink-soft">{t('home.quickTrainerBody')}</span>
            </span>
            <Icon name="next" className="text-ink-faint transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {suggestion && (
        <Card className="flex flex-wrap items-center gap-4 border-brass/40 bg-brass-soft/40">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brass text-white">
            <Icon name="wand" />
          </span>
          <div className="min-w-0 flex-1 basis-52">
            <p className="font-semibold">{t('smart.title')}</p>
            <p className="text-ink-soft">
              {suggestion.kind === 'note'
                ? t('smart.note', { note: suggestion.note })
                : t('smart.transition', { from: suggestion.from, to: suggestion.to })}
            </p>
          </div>
          <ButtonLink
            to={suggestion.kind === 'note' ? `/practice/notes?focus=${encodeURIComponent(suggestion.note)}&seconds=60` : `/practice/sequence?notes=${encodeURIComponent(`${suggestion.from},${suggestion.to},${suggestion.from},${suggestion.to}`)}`}
            variant="brass"
            iconRight="next"
          >
            {t('smart.go')}
          </ButtonLink>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold">{recent.length ? t('home.yourTunes') : t('home.startTunes')}</h2>
          <Link to="/tunes" className="-my-2 py-2 text-sm font-semibold text-moss hover:underline">
            {t('home.allTunes')}
          </Link>
        </div>
        <Stagger as="div" className="grid gap-4 sm:grid-cols-3">
          {featured.map((tune) => {
            const tp = p.tunes[tune!.id]
            return (
              <Link key={tune!.id} to={`/tunes/${tune!.id}`} className="group rounded-[var(--radius-card)] border border-line/70 bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-moss-soft text-moss">
                    <Icon name="music" size={20} />
                  </span>
                  <Difficulty value={tune!.difficulty} label={t('tune.difficulty')} />
                </div>
                <p className="font-display text-xl font-semibold">{tune!.title}</p>
                <p className="text-sm text-ink-soft">{t(`tuneType.${tune!.type}`)}</p>
                <ProgressBar value={(tp?.step ?? 0) / 7} className="mt-4" label={t('tune.learning')} height={6} />
              </Link>
            )
          })}
        </Stagger>
      </section>
    </div>
  )
}
