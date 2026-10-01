import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { extendTailwindMerge } from 'tailwind-merge'
import { Icon } from './Icon'
import { Triquetra } from './ornaments'

// custom radius / colour tokens must be known to the merger so later classes win
const twMerge = extendTailwindMerge({
  extend: { theme: { color: ['bg', 'surface', 'surface-2', 'line', 'ink', 'ink-soft', 'ink-faint', 'moss', 'moss-strong', 'moss-soft', 'on-moss', 'brass', 'brass-soft', 'good', 'good-soft', 'warn', 'warn-soft', 'bad', 'bad-soft', 'hole', 'metal', 'metal-2'] } },
})

/** Join class names; conflicting Tailwind utilities resolve to the last one. */
export const cn = (...xs: (string | false | null | undefined)[]) => twMerge(xs.filter(Boolean).join(' '))

type Variant = 'primary' | 'secondary' | 'ghost' | 'brass' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-moss text-on-moss hover:bg-moss-strong shadow-soft',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  brass: 'bg-brass text-white hover:brightness-105 shadow-soft',
  danger: 'bg-bad-soft text-bad hover:brightness-95',
}
const SIZES: Record<Size, string> = {
  sm: 'h-10 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
  xl: 'h-16 px-8 text-lg gap-3 rounded-3xl',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center max-w-full text-center leading-tight font-semibold select-none transition active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    extra,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: string
  iconRight?: string
}

export function Button({ variant, size, icon, iconRight, className, children, type = 'button', ...rest }: ButtonProps) {
  const iconSize = size === 'sm' ? 16 : size === 'xl' ? 24 : 20
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: string; iconRight?: string }) {
  const iconSize = size === 'sm' ? 16 : size === 'xl' ? 24 : 20
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </Link>
  )
}

export function IconButton({
  icon,
  label,
  size = 44,
  active,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; size?: number; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-2xl transition active:scale-95 disabled:opacity-40',
        active ? 'bg-moss text-on-moss' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} />
    </button>
  )
}

export function Card({ className, children, as: As = 'div', ...rest }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn('rounded-[var(--radius-card)] border border-line/70 bg-surface p-5 shadow-soft', className)} {...rest}>
      {children}
    </As>
  )
}

export function Chip({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'moss' | 'brass' | 'good' | 'bad' | 'warn'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-soft',
    moss: 'bg-moss-soft text-moss',
    brass: 'bg-brass-soft text-brass',
    good: 'bg-good-soft text-good',
    bad: 'bg-bad-soft text-bad',
    warn: 'bg-warn-soft text-warn',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>
}

export function ProgressBar({ value, label, tone = 'moss', className, height = 8 }: { value: number; label?: string; tone?: 'moss' | 'brass' | 'good'; className?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value))
  const tones = { moss: 'bg-moss', brass: 'bg-brass', good: 'bg-good' }
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn('w-full overflow-hidden rounded-full bg-surface-2', className)}
      style={{ height }}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])} style={{ width: `${v * 100}%` }} />
    </div>
  )
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  children,
  label,
  graded,
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  label?: string
  /** Colour by score: red → brass → green. */
  graded?: boolean
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={graded ? (value >= 0.8 ? 'var(--c-good)' : value >= 0.55 ? 'var(--c-brass)' : 'var(--c-bad)') : 'var(--c-moss)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        <span className="tabular text-sm font-semibold">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full cursor-pointer"
      />
    </div>
  )
}

export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl py-2 text-left"
    >
      <span className="flex flex-col">
        <span className="text-[15px] font-medium">{label}</span>
        {description && <span className="text-sm text-ink-soft">{description}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-moss' : 'bg-surface-2 ring-1 ring-line')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  // equal columns that shrink down to their longest word (labels wrap), scrolling only as a last resort
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-grid max-w-full auto-cols-[minmax(min-content,1fr)] grid-flow-col overflow-x-auto rounded-2xl bg-surface-2 p-1 [scrollbar-width:none]', className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-w-10 rounded-xl leading-tight font-semibold text-balance transition',
            size === 'sm' ? 'min-h-10 px-3 py-1 text-sm' : 'min-h-10 px-3 py-1.5 text-[15px] sm:px-4',
            o.value === value ? 'bg-surface text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({ icon, value, label, tone = 'moss' }: { icon: string; value: ReactNode; label: string; tone?: 'moss' | 'brass' | 'bad' }) {
  const tones = { moss: 'bg-moss-soft text-moss', brass: 'bg-brass-soft text-brass', bad: 'bg-bad-soft text-bad' }
  return (
    <div className="flex items-center gap-3">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', tones[tone])}>
        <Icon name={icon} size={22} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="tabular font-display text-2xl leading-none font-semibold">{value}</span>
        <span className="mt-1 text-xs leading-tight font-medium tracking-wide text-ink-soft uppercase">{label}</span>
      </span>
    </div>
  )
}

export function PageHeader({ title, subtitle, back, actions }: { title: ReactNode; subtitle?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start gap-x-3 gap-y-4">
      {back && (
        <Link to={back} aria-label="Back" className="-ml-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-soft hover:bg-surface-2">
          <Icon name="back" />
        </Link>
      )}
      {/* the actions drop below the title when both don't fit on one line */}
      <div className="min-w-0 flex-1 basis-60">
        <h1 className="font-display text-3xl leading-tight font-semibold text-balance md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[60ch] text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-3xl border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-black/40 backdrop:backdrop-blur-[2px]',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
            <IconButton icon="x" label="Close" onClick={onClose} size={40} />
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-10 text-center">
      <Triquetra className="h-16 w-16 text-brass" weight={3} />
      <p className="font-display text-xl font-semibold">{title}</p>
      {body && <p className="max-w-sm text-ink-soft">{body}</p>}
      {action}
    </div>
  )
}

export function Difficulty({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${label}: ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('h-2 w-2 rounded-full', i <= value ? 'bg-brass' : 'bg-surface-2 ring-1 ring-line')} />
      ))}
    </span>
  )
}
