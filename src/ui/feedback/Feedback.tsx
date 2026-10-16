import type { ReactNode } from 'react'
import type { PitchFrame } from '../../audio/pitch/stabilizer'
import type { MatchStatus } from '../../engine/scoring/noteMatch'
import { useT, type MessageKey } from '../../i18n'
import { whistleLabel } from '../../music/whistles'
import { Icon } from '../Icon'
import { cn } from '../primitives'

const HINT: Record<MatchStatus, MessageKey> = {
  silent: 'fb.silent',
  correct: 'fb.correct',
  'close-low': 'fb.closeLow',
  'close-high': 'fb.closeHigh',
  low: 'fb.low',
  high: 'fb.high',
  'octave-low': 'fb.octaveLow',
  'octave-high': 'fb.octaveHigh',
}

/** "TARGET A / YOU A ✓", large enough to read from a music stand. */
export function TargetVsUser({ target, frame, status, whistleId = 'D' }: { target: number; frame: PitchFrame | null; status: MatchStatus; whistleId?: string }) {
  const { t } = useT()
  const played = frame?.voiced && frame.note != null ? whistleLabel(frame.note, whistleId) : '-'
  const good = status === 'correct'
  const icon = good ? 'check' : status === 'silent' ? 'mic' : status.includes('low') ? 'up' : 'down'
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div className="flex flex-col items-center rounded-3xl bg-surface-2 px-6 py-4 sm:px-10">
          <span className="text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">{t('fb.target')}</span>
          <span className="font-display text-6xl leading-none font-semibold sm:text-7xl">{whistleLabel(target, whistleId)}</span>
        </div>
        <div
          className={cn(
            'flex flex-col items-center rounded-3xl px-6 py-4 transition-colors sm:px-10',
            good ? 'bg-good-soft text-good' : status === 'silent' ? 'bg-surface-2 text-ink-faint' : 'bg-warn-soft text-warn',
          )}
        >
          <span className="text-xs font-bold tracking-[0.18em] uppercase opacity-80">{t('fb.you')}</span>
          <span className="font-display text-6xl leading-none font-semibold sm:text-7xl" aria-live="off">
            {played}
          </span>
        </div>
      </div>
      <p
        className={cn('flex items-center gap-2 text-lg font-semibold', good ? 'text-good' : status === 'silent' ? 'text-ink-soft' : 'text-warn')}
        role="status"
        aria-live="polite"
      >
        <Icon name={icon} size={22} />
        {t(HINT[status])}
      </p>
    </div>
  )
}

/** Accuracy ████████░░ 82%, blocks keep it readable without colour. */
export function AccuracyBar({ value, label }: { value: number; label?: string }) {
  const { t } = useT()
  const v = Math.max(0, Math.min(1, value))
  const blocks = 10
  const filled = Math.round(v * blocks)
  return (
    <div className="flex items-center gap-3" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label ?? t('fb.accuracy')}>
      <span className="w-20 text-sm font-semibold text-ink-soft">{label ?? t('fb.accuracy')}</span>
      <span className="flex flex-1 gap-1">
        {Array.from({ length: blocks }, (_, i) => (
          <span key={i} className={cn('h-3 flex-1 rounded-sm transition-colors', i < filled ? (v > 0.75 ? 'bg-good' : v > 0.45 ? 'bg-brass' : 'bg-bad') : 'bg-surface-2')} />
        ))}
      </span>
      <span className="tabular w-12 text-right font-semibold">{Math.round(v * 100)}%</span>
    </div>
  )
}

/** flat ←-- CENTER --→ sharp. Turns green when steady and in tune. */
export function TunerGauge({ cents, active, locked, big, compact }: { cents: number; active: boolean; locked: boolean; big?: boolean; compact?: boolean }) {
  const { t } = useT()
  const clamped = Math.max(-50, Math.min(50, cents))
  const angle = (clamped / 50) * 60
  const inTune = active && Math.abs(cents) <= 5
  const color = !active ? 'var(--c-ink-faint)' : inTune ? 'var(--c-good)' : Math.abs(cents) <= 15 ? 'var(--c-brass)' : 'var(--c-bad)'
  const w = big ? 360 : 260
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 170" width={w} style={{ height: 'auto' }} className={cn('max-w-full', compact && 'max-lg:max-w-[200px]')} role="img" aria-label={active ? t('tuner.aria', { cents: Math.round(cents) }) : t('tuner.idle')}>
        {Array.from({ length: 21 }, (_, i) => {
          const a = ((i - 10) / 10) * 60
          const rad = ((a - 90) * Math.PI) / 180
          const r1 = i % 5 === 0 ? 112 : 120
          return (
            <line
              key={i}
              x1={150 + Math.cos(rad) * r1}
              y1={150 + Math.sin(rad) * r1}
              x2={150 + Math.cos(rad) * 130}
              y2={150 + Math.sin(rad) * 130}
              stroke={i === 10 ? 'var(--c-good)' : 'var(--c-line)'}
              strokeWidth={i === 10 ? 4 : 2}
              strokeLinecap="round"
            />
          )
        })}
        <path d="M 150 150 m -13 -129 a 130 130 0 0 1 26 0" stroke="var(--c-good)" strokeWidth="10" fill="none" opacity={0.25} />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '150px 150px', transition: 'transform 90ms linear' }}>
          <line x1="150" y1="150" x2="150" y2="34" stroke={color} strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle cx="150" cy="150" r="10" fill={color} />
        {locked && <circle cx="150" cy="150" r="18" fill="none" stroke="var(--c-good)" strokeWidth="3" />}
        <text x="22" y="165" fontSize="14" fill="var(--c-ink-soft)" fontWeight="600">
          ♭ {t('tuner.flat')}
        </text>
        <text x="278" y="165" fontSize="14" fill="var(--c-ink-soft)" fontWeight="600" textAnchor="end">
          {t('tuner.sharp')} ♯
        </text>
      </svg>
    </div>
  )
}

/** Mic input level. */
export function LevelMeter({ level }: { level: number }) {
  const { t } = useT()
  return (
    <div className="flex h-2 w-24 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label={t('mic.level')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
      <div className="h-full bg-moss transition-[width] duration-75" style={{ width: `${level * 100}%` }} />
    </div>
  )
}

/** ● ○ ● ○ beat dots with the current one enlarged. */
export function BeatIndicator({ count, current, accentEvery }: { count: number; current: number | null; accentEvery?: number }) {
  const { t } = useT()
  return (
    <div className="flex items-center justify-center gap-3" role="img" aria-label={current != null ? t('rhythm.beatAria', { n: current + 1, of: count }) : t('rhythm.ready')}>
      {Array.from({ length: count }, (_, i) => {
        const on = current === i
        const accent = accentEvery ? i % accentEvery === 0 : i === 0
        return (
          <span
            key={i}
            className={cn(
              'rounded-full transition-all duration-75',
              on ? 'h-7 w-7 bg-moss' : 'h-5 w-5 border-2',
              !on && (accent ? 'border-moss' : 'border-line'),
            )}
          />
        )
      })}
    </div>
  )
}

export function BigNote({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-[5.5rem] leading-none font-semibold sm:text-[7rem]">{children}</span>
      {sub && <span className="mt-1 text-sm font-semibold tracking-wide text-ink-soft uppercase">{sub}</span>}
    </div>
  )
}
