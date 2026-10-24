import { useT } from '../../i18n'
import { useSettings } from '../../state/settings'
import { Icon } from '../../ui/Icon'
import { cn } from '../../ui/primitives'

/** Star a tune (a heart): it then shows up under the library's "Favourites" filter. */
export function FavoriteButton({ tuneId, title, className }: { tuneId: string; title: string; className?: string }) {
  const { t } = useT()
  const favorite = useSettings((s) => s.favoriteTunes.includes(tuneId))
  const toggle = useSettings((s) => s.toggleFavorite)
  const label = favorite ? t('tunes.removeFavorite', { title }) : t('tunes.addFavorite', { title })
  return (
    <button
      type="button"
      onClick={() => toggle(tuneId)}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-11 w-11 cursor-pointer place-items-center rounded-full transition active:scale-95',
        favorite ? 'text-bad hover:bg-bad-soft' : 'text-ink-faint hover:bg-surface-2 hover:text-ink-soft',
        className,
      )}
    >
      <Icon name="heart" size={22} filled={favorite} />
    </button>
  )
}
