import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../../i18n'
import type { TuneType } from '../../music/types'
import { Icon } from '../../ui/Icon'
import { cn } from '../../ui/primitives'

/**
 * "Type" filter as one dropdown button with a checklist inside: several types can be picked at
 * once, and the row of filters stays short however many types the library has.
 */
export function TypeFilter({ options, selected, onChange }: { options: { type: TuneType; count: number }[]; selected: TuneType[]; onChange: (types: TuneType[]) => void }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
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

  const label = !selected.length ? t('tunes.allTypes') : selected.length === 1 ? t(`tuneType.${selected[0]}`) : t('tunes.typesSelected', { n: selected.length })
  const toggle = (type: TuneType) => onChange(selected.includes(type) ? selected.filter((x) => x !== type) : [...selected, type])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn('inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl pr-3 pl-4 text-sm font-semibold whitespace-nowrap transition', selected.length ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft hover:text-ink')}
      >
        <span className="sr-only">{t('tunes.type')}: </span>
        {label}
        <Icon name="caret" size={12} filled className={cn('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={menuId}
          role="group"
          aria-label={t('tunes.type')}
          className="absolute top-full left-0 z-30 mt-2 max-h-[min(60dvh,26rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
        >
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn('flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-2', !selected.length ? 'text-moss' : 'text-ink-soft')}
          >
            {t('tunes.allTypes')}
            {!selected.length && <Icon name="check" size={16} />}
          </button>
          <div className="my-1 h-px bg-line" />
          {options.map(({ type, count }) => (
            <label key={type} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
              <input type="checkbox" checked={selected.includes(type)} onChange={() => toggle(type)} className="h-4 w-4 accent-[var(--c-moss)]" />
              <span className="flex-1 font-semibold">{t(`tuneType.${type}`)}</span>
              <span className="tabular text-ink-faint">{count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
