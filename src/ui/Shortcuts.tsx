import { useT, type MessageKey } from '../i18n'
import type { Fingering } from '../music/types'
import { FingeringColumn } from './whistle/FingeringColumn'

/** One key as a keycap chip. */
export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="min-w-7 rounded-lg border border-line bg-surface px-1.5 py-0.5 text-center font-sans text-xs font-semibold whitespace-nowrap text-ink shadow-[inset_0_-1px_0_var(--c-line)]">
      {children}
    </kbd>
  )
}

/** Keyboard hints as real <kbd> chips instead of a dotted run-on line. Hidden on touch-only phones. */
export function Shortcuts({ items }: { items: [keys: string[], label: MessageKey][] }) {
  const { t } = useT()
  return (
    <details className="group hidden text-sm text-ink-soft [@media(hover:hover)]:block">
      <summary className="cursor-pointer list-none text-center text-xs font-medium text-ink-faint transition-colors hover:text-ink-soft">
        {t('sc.title')}
      </summary>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {items.map(([keys, label]) => (
          <div key={label} className="flex items-center gap-3">
            <dt className="flex shrink-0 gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dt>
            <dd>{t(label)}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

const one = (h: 0 | 0.5 | 1): Fingering => [h, 1, 1, 1, 1, 1]

/** Legend for reading whistle tabs. */
export function TabLegend() {
  const { t } = useT()
  const sym = (content: React.ReactNode, label: MessageKey) => (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-2 font-bold text-bad">{content}</span>
      <span>{t(label)}</span>
    </div>
  )
  const hole = (h: 0 | 0.5 | 1, label: MessageKey) => (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2">
        <span className="-mt-[1px] h-[14px] overflow-hidden">
          <FingeringColumn fingering={one(h)} dot={12} />
        </span>
      </span>
      <span>{t(label)}</span>
    </div>
  )
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm text-ink-soft sm:grid-cols-2 lg:grid-cols-3">
      {hole(1, 'lg.covered')}
      {hole(0, 'lg.open')}
      {hole(0.5, 'lg.half')}
      {sym(<span className="text-ink">+</span>, 'lg.high')}
      {sym(<span className="block h-4 w-4 rounded-full border-2 border-bad" />, 'lg.ring')}
      {sym('C', 'orn.cut')}
      {sym('B', 'orn.bounce')}
      {sym('S', 'orn.slide')}
      {sym('tr', 'lg.trill')}
      {sym('t', 'lg.t')}
      {sym('r', 'lg.r')}
      {sym('trr', 'lg.trru')}
      {sym('-', 'lg.slur')}
      {sym('i', 'lg.stop')}
    </div>
  )
}
