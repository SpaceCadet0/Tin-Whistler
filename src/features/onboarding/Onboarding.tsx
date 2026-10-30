import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { micInput } from '../../audio/MicInput'
import { whistleSynth } from '../../audio/WhistleSynth'
import type { Illustration as IllKind } from '../../engine/lesson/types'
import { useT, type MessageKey } from '../../i18n'
import { useSession } from '../../state/session'
import { useSettings, type PlayerLevel } from '../../state/settings'
import { useShallow } from 'zustand/react/shallow'
import { Icon } from '../../ui/Icon'
import { EASE_OUT, motion } from '../../ui/motion'
import { Illustration } from '../../ui/Illustration'
import { Button, cn, Segmented } from '../../ui/primitives'
import { WhistleView } from '../../ui/whistle/WhistleView'

const INTRO: { ill: IllKind | 'whistle'; title: MessageKey; body: MessageKey }[] = [
  { ill: 'whistle', title: 'onb.what.title', body: 'onb.what.body' },
  { ill: 'hold', title: 'onb.hold.title', body: 'onb.hold.body' },
  { ill: 'cover', title: 'onb.fingers.title', body: 'onb.fingers.body' },
  { ill: 'breath', title: 'onb.breath.title', body: 'onb.breath.body' },
]

const LEVELS: { value: PlayerLevel; title: MessageKey; body: MessageKey; icon: string }[] = [
  { value: 'beginner', title: 'onb.level.beginner', body: 'onb.level.beginnerBody', icon: 'sparkles' },
  { value: 'some', title: 'onb.level.some', body: 'onb.level.someBody', icon: 'music' },
  { value: 'returning', title: 'onb.level.returning', body: 'onb.level.returningBody', icon: 'repeat' },
]

function Choice({ selected, onClick, icon, title, body }: { selected: boolean; onClick: () => void; icon: string; title: string; body: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 rounded-3xl border-2 p-3.5 text-left transition sm:p-5',
        selected ? 'border-moss bg-moss-soft' : 'border-line bg-surface hover:border-ink-faint',
      )}
    >
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12', selected ? 'bg-moss text-on-moss' : 'bg-surface-2 text-ink-soft')}>
        <Icon name={icon} />
      </span>
      <span className="flex flex-col">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-ink-soft">{body}</span>
      </span>
    </button>
  )
}

export default function Onboarding() {
  const { t } = useT()
  const navigate = useNavigate()
  const settings = useSettings(useShallow((s) => ({ language: s.language, level: s.level, dailyGoalMin: s.dailyGoalMin, set: s.set })))
  const setMicWanted = useSession((s) => s.setMicWanted)
  const [step, setStep] = useState(0)
  const [intro, setIntro] = useState(0)
  const [level, setLevel] = useState<PlayerLevel>(settings.level)
  const [goal, setGoal] = useState(settings.dailyGoalMin)
  const [mic, setMic] = useState<'idle' | 'ok' | 'denied'>('idle')
  const steps = 5

  const finish = (to: string) => {
    settings.set({ onboarded: true, level, dailyGoalMin: goal })
    navigate(to, { replace: true })
  }

  const askMic = async () => {
    const ok = await micInput.requestPermission()
    setMic(ok ? 'ok' : 'denied')
    if (ok) setMicWanted(true)
  }

  // one screen, no page scroll: the page behind is locked while the introduction is open
  useEffect(() => {
    const root = document.documentElement
    const prev = root.style.overflow
    // not while the phone is on its side: there the page has to scroll
    const sideways = window.matchMedia('(orientation: landscape) and (max-height: 520px)')
    const lock = () => {
      root.style.overflow = sideways.matches ? prev : 'hidden'
    }
    lock()
    sideways.addEventListener('change', lock)
    return () => {
      sideways.removeEventListener('change', lock)
      root.style.overflow = prev
    }
  }, [])

  const next = () => (intro < INTRO.length - 1 ? setIntro((i) => i + 1) : setStep(2))
  const toTunes = () => finish('/tunes')

  const body: Record<number, React.ReactNode> = {
    0: (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex min-h-0 w-full flex-1 items-center justify-center short:min-h-52">
          <WhistleView fingering={[1, 1, 1, 0, 0, 0]} height={300} showHands={false} className="h-full max-h-[300px]" />
        </div>
        <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">{t('onb.welcome.title')}</h1>
        <p className="max-w-md text-lg text-ink-soft sm:text-xl">{t('onb.welcome.body')}</p>
      </div>
    ),
    1: (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-brass uppercase">{t('onb.meet', { n: intro + 1, of: INTRO.length })}</p>
        {/* the picture takes whatever height is left, so every card has the same layout */}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center short:min-h-48">
          {INTRO[intro].ill === 'whistle' ? (
            <button type="button" onClick={() => whistleSynth.playNote(81, 1)} aria-label={t('onb.tapToHear')} className="h-full max-h-60">
              <WhistleView fingering={[1, 1, 0, 0, 0, 0]} height={240} showHands={false} className="h-full" />
            </button>
          ) : (
            <Illustration kind={INTRO[intro].ill as IllKind} className="h-full max-h-60" />
          )}
        </div>
        <h2 className="font-display text-3xl font-semibold">{t(INTRO[intro].title)}</h2>
        <p className="min-h-[5.25rem] max-w-md text-lg leading-relaxed text-ink-soft">{t(INTRO[intro].body)}</p>
      </div>
    ),
    2: (
      <div className="flex flex-col gap-4 sm:gap-5">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t('onb.level.title')}</h2>
        <div role="radiogroup" aria-label={t('onb.level.title')} className="flex flex-col gap-3">
          {LEVELS.map((l) => (
            <Choice key={l.value} selected={level === l.value} onClick={() => setLevel(l.value)} icon={l.icon} title={t(l.title)} body={t(l.body)} />
          ))}
        </div>
      </div>
    ),
    3: (
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t('onb.goal.title')}</h2>
          <p className="text-lg text-ink-soft">{t('onb.goal.body')}</p>
        </div>
        <div role="radiogroup" aria-label={t('onb.goal.title')} className="flex flex-col gap-3">
          {[5, 10, 20].map((m) => (
            <Choice
              key={m}
              selected={goal === m}
              onClick={() => setGoal(m)}
              icon="timer"
              title={t('onb.goal.min', { n: m })}
              body={t(m === 5 ? 'onb.goal.casual' : m === 10 ? 'onb.goal.regular' : 'onb.goal.serious')}
            />
          ))}
        </div>
      </div>
    ),
    4: (
      <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-3xl bg-moss-soft text-moss sm:h-24 sm:w-24 sm:rounded-[2rem]">
          <Icon name="mic" size={30} />
        </span>
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t('onb.mic.title')}</h2>
        <p className="max-w-md leading-snug text-ink-soft sm:text-lg sm:leading-relaxed">{t('onb.mic.body')}</p>
        <ul className="flex max-w-md flex-col gap-1.5 text-left text-[15px] sm:gap-2 sm:text-base">
          {(['onb.mic.p1', 'onb.mic.p2', 'onb.mic.p3'] as const).map((k) => (
            <li key={k} className="flex items-start gap-2">
              <Icon name="check" size={20} className="mt-0.5 shrink-0 text-good" />
              {t(k)}
            </li>
          ))}
        </ul>
        {mic === 'idle' && (
          <Button size="lg" icon="mic" onClick={askMic}>
            {t('onb.mic.allow')}
          </Button>
        )}
        {mic === 'ok' && <p className="font-semibold text-good">✓ {t('onb.mic.ok')}</p>}
        {mic === 'denied' && <p className="text-warn">{t('onb.mic.denied')}</p>}
      </div>
    ),
  }

  // the buttons live outside the scrolling middle, so they are always on screen and never move
  const footer: Record<number, React.ReactNode> = {
    0: (
      <div className="flex justify-center">
        <Button size="xl" iconRight="next" onClick={() => setStep(1)} autoFocus className="w-full sm:w-auto">
          {t('onb.start')}
        </Button>
      </div>
    ),
    1: (
      <div className="flex w-full items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep(2)}>
          {t('onb.skipIntro')}
        </Button>
        <Button size="lg" iconRight="next" onClick={next} autoFocus>
          {t('ex.next')}
        </Button>
      </div>
    ),
    2: (
      <Button size="lg" iconRight="next" onClick={() => setStep(3)} className="w-full">
        {t('ex.continue')}
      </Button>
    ),
    3: (
      <Button size="lg" iconRight="next" onClick={() => setStep(4)} className="w-full">
        {t('ex.continue')}
      </Button>
    ),
    4: (
      <div className="flex w-full flex-col gap-2">
        <Button size="xl" iconRight="next" onClick={() => finish(level === 'beginner' ? '/learn/l01-first-note' : '/')}>
          {level === 'beginner' ? t('onb.firstLesson') : t('onb.toHome')}
        </Button>
        <Button variant="ghost" onClick={toTunes}>
          {t('onb.skipToTunes')}
        </Button>
      </div>
    ),
  }

  return (
    // exactly one screen (--page-h: the viewport minus the page's padding and the system bars)
    <div className="mx-auto flex h-[var(--page-h)] max-w-xl flex-col overscroll-none short:h-auto short:min-h-[var(--page-h)]">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} aria-label={t('common.back')} className="grid h-10 w-10 place-items-center rounded-2xl text-ink-soft hover:bg-surface-2">
            <Icon name="back" />
          </button>
        )}
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps} aria-valuenow={step + 1} aria-label={t('onb.progress')}>
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition', i <= step ? 'bg-moss' : 'bg-surface-2')} />
          ))}
        </div>
        <Segmented
          size="sm"
          label={t('settings.language')}
          value={settings.language}
          onChange={(v) => settings.set({ language: v })}
          options={[
            { value: 'en', label: 'EN' },
            { value: 'ru', label: 'RU' },
            {
              value: 'ga',
              label: (
                <span className="inline-flex items-center gap-1">
                  <Icon name="clover" size={16} />
                  GA
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* only the middle fades in; it scrolls by itself only on a very short screen */}
      <motion.div
        key={`${step}:${step === 1 ? intro : 0}`}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto short:overflow-visible"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
        {body[step]}
      </motion.div>
      <div className="shrink-0 pt-4 short:sticky short:bottom-0 short:z-10 short:bg-bg short:pb-[var(--safe-bottom)]">{footer[step]}</div>
    </div>
  )
}
