import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { micInput } from '../../audio/MicInput'
import { whistleSynth } from '../../audio/WhistleSynth'
import type { Illustration as IllKind } from '../../engine/lesson/types'
import { useT, type MessageKey } from '../../i18n'
import { useSession } from '../../state/session'
import { useSettings, type PlayerLevel } from '../../state/settings'
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
        'flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-left transition',
        selected ? 'border-moss bg-moss-soft' : 'border-line bg-surface hover:border-ink-faint',
      )}
    >
      <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', selected ? 'bg-moss text-on-moss' : 'bg-surface-2 text-ink-soft')}>
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
  const settings = useSettings()
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

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col">
      <div className="mb-8 flex items-center gap-3">
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
          ]}
        />
      </div>

      <motion.div key={step} className="flex flex-1 flex-col" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.38, ease: EASE_OUT }}>
        {step === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="flex items-end gap-6">
              <WhistleView fingering={[1, 1, 1, 0, 0, 0]} height={300} showHands={false} />
            </div>
            <h1 className="font-display text-5xl leading-tight font-semibold text-balance">{t('onb.welcome.title')}</h1>
            <p className="max-w-md text-xl text-ink-soft">{t('onb.welcome.body')}</p>
            <Button size="xl" iconRight="next" onClick={() => setStep(1)} autoFocus>
              {t('onb.start')}
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-1 flex-col items-center gap-6 text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-brass uppercase">{t('onb.meet', { n: intro + 1, of: INTRO.length })}</p>
            <div className="grid min-h-60 place-items-center">
              {INTRO[intro].ill === 'whistle' ? (
                <button type="button" onClick={() => whistleSynth.playNote(81, 1)} aria-label={t('onb.tapToHear')}>
                  <WhistleView fingering={[1, 1, 0, 0, 0, 0]} height={240} showHands={false} />
                </button>
              ) : (
                <Illustration kind={INTRO[intro].ill as IllKind} />
              )}
            </div>
            <h2 className="font-display text-3xl font-semibold">{t(INTRO[intro].title)}</h2>
            <p className="max-w-md text-lg leading-relaxed text-ink-soft">{t(INTRO[intro].body)}</p>
            <div className="mt-auto flex w-full items-center justify-between gap-3 pt-6">
              <Button variant="ghost" onClick={() => setStep(2)}>
                {t('onb.skipIntro')}
              </Button>
              <Button size="lg" iconRight="next" onClick={() => (intro < INTRO.length - 1 ? setIntro((i) => i + 1) : setStep(2))} autoFocus>
                {t('ex.next')}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col gap-6">
            <h2 className="font-display text-4xl font-semibold">{t('onb.level.title')}</h2>
            <div role="radiogroup" aria-label={t('onb.level.title')} className="flex flex-col gap-3">
              {LEVELS.map((l) => (
                <Choice key={l.value} selected={level === l.value} onClick={() => setLevel(l.value)} icon={l.icon} title={t(l.title)} body={t(l.body)} />
              ))}
            </div>
            <Button size="lg" className="mt-auto" iconRight="next" onClick={() => setStep(3)}>
              {t('ex.continue')}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-1 flex-col gap-6">
            <h2 className="font-display text-4xl font-semibold">{t('onb.goal.title')}</h2>
            <p className="-mt-3 text-lg text-ink-soft">{t('onb.goal.body')}</p>
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
            <Button size="lg" className="mt-auto" iconRight="next" onClick={() => setStep(4)}>
              {t('ex.continue')}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-1 flex-col items-center gap-6 text-center">
            <span className="grid h-24 w-24 place-items-center rounded-[2rem] bg-moss-soft text-moss">
              <Icon name="mic" size={44} />
            </span>
            <h2 className="font-display text-4xl font-semibold">{t('onb.mic.title')}</h2>
            <p className="max-w-md text-lg leading-relaxed text-ink-soft">{t('onb.mic.body')}</p>
            <ul className="flex max-w-md flex-col gap-2 text-left">
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
            <div className="mt-auto flex w-full flex-col gap-3 pt-6">
              <Button size="xl" iconRight="next" onClick={() => finish(level === 'beginner' ? '/learn/l01-first-note' : '/')}>
                {level === 'beginner' ? t('onb.firstLesson') : t('onb.toHome')}
              </Button>
              <Button variant="ghost" onClick={() => finish('/tunes')}>
                {t('onb.skipToTunes')}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
