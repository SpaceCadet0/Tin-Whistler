import { animate, motion, MotionConfig, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from 'motion/react'
import { Children, isValidElement, useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { useSettings } from '../state/settings'

/**
 * Motion vocabulary for the app. Every animation here answers one of: "where did I go"
 * (page / step transitions), "what changed" (note, score, finger), "did it work" (celebrate,
 * toast). Nothing loops forever. All of it collapses to instant under reduced motion.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const
export const SPRING_SOFT = { type: 'spring', stiffness: 170, damping: 22 } as const

/** Honour the in-app "Animations" setting on top of the OS preference. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pref = useSettings((s) => s.motion)
  return <MotionConfig reducedMotion={pref === 'reduce' ? 'always' : pref === 'full' ? 'never' : 'user'}>{children}</MotionConfig>
}

/** Gentle rise-in used when a page mounts. */
export function PageEnter({ children, id }: { children: ReactNode; id: string }) {
  return (
    <motion.div key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }}>
      {children}
    </motion.div>
  )
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

/**
 * Cards appear in sequence the first time a grid scrolls into view. Direct children are animated
 * automatically; <li> children stay list items so list semantics are kept.
 */
export function Stagger({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'ol' | 'ul' }) {
  const Cmp = as === 'ol' ? motion.ol : as === 'ul' ? motion.ul : motion.div
  return (
    <Cmp className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
      {Children.map(children, (child) => {
        if (isValidElement(child) && child.type === 'li') {
          const el = child as ReactElement<React.LiHTMLAttributes<HTMLLIElement>>
          const { children: inner, ...rest } = el.props
          return (
            <motion.li {...(rest as object)} variants={item}>
              {inner}
            </motion.li>
          )
        }
        return (
          <motion.div className="grid min-w-0 grid-cols-1" variants={item}>
            {child}
          </motion.div>
        )
      })}
    </Cmp>
  )
}

/** Horizontal slide between steps (lessons, onboarding, daily blocks). Use inside <AnimatePresence mode="wait">. */
export function StepSlide({ children, id, dir = 1 }: { children: ReactNode; id: string | number; dir?: number }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, x: 28 * dir }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -28 * dir }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

/** Numbers count up to their value when they come into view (scores, XP). */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const text = useTransform(mv, format)
  useEffect(() => {
    if (!inView) return
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.9, ease: EASE_OUT })
    return () => controls.stop()
  }, [inView, value, reduce, mv])
  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  )
}

/** Success mark: the check draws itself inside a circle that springs in. */
export function SuccessMark({ size = 64 }: { size?: number }) {
  return (
    <motion.span
      className="grid place-items-center rounded-full bg-good-soft text-good"
      style={{ width: size, height: size }}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      aria-hidden="true"
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M4 12.5l5 5L20 6.5"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.12, ease: EASE_OUT }}
        />
      </svg>
    </motion.span>
  )
}

export { AnimatePresence, motion } from 'motion/react'
