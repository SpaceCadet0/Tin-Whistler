import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../../ui/Icon'
import { cn } from '../../ui/primitives'

/** The panel's width (w-64) and the margin it keeps from the screen edge, in px. */
const PANEL_WIDTH = 256
const EDGE_GAP = 16

/**
 * A library filter as one pill button that opens a panel under it. The panel closes on an outside
 * tap or Escape; `children` gets a `close` callback for single-choice menus.
 */
export function FilterMenu({
  name,
  label,
  active,
  icon,
  children,
}: {
  /** What the filter is, for screen readers and the panel's label. */
  name: string
  /** The current choice, shown on the button. */
  label: string
  /** A value other than "all" is picked: the pill turns dark. */
  active: boolean
  icon?: IconName
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  // near the right edge the panel opens leftwards, so it never runs off the screen
  const [alignRight, setAlignRight] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          setAlignRight(e.currentTarget.getBoundingClientRect().left + PANEL_WIDTH > window.innerWidth - EDGE_GAP)
          setOpen((o) => !o)
        }}
        className={cn(
          'inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl pr-3 text-sm font-semibold whitespace-nowrap transition',
          icon ? 'pl-3' : 'pl-4',
          active ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft hover:text-ink',
        )}
      >
        {icon && <Icon name={icon} size={16} />}
        <span className="sr-only">{name}: </span>
        {label}
        <Icon name="caret" size={12} filled className={cn('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={menuId}
          role="group"
          aria-label={name}
          className={cn(
            'absolute top-full z-30 mt-2 max-h-[min(60dvh,26rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift',
            alignRight ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

/** The "all" row at the top of a filter panel, ticked when nothing narrower is picked. */
export function FilterAllRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-pressed={checked}
        onClick={onClick}
        className={cn('flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-2', checked ? 'text-moss' : 'text-ink-soft')}
      >
        {label}
      </button>
      <div className="my-1 h-px bg-line" />
    </>
  )
}

export interface SelectFilterOption<T extends string> {
  value: T
  label: string
  count?: number
}

/** Single-choice filter in the same pill and panel as the type checklist. */
export function SelectFilter<T extends string>({
  name,
  allValue,
  allLabel,
  value,
  options,
  onChange,
  icon,
}: {
  name: string
  allValue: T
  allLabel: string
  value: T
  options: SelectFilterOption<T>[]
  onChange: (value: T) => void
  icon?: IconName
}) {
  const current = options.find((o) => o.value === value)
  const pick = (v: T, close: () => void) => {
    onChange(v)
    close()
  }
  return (
    <FilterMenu name={name} label={current?.label ?? allLabel} active={value !== allValue} icon={icon}>
      {(close) => (
        <>
          <FilterAllRow label={allLabel} checked={value === allValue} onClick={() => pick(allValue, close)} />
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={o.value === value}
              onClick={() => pick(o.value, close)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2"
            >
              <span className={cn('flex-1 font-semibold', o.value === value && 'text-moss')}>{o.label}</span>
              {o.count != null && <span className="tabular text-ink-faint">{o.count}</span>}
            </button>
          ))}
        </>
      )}
    </FilterMenu>
  )
}
