import type { Fingering, HoleState } from '../../music/types'
import { cn } from '../primitives'

export type ColumnState = 'idle' | 'current' | 'past' | 'right' | 'wrong' | 'dim'

interface Props {
  fingering: Fingering
  register?: 1 | 2
  /** 0-based hole ringed for an ornament. */
  ringHole?: number
  /** 0-based hole of a cut that comes before the ornament ("C+S"): a second ring. */
  cutHole?: number
  /** Dot diameter in px. */
  dot?: number
  state?: ColumnState
  label?: string
}

function Dot({ h, size, ring }: { h: HoleState; size: number; ring?: boolean }) {
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
        {h === 0.5 ? (
          <>
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M10 2 A8 8 0 0 0 10 18 Z" fill="currentColor" />
          </>
        ) : h === 1 ? (
          <circle cx="10" cy="10" r="8.6" fill="currentColor" />
        ) : (
          <circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        )}
      </svg>
      {ring && <span className="absolute -inset-[5px] rounded-full border-2 border-bad" />}
    </span>
  )
}

/** One tab column: six dots (gap between the hands), optional ornament ring and "+" for the high octave. */
export function FingeringColumn({ fingering, register = 1, ringHole, cutHole, dot = 16, state = 'idle', label }: Props) {
  const ringed = (i: number) => ringHole === i || cutHole === i
  const color = {
    idle: 'text-ink',
    current: 'text-moss',
    past: 'text-ink-faint',
    right: 'text-good',
    wrong: 'text-bad',
    dim: 'text-ink-faint/60',
  }[state]
  return (
    <span className={cn('inline-flex flex-col items-center', color)} role="img" aria-label={label}>
      <span className="flex flex-col" style={{ gap: dot * 0.22 }}>
        {fingering.slice(0, 3).map((h, i) => (
          <Dot key={i} h={h} size={dot} ring={ringed(i)} />
        ))}
      </span>
      <span style={{ height: dot * 0.55 }} />
      <span className="flex flex-col" style={{ gap: dot * 0.22 }}>
        {fingering.slice(3).map((h, i) => (
          <Dot key={i} h={h} size={dot} ring={ringed(i + 3)} />
        ))}
      </span>
      <span className="mt-0.5 h-3 text-[11px] leading-3 font-bold text-ink-soft" aria-hidden="true">
        {register === 2 ? '+' : ''}
      </span>
    </span>
  )
}
