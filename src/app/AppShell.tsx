import { useEffect, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { computeStreak, levelFromXp } from '../engine/progress/levels'
import { useT, type MessageKey } from '../i18n'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { Icon } from '../ui/Icon'
import { AppLogo } from '../ui/AppLogo'
import { motion, PageEnter } from '../ui/motion'
import { cn } from '../ui/primitives'
import { ErrorBoundary, ScreenError } from './ErrorBoundary'
import { Toaster } from './Toaster'

const NAV: { to: string; icon: string; label: MessageKey }[] = [
  { to: '/', icon: 'home', label: 'nav.home' },
  { to: '/learn', icon: 'book', label: 'nav.learn' },
  { to: '/practice', icon: 'target', label: 'nav.practice' },
  { to: '/tunes', icon: 'music', label: 'nav.tunes' },
  { to: '/progress', icon: 'chart', label: 'nav.progress' },
]

/** Routes that take the whole screen on phones (the player needs every pixel). */
const IMMERSIVE = [/^\/learn\/.+/, /^\/tunes\/[^/]+\/play/, /^\/practice\/game/, /^\/daily/, /^\/welcome/]

function useApplyPreferences() {
  const { theme, motion, language } = useSettings(useShallow((s) => ({ theme: s.theme, motion: s.motion, language: s.language })))
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => (root.dataset.theme = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => (root.dataset.motion = motion === 'system' ? (mq.matches ? 'reduce' : 'full') : motion)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [motion])
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
}

function StatusPills() {
  const { t } = useT()
  const xp = useProgress((s) => s.xp)
  const days = useProgress((s) => s.days)
  const streak = computeStreak(new Set(Object.keys(days).filter((d) => days[d].seconds > 0 || days[d].xp > 0)))
  const { level } = levelFromXp(xp)
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brass-soft px-3 py-1.5 text-sm font-bold text-brass" title={t('home.streak')}>
        <Icon name="flame" size={16} filled />
        <span className="tabular">{streak}</span>
        <span className="sr-only">{t('home.streak')}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-moss-soft px-3 py-1.5 text-sm font-bold text-moss" title={t('progress.level')}>
        <Icon name="star" size={16} filled />
        <span className="tabular">{t('progress.levelShort', { n: level })}</span>
      </span>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  useApplyPreferences()
  const { t } = useT()
  const { pathname } = useLocation()
  const immersive = IMMERSIVE.some((r) => r.test(pathname))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:p-3">
        {t('a11y.skip')}
      </a>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line/70 px-4 py-6 lg:flex" aria-label={t('nav.label')}>
        <NavLink to="/" className="mb-8 flex items-center gap-3 px-3">
          <AppLogo size={40} className="shrink-0" />
          <span className="font-display text-xl font-semibold">Tin Whistler</span>
        </NavLink>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition-colors',
                  isActive ? 'text-on-moss' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-pill-side" className="absolute inset-0 rounded-2xl bg-moss shadow-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative flex items-center gap-3">
                    <Icon name={n.icon} />
                    {t(n.label)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-2">
          <StatusPills />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn('flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold', isActive ? 'bg-surface-2 text-ink' : 'text-ink-soft hover:bg-surface-2')
            }
          >
            <Icon name="settings" size={20} />
            {t('nav.settings')}
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        {!immersive && (
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line/60 bg-bg/85 pt-[calc(0.625rem+var(--safe-top))] pr-[max(1rem,var(--safe-right))] pb-2.5 pl-[max(1rem,var(--safe-left))] backdrop-blur lg:hidden">
            <NavLink to="/" className="flex items-center gap-2">
              <AppLogo size={32} className="shrink-0" />
              <span className="font-display text-lg font-semibold">Tin Whistler</span>
            </NavLink>
            <div className="flex items-center gap-1">
              <StatusPills />
              <NavLink to="/settings" aria-label={t('nav.settings')} className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft">
                <Icon name="settings" size={20} />
              </NavLink>
            </div>
          </header>
        )}

        <main id="main" className={cn(
            'mx-auto w-full max-w-6xl flex-1 pr-[max(1rem,var(--safe-right))] pl-[max(1rem,var(--safe-left))] sm:pr-[max(1.5rem,var(--safe-right))] sm:pl-[max(1.5rem,var(--safe-left))] lg:px-10 lg:pt-10',
            immersive ? 'pt-[calc(0.5rem+var(--safe-top))] pb-[calc(0.75rem+var(--safe-bottom))] lg:pb-8' : 'pt-6 pb-28 lg:pb-12',
          )}>
          <ErrorBoundary key={pathname} fallback={(reset) => <ScreenError onRetry={reset} />}>
            <PageEnter id={pathname}>{children}</PageEnter>
          </ErrorBoundary>
        </main>
      </div>

      {/* mobile bottom navigation */}
      {!immersive && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface/95 pr-[var(--safe-right)] pb-[var(--safe-bottom)] pl-[var(--safe-left)] backdrop-blur lg:hidden"
          aria-label={t('nav.label')}
        >
          <ul className="grid grid-cols-5">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    cn('flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold', isActive ? 'text-moss' : 'text-ink-faint')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative grid h-8 w-12 place-items-center">
                        {isActive && <motion.span layoutId="nav-pill-bottom" className="absolute inset-0 rounded-full bg-moss-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                        <Icon name={n.icon} size={21} className="relative" filled={isActive} />
                      </span>
                      {t(n.label)}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Toaster />
    </div>
  )
}
