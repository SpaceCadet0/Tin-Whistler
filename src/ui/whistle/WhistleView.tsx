import { useId, type KeyboardEvent } from 'react'
import { useT } from '../../i18n'
import type { Fingering, HoleState } from '../../music/types'
import { AnimatePresence, motion } from '../motion'
import { WHISTLE_H, WHISTLE_W } from './dimensions'

export const FINGER_KEYS = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'] as const

interface WhistleViewProps {
  fingering: Fingering
  /** Fingering of the next note, drawn as small ghost markers. */
  next?: Fingering
  /** Previous fingering: holes that changed since then are highlighted (what to move). */
  from?: Fingering
  /** Goal fingering: holes that still differ from it are highlighted (hint mode). */
  target?: Fingering
  interactive?: boolean
  onToggle?: (hole: number) => void
  /** Hole (0-based) carrying an ornament ring. */
  ornamentHole?: number
  height?: number
  showHands?: boolean
  className?: string
  label?: string
}

const HOLE_Y = [0.3, 0.385, 0.47, 0.6, 0.685, 0.77]

/**
 * The instrument, front view. Covered holes show a finger pad, open holes show the dark bore,
 * half-holes are half covered, states are distinguishable by shape, not just colour.
 */
export function WhistleView({
  fingering,
  next,
  from,
  target,
  interactive,
  onToggle,
  ornamentHole,
  height = 460,
  showHands = true,
  className,
  label,
}: WhistleViewProps) {
  const { t } = useT()
  const uid = useId().replace(/:/g, '')
  const W = WHISTLE_W
  const H = WHISTLE_H
  const cx = 70
  const r = 19
  const handle = (i: number) => interactive && onToggle?.(i)
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handle(i)
    }
  }
  const stateName = (h: HoleState) => (h === 1 ? t('whistle.covered') : h === 0.5 ? t('whistle.half') : t('whistle.open'))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      height={height}
      className={className}
      role="group"
      aria-label={label ?? t('whistle.label')}
      style={{ maxWidth: '100%', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`metal-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--c-metal-2)" />
          <stop offset="0.35" stopColor="var(--c-metal)" />
          <stop offset="0.6" stopColor="#f3e6c3" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--c-metal-2)" />
        </linearGradient>
        <linearGradient id={`head-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#123826" />
          <stop offset="0.5" stopColor="#1f5a41" />
          <stop offset="1" stopColor="#123826" />
        </linearGradient>
        <clipPath id={`half-${uid}`}>
          <rect x="-40" y="-40" width="40" height="80" />
        </clipPath>
      </defs>

      {/* body */}
      <rect x={cx - 26} y={96} width={52} height={494} rx={10} fill={`url(#metal-${uid})`} />
      {/* fipple head */}
      <path d={`M${cx - 28} 110 L${cx - 28} 22 Q${cx - 28} 6 ${cx - 12} 6 L${cx + 12} 6 Q${cx + 28} 6 ${cx + 28} 22 L${cx + 28} 110 Z`} fill={`url(#head-${uid})`} />
      <rect x={cx - 12} y={70} width={24} height={14} rx={2} fill="#0b1f15" />
      <path d={`M${cx - 12} 84 L${cx + 12} 84 L${cx} 76 Z`} fill="#2d7454" />
      <text x={cx} y={46} textAnchor="middle" fontSize="11" fill="#d7ead9" fontFamily="var(--font-sans)" fontWeight="600" letterSpacing="1">
        D
      </text>

      {showHands && (
        <>
          <text x={8} y={H * 0.385 + 4} fontSize="12" fill="var(--c-ink-soft)" fontWeight="600" transform={`rotate(-90 8 ${H * 0.385})`} textAnchor="middle">
            {t('whistle.leftHand')}
          </text>
          <text x={8} y={H * 0.685 + 4} fontSize="12" fill="var(--c-ink-soft)" fontWeight="600" transform={`rotate(-90 8 ${H * 0.685})`} textAnchor="middle">
            {t('whistle.rightHand')}
          </text>
        </>
      )}

      {HOLE_Y.map((fy, i) => {
        const y = fy * H
        const h = fingering[i]
        const origin = target ? h : from?.[i]
        const goal = target ? target[i] : h
        const changed = origin != null && origin !== goal
        const nextState = next?.[i]
        const labelText = `${t('whistle.hole', { n: i + 1 })} (${FINGER_KEYS[i]}): ${stateName(h)}`
        return (
          <g
            key={i}
            transform={`translate(${cx} ${y})`}
            role={interactive ? 'button' : 'img'}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? h === 1 : undefined}
            aria-label={labelText}
            onClick={() => handle(i)}
            onKeyDown={(e) => onKey(e, i)}
            style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
            className="group"
          >
            {interactive && <circle r={r + 12} fill="transparent" />}
            {/* bore */}
            <circle r={r - 5} fill="var(--c-hole)" />
            <circle r={r - 5} fill="none" stroke="var(--c-hole)" strokeOpacity="0.5" strokeWidth="2" />
            {/* finger pad */}
            <AnimatePresence initial={false}>
              {h > 0 && (
                <motion.g
                  key={h}
                  clipPath={h === 0.5 ? `url(#half-${uid})` : undefined}
                  initial={{ scale: 1.35, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.3, opacity: 0, transition: { duration: 0.14 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                >
                  <circle r={r} fill="var(--c-moss)" />
                  <circle r={r} fill="none" stroke="var(--c-moss-strong)" strokeWidth="2" />
                  <ellipse rx={r * 0.55} ry={r * 0.35} cy={-r * 0.25} fill="#fff" opacity="0.14" />
                </motion.g>
              )}
            </AnimatePresence>
            {h === 0.5 && <line x1={0} y1={-r} x2={0} y2={r} stroke="var(--c-moss-strong)" strokeWidth="2" />}
            {changed && (
              <motion.circle
                r={r + 7}
                fill="none"
                stroke="var(--c-brass)"
                strokeWidth="3"
                strokeDasharray="5 4"
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            )}
            {ornamentHole === i && <circle r={r + 6} fill="none" stroke="var(--c-bad)" strokeWidth="3" />}
            {interactive && <circle r={r + 5} fill="none" stroke="var(--c-brass)" strokeWidth="3" className="opacity-0 group-focus-visible:opacity-100" />}
            {nextState != null && nextState !== h && (
              <circle cx={r + 18} r={6} fill={nextState ? 'var(--c-ink-faint)' : 'none'} stroke="var(--c-ink-faint)" strokeWidth="2" />
            )}
            <text x={-r - 14} y={5} fontSize="12" textAnchor="end" fill="var(--c-ink-faint)" fontWeight="600">
              {FINGER_KEYS[i]}
            </text>
            {changed && (
              <text x={r + 14} y={-r + 2} fontSize="13" fill="var(--c-brass)" fontWeight="700">
                {goal ? t('whistle.coverShort') : t('whistle.liftShort')}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
