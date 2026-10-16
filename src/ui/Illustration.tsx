import type { Illustration as Kind } from '../engine/lesson/types'
import { useT } from '../i18n'
import { cn } from './primitives'

const INK = 'var(--c-ink)'
const MOSS = 'var(--c-moss)'
const BRASS = 'var(--c-brass)'
const SOFT = 'var(--c-surface-2)'

function Whistle({ x = 120, y = 30, h = 150, tilt = 0 }: { x?: number; y?: number; h?: number; tilt?: number }) {
  return (
    <g transform={`rotate(${tilt} ${x} ${y + h / 2})`}>
      <rect x={x - 7} y={y + 26} width={14} height={h - 26} rx={4} fill="var(--c-metal)" stroke="var(--c-metal-2)" />
      <rect x={x - 8} y={y} width={16} height={32} rx={5} fill="#1f5a41" />
      {[0.34, 0.44, 0.54, 0.68, 0.78, 0.88].map((f, i) => (
        <circle key={i} cx={x} cy={y + h * f} r={3.2} fill={INK} />
      ))}
    </g>
  )
}

/** "How to hold it": the whistle's tilt, and the pivot it turns around (the middle of the default whistle). */
const HOLD_TILT = -35
const HOLD_PIVOT = { x: 120, y: 105 }
/** Each hand is an ellipse along the whistle, over the three holes it covers (hole rows from Whistle). */
const HAND_L_Y = 96
const HAND_R_Y = 147
const HAND_RX = 14
const HAND_RY = 24
const HAND_LABEL_OFFSET = 34

/** A point turned by `degrees` (SVG's clockwise-positive) around `pivot`. */
function rotateAround(x: number, y: number, degrees: number, pivot: { x: number; y: number }) {
  const a = (degrees * Math.PI) / 180
  const dx = x - pivot.x
  const dy = y - pivot.y
  return { x: pivot.x + dx * Math.cos(a) - dy * Math.sin(a), y: pivot.y + dx * Math.sin(a) + dy * Math.cos(a) }
}

/** Small, calm line illustrations for explanation cards. Decorative: aria-hidden. */
export function Illustration({ kind, className }: { kind: Kind; className?: string }) {
  const { t } = useT()
  return (
    <svg viewBox="0 0 240 200" className={cn('h-44 w-full max-w-xs', className)} aria-hidden="true">
      <rect x="10" y="10" width="220" height="180" rx="28" fill={SOFT} />
      {kind === 'hold' && (
        <>
          {/* the hands are drawn in the whistle's own frame, so they lie along it and cover its holes */}
          <g transform={`rotate(${HOLD_TILT} ${HOLD_PIVOT.x} ${HOLD_PIVOT.y})`}>
            <Whistle />
            <ellipse cx={120} cy={HAND_L_Y} rx={HAND_RX} ry={HAND_RY} fill={MOSS} opacity=".4" />
            <ellipse cx={120} cy={HAND_R_Y} rx={HAND_RX} ry={HAND_RY} fill={BRASS} opacity=".4" />
          </g>
          {/* labels stay upright, placed beside each hand: left hand on the left, right hand on the right */}
          {[
            { letter: 'L', side: -1, y: HAND_L_Y, fill: MOSS },
            { letter: 'R', side: 1, y: HAND_R_Y, fill: BRASS },
          ].map(({ letter, side, y, fill }) => {
            const p = rotateAround(120 + side * HAND_LABEL_OFFSET, y, HOLD_TILT, HOLD_PIVOT)
            return (
              <text key={letter} x={p.x} y={p.y} fontSize="15" fontWeight="700" fill={fill} textAnchor="middle" dominantBaseline="central">
                {letter}
              </text>
            )
          })}
        </>
      )}
      {kind === 'cover' && (
        <>
          <Whistle />
          <circle cx="120" cy="81" r="10" fill={MOSS} opacity=".85" />
          <path d="M150 70 q30 -10 45 5" stroke={INK} strokeWidth="2" fill="none" />
          <text x="150" y="60" fontSize="12" fill={INK}>{t('ill.pad')}</text>
        </>
      )}
      {(kind === 'breath' || kind === 'blow') && (
        <>
          <Whistle x={170} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M40 ${80 + i * 18} q40 -12 80 0 t40 0`} stroke={MOSS} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.9 - i * 0.25} />
          ))}
          <text x="40" y="160" fontSize="13" fontWeight="600" fill={INK}>{t('ill.soft')}</text>
        </>
      )}
      {kind === 'tongue' && (
        <>
          <text x="40" y="95" fontSize="34" fontWeight="700" fill={MOSS} fontFamily="var(--font-display)">to</text>
          <text x="110" y="95" fontSize="34" fontWeight="700" fill={BRASS} fontFamily="var(--font-display)">ru</text>
          <text x="40" y="145" fontSize="14" fill={INK}>t · r · -</text>
        </>
      )}
      {kind === 'overblow' && (
        <>
          <path d="M40 150 q40 -10 60 -40 t60 -70" stroke={MOSS} strokeWidth="4" fill="none" strokeLinecap="round" />
          <text x="172" y="66" fontSize="28" fontWeight="700" fill={BRASS} fontFamily="var(--font-display)">D'</text>
          <text x="40" y="175" fontSize="28" fontWeight="700" fill={INK} fontFamily="var(--font-display)">D</text>
        </>
      )}
      {(kind === 'cut' || kind === 'bounce' || kind === 'slide') && (
        <>
          <line x1="30" y1="110" x2="210" y2="110" stroke="var(--c-line)" strokeWidth="2" />
          {kind === 'cut' && <path d="M40 120 H95 L100 70 L106 120 H200" stroke={MOSS} strokeWidth="4" fill="none" strokeLinejoin="round" />}
          {kind === 'bounce' && <path d="M40 90 H110 L115 140 L121 90 H200" stroke={MOSS} strokeWidth="4" fill="none" strokeLinejoin="round" />}
          {kind === 'slide' && <path d="M40 140 H80 Q120 140 130 90 H200" stroke={MOSS} strokeWidth="4" fill="none" strokeLinejoin="round" />}
          <text x="40" y="175" fontSize="14" fontWeight="600" fill={INK}>{t(kind === 'cut' ? 'ill.flick' : kind === 'bounce' ? 'ill.tap' : 'ill.glide')}</text>
          <text x="180" y="60" fontSize="30" fontWeight="700" fill="var(--c-bad)" fontFamily="var(--font-display)">{kind[0].toUpperCase()}</text>
        </>
      )}
      {kind === 'posture' && <Whistle />}
    </svg>
  )
}
