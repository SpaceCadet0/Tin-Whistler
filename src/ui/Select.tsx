import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from './primitives'

export interface SelectOption<T extends string | number> {
  value: T
  label: ReactNode
}

/** The margin the open list keeps from the screen edge, px. */
const EDGE_GAP = 16

/**
 * A form dropdown drawn by the app (the system one looks different on every platform): a field-like
 * button and a list under it. Arrow keys, Home/End, Enter and Escape work as in a native select.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
  size = 'md',
  className,
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /** For screen readers when no visible label wraps the field. */
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [alignRight, setAlignRight] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const current = options.findIndex((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  // the highlighted row stays in view as the arrows move it
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const show = () => {
    const box = root.current?.getBoundingClientRect()
    setAlignRight(!!box && box.left + Math.max(box.width, 224) > window.innerWidth - EDGE_GAP)
    setActive(Math.max(0, current))
    setOpen(true)
  }
  const pick = (i: number) => {
    setOpen(false)
    if (options[i] && options[i].value !== value) onChange(options[i].value)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // keys on the field are its own: a page listening for letters and arrows (the tune editor) must not get them
    if (e.key !== 'Tab' && !e.ctrlKey && !e.metaKey) e.stopPropagation()
    const last = options.length - 1
    const move: Record<string, number> = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last }
    if (e.key in move) {
      e.preventDefault()
      if (open) setActive(move[e.key])
      else show()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open) pick(active)
      else show()
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-surface text-left font-normal text-ink transition disabled:cursor-default disabled:opacity-50',
          size === 'sm' ? 'h-9 pr-2 pl-2.5 text-sm' : 'h-11 pr-3 pl-3',
          open && 'border-moss',
        )}
      >
        <span className="truncate">{options[current]?.label}</span>
        <Icon name="caret" size={12} filled className={cn('shrink-0 text-ink-soft transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          className={cn(
            'absolute top-full z-30 mt-1.5 max-h-[min(60dvh,22rem)] w-max min-w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift',
            alignRight ? 'right-0' : 'left-0',
          )}
        >
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(i)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
                i === active && 'bg-surface-2',
                i === current ? 'text-moss' : 'text-ink',
              )}
            >
              <span className="flex-1">{o.label}</span>
              <span className="flex w-4 justify-center">{i === current && <Icon name="check" size={16} />}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
