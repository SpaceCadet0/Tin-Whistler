import { useT } from '../../i18n'
import type { TuneType } from '../../music/types'
import { FilterAllRow, FilterMenu } from './FilterMenu'

/**
 * "Type" filter as one dropdown button with a checklist inside: several types can be picked at
 * once, and the row of filters stays short however many types the library has.
 */
export function TypeFilter({ options, selected, onChange }: { options: { type: TuneType; count: number }[]; selected: TuneType[]; onChange: (types: TuneType[]) => void }) {
  const { t } = useT()
  const label = !selected.length ? t('tunes.allTypes') : selected.length === 1 ? t(`tuneType.${selected[0]}`) : t('tunes.typesSelected', { n: selected.length })
  const toggle = (type: TuneType) => onChange(selected.includes(type) ? selected.filter((x) => x !== type) : [...selected, type])

  return (
    <FilterMenu name={t('tunes.type')} label={label} active={selected.length > 0}>
      {() => (
        <>
          <FilterAllRow label={t('tunes.allTypes')} checked={!selected.length} onClick={() => onChange([])} />
          {options.map(({ type, count }) => (
            <label key={type} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
              <input type="checkbox" checked={selected.includes(type)} onChange={() => toggle(type)} className="h-4 w-4 accent-[var(--c-moss)]" />
              <span className="flex-1 font-semibold">{t(`tuneType.${type}`)}</span>
              <span className="tabular text-ink-faint">{count}</span>
            </label>
          ))}
        </>
      )}
    </FilterMenu>
  )
}
