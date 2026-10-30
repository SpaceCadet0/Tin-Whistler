import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { whistleSynth } from '../audio/WhistleSynth'
import { ACHIEVEMENTS, type Achievement } from '../engine/progress/achievements'
import { useT } from '../i18n'
import { isQuietRoute, useCelebrations } from '../state/celebrations'
import { useProgress } from '../state/progress'
import { Icon } from '../ui/Icon'
import { AnimatePresence, EASE_OUT, motion } from '../ui/motion'

/** D F# A D' on the whistle: the unlock's little fanfare. */
const FANFARE = [
  { midi: 74, duration: 0.12 },
  { midi: 78, duration: 0.12 },
  { midi: 81, duration: 0.12 },
  { midi: 86, duration: 0.9 },
]
const FANFARE_DELAY = 200
/** A tap right away is the tap that was meant for the screen underneath: ignore it. */
const ARM_DELAY = 700
const SPRINGY = [0.34, 1.56, 0.64, 1] as const

const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'

/** The Progress tab on screen (bottom bar on phones, sidebar on wide screens), where the medal flies. */
function progressTab(): DOMRect | null {
  const tab = [...document.querySelectorAll<HTMLElement>('[data-nav="progress"]')].find((el) => el.getClientRects().length > 0)
  return tab?.getBoundingClientRect() ?? null
}

/** Twelve short hand-drawn strokes around the medal, every other one longer. */
const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + (i % 2 ? 0.12 : 0)
  const r0 = 100 + (i % 3) * 6
  const r1 = r0 + (i % 2 ? 22 : 34)
  return { x1: 166 + Math.cos(a) * r0, y1: 166 + Math.sin(a) * r0, x2: 166 + Math.cos(a) * r1, y2: 166 + Math.sin(a) * r1 }
})

/** Four-pointed sparks, like the ones beside the diamond: x, y, size. */
const SPARKS = [
  [60, 70, 9],
  [282, 96, 7],
  [268, 262, 10],
  [52, 238, 6],
  [176, 22, 6],
] as const

const sparkPath = (x: number, y: number, s: number) => {
  const k = s * 0.18
  return `M${x} ${y - s}Q${x + k} ${y - k} ${x + s} ${y}Q${x + k} ${y + k} ${x} ${y + s}Q${x - k} ${y + k} ${x - s} ${y}Q${x - k} ${y - k} ${x} ${y - s}Z`
}

/**
 * A new achievement, celebrated: the screen dims, a brass medal springs in with a burst and the
 * whistle plays a short fanfare. On "Great" the medal flies into the Progress tab. Several wait their
 * turn, and none interrupts playing (see isQuietRoute).
 */
export function AchievementCelebration() {
  const { pathname } = useLocation()
  const queue = useCelebrations((s) => s.queue)
  const shift = useCelebrations((s) => s.shift)
  const unlocked = useProgress((s) => Object.keys(s.achievements).length)
  const quiet = isQuietRoute(pathname)
  const current = quiet ? undefined : ACHIEVEMENTS.find((a) => a.id === queue[0])

  // an id that is no longer in the list (renamed in an update) must not block the rest
  useEffect(() => {
    if (queue.length && !ACHIEVEMENTS.some((a) => a.id === queue[0])) shift()
  }, [queue, shift])

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key="veil"
          className="fixed inset-0 z-[60] grid place-items-center bg-bg/75 px-7 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.24 } }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
        >
          <Unlock
            key={current.id}
            achievement={current}
            // the ones still waiting after this one are not counted yet
            count={Math.max(1, unlocked - queue.length + 1)}
            waiting={queue.length}
            onDone={shift}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface UnlockProps {
  achievement: Achievement
  /** Achievements unlocked so far, this one included. */
  count: number
  /** This one and the ones queued after it. */
  waiting: number
  onDone: () => void
}

function Unlock({ achievement: a, count, waiting, onDone }: UnlockProps) {
  const { t, L } = useT()
  const disc = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [flight, setFlight] = useState<{ from: DOMRect; to: DOMRect } | null>(null)

  useEffect(() => {
    const fanfare = window.setTimeout(() => whistleSynth.playSequence(FANFARE), FANFARE_DELAY)
    const arm = window.setTimeout(() => setArmed(true), ARM_DELAY)
    return () => {
      window.clearTimeout(fanfare)
      window.clearTimeout(arm)
    }
  }, [])

  const dismiss = () => {
    if (flight) return
    const from = disc.current?.getBoundingClientRect()
    const to = progressTab()
    if (!from || !to || reducedMotion()) onDone()
    else setFlight({ from, to })
  }

  useEffect(() => {
    if (!armed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rise = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: 0.48 + i * 0.08, ease: EASE_OUT },
  })

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
        aria-describedby="unlock-body"
        className="grid justify-items-center text-center"
        style={{ visibility: flight ? 'hidden' : 'visible' }}
        onClick={() => armed && dismiss()}
      >
        <div className="relative grid h-38 w-38 place-items-center">
          <motion.div
            aria-hidden="true"
            className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--c-brass)_35%,transparent),transparent_62%)]"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.1, 1], opacity: [0, 1, 0.55] }}
            transition={{ duration: 1.4, delay: 0.15, times: [0, 0.4, 1], ease: EASE_OUT }}
          />
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 332 332"
            className="pointer-events-none absolute -inset-[90px] h-[calc(100%+180px)] w-[calc(100%+180px)] overflow-visible text-brass"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: [0.55, 1, 1.18], opacity: [0, 1, 0] }}
            transition={{ duration: 0.95, delay: 0.28, times: [0, 0.35, 1], ease: EASE_OUT }}
          >
            {RAYS.map((r, i) => (
              <line key={i} {...r} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
            ))}
          </motion.svg>
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-brass"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 0.9, delay: 0.26, ease: EASE_OUT }}
          />
          <motion.div
            ref={disc}
            className="absolute inset-0 rounded-full border-[3px] border-brass bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklab,var(--c-brass)_30%,var(--c-brass-soft)),var(--c-brass-soft)_70%)] shadow-[0_0_0_8px_color-mix(in_oklab,var(--c-brass)_14%,transparent),0_18px_40px_-14px_color-mix(in_oklab,var(--c-brass)_70%,transparent)]"
            initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: SPRINGY }}
          />
          <motion.span
            className="relative text-brass"
            initial={{ scale: 0.4, rotate: 18, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.17, ease: SPRINGY }}
          >
            <Icon name={a.icon} size={84} />
          </motion.span>
          <svg aria-hidden="true" viewBox="0 0 332 332" className="pointer-events-none absolute -inset-[90px] h-[calc(100%+180px)] w-[calc(100%+180px)] overflow-visible text-brass">
            {SPARKS.map(([x, y, s], i) => (
              <motion.path
                key={i}
                d={sparkPath(x, y, s)}
                fill="currentColor"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 0.8], opacity: [0, 1, 0.7] }}
                transition={{ duration: 0.9, delay: 0.42 + i * 0.09, times: [0, 0.3, 1], ease: EASE_OUT }}
              />
            ))}
          </svg>
        </div>

        <motion.p {...rise(0)} className="mt-8 text-xs font-bold tracking-[0.14em] text-brass uppercase">
          {t('achievement.new')}
        </motion.p>
        <motion.h2 {...rise(1)} id="unlock-title" className="mt-1.5 font-display text-3xl leading-tight font-semibold">
          {L(a.title)}
        </motion.h2>
        <motion.p {...rise(2)} id="unlock-body" className="mt-2 max-w-xs text-ink-soft">
          {L(a.description)}
        </motion.p>
        <motion.p {...rise(3)} className="mt-3.5 text-sm text-ink-soft tabular">
          {t('achievement.count', { n: count, total: ACHIEVEMENTS.length })}
        </motion.p>
        {waiting > 1 && (
          <motion.div {...rise(4)} className="mt-3.5 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: waiting }, (_, i) => (
              <i key={i} className={i === 0 ? 'h-1.5 w-1.5 rounded-full bg-brass' : 'h-1.5 w-1.5 rounded-full bg-ink-faint/50'} />
            ))}
          </motion.div>
        )}
        <motion.button
          {...rise(5)}
          type="button"
          autoFocus
          className="mt-6 min-w-44 rounded-2xl bg-moss px-6 py-3.5 font-semibold text-on-moss shadow-soft"
          onClick={(e) => {
            e.stopPropagation()
            dismiss()
          }}
        >
          {waiting > 1 ? t('achievement.next') : t('achievement.ok')}
        </motion.button>
      </div>

      {flight && <Flyer icon={a.icon} from={flight.from} to={flight.to} onDone={onDone} />}
    </>
  )
}

const FLYER = 64

/** The medal, small, on its way into the Progress tab: an arc from the stage down to the tab. */
function Flyer({ icon, from, to, onDone }: { icon: string; from: DOMRect; to: DOMRect; onDone: () => void }) {
  const x0 = from.left + from.width / 2 - FLYER / 2
  const y0 = from.top + from.height / 2 - FLYER / 2
  const x1 = to.left + to.width / 2 - FLYER / 2
  const y1 = to.top + to.height / 2 - FLYER / 2
  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 z-[70] grid place-items-center rounded-full border-2 border-brass bg-brass-soft text-brass"
      style={{ width: FLYER, height: FLYER }}
      initial={{ x: x0, y: y0, scale: from.width / FLYER }}
      animate={{ x: [x0, (x0 + x1) / 2 + 40, x1], y: [y0, (y0 + y1) / 2 - 30, y1], scale: [from.width / FLYER, 1.2, 0.35] }}
      transition={{ duration: 0.62, ease: [0.5, 0, 0.2, 1] }}
      onAnimationComplete={onDone}
    >
      <Icon name={icon} size={36} />
    </motion.div>
  )
}
