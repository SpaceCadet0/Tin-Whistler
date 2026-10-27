import { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useT } from '../../i18n'
import { isDuet, partName } from '../../music/duet'
import { tuneDurationSec, usedNotes } from '../../music/tune'
import { TUNE_TYPES, type Tune, type TuneType } from '../../music/types'
import { getWhistle, WHISTLE_KEYS } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { useAllTunes } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { Button, ButtonLink, Chip, cn, Difficulty, EmptyState, PageHeader, ProgressBar } from '../../ui/primitives'
import { FavoriteButton } from './FavoriteButton'
import { rememberLibrarySearch } from './libraryReturn'
import { SelectFilter } from './FilterMenu'
import { TypeFilter } from './TypeFilter'
import { Stagger } from '../../ui/motion'
import { stopPreview, togglePreview, usePreview } from './preview'

/** "D whistle" → "D", "Low D whistle" → "Low D". */
const whistleShort = (id: string) => getWhistle(id).label.replace(/\s*whistle$/i, '')
/** Whistle filter value for "duets only". */
const DUET_FILTER = 'duet'
/** A tune for this whistle: its own, or one of a duet's parts. */
const playsOn = (tune: Tune, whistle: string) => tune.whistle === whistle || !!tune.duet?.parts.some((p) => p.whistle === whistle)

function TuneCard({ tune }: { tune: Tune }) {
  const { t } = useT()
  const tp = useProgress((s) => s.tunes[tune.id])
  const notes = usedNotes(tune)
  const mins = Math.max(1, Math.round(tuneDurationSec(tune) / 60))
  return (
    // the preview button sits beside the link, not inside it (no nested interactive elements)
    <div className="group relative grid min-w-0 grid-cols-1">
    <Link to={`/tunes/${tune.id}`} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line/70 bg-surface p-5 shadow-soft transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
      <div className="flex items-start justify-between gap-3 pr-24">
        <div className="min-w-0">
          <p className="line-clamp-2 font-display text-xl leading-tight font-semibold">{tune.title}</p>
          <p className="truncate text-sm text-ink-soft">{tune.composer ?? t(`tuneType.${tune.type}`)}</p>
        </div>
        {tp?.mastered ? (
          <Chip tone="good">
            <Icon name="trophy" size={12} /> {t('tune.mastered')}
          </Chip>
        ) : (
          tune.origin === 'user' && <Chip tone="brass">{t('tune.yours')}</Chip>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
        <Difficulty value={tune.difficulty} label={t('tune.difficulty')} />
        <span>{t(`tuneType.${tune.type}`)}</span>
        <span className="inline-flex items-center gap-1" title={t('editor.whistle')}>
          <Icon name="whistle" size={14} />
          {isDuet(tune) ? tune.duet!.parts.map((p) => partName(p.whistle)).join(' + ') : whistleShort(tune.whistle)}
        </span>
        {isDuet(tune) && <Chip tone="moss">{t('duet.badge')}</Chip>}
        <span className="tabular">{tune.bpm} BPM</span>
        <span>
          {tune.sections.length} {t('tune.sectionsShort')} · ~{mins} {t('common.min')}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {notes.map((n) => (
          <span key={n} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-ink-soft">
            {n}
          </span>
        ))}
      </div>
      <div className="mt-auto">
        <div className="mb-1 flex justify-between text-xs font-semibold text-ink-soft">
          <span>{t('tune.learning')}</span>
          <span>{t('tune.stepOf', { n: tp?.step ?? 0, of: 7 })}</span>
        </div>
        <ProgressBar value={(tp?.step ?? 0) / 7} height={6} label={t('tune.learning')} />
      </div>
    </Link>
    <FavoriteButton tuneId={tune.id} title={tune.title} className="absolute top-4 right-16 transition group-hover:-translate-y-0.5" />
    <PreviewButton tune={tune} />
    </div>
  )
}

/** Listen to the opening without leaving the list; a ring shows how much is left. */
function PreviewButton({ tune }: { tune: Tune }) {
  const { t } = useT()
  const { playing, progress } = usePreview(tune.id)
  const label = playing ? t('tunes.stopPreview') : t('tunes.preview', { title: tune.title })
  const r = 20
  const c = 2 * Math.PI * r
  return (
    <button
      type="button"
      onClick={() => togglePreview(tune)}
      aria-label={label}
      title={label}
      aria-pressed={playing}
      className={cn(
        'absolute top-4 right-4 grid h-11 w-11 cursor-pointer place-items-center rounded-full transition group-hover:-translate-y-0.5 active:scale-95',
        playing ? 'bg-moss text-on-moss' : 'bg-moss-soft text-moss hover:bg-moss hover:text-on-moss',
      )}
    >
      {playing && (
        <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth="2.5" />
          <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
        </svg>
      )}
      <Icon name={playing ? 'stop' : 'play'} size={18} className={playing ? undefined : 'translate-x-px'} />
    </button>
  )
}

type Level = 'all' | 'easy' | 'mid' | 'hard'
const LEVELS: Level[] = ['all', 'easy', 'mid', 'hard']

function matchesLevel(tune: Tune, level: Level): boolean {
  if (level === 'easy') return tune.difficulty <= 1
  if (level === 'mid') return tune.difficulty >= 2 && tune.difficulty <= 3
  if (level === 'hard') return tune.difficulty >= 4
  return true
}

/**
 * The library's filters live in the URL (?q=&level=&whistle=&types=&fav=1), so coming back from a
 * tune keeps them and a filtered list can be shared or bookmarked.
 */
function useLibraryFilters() {
  const [params, setParams] = useSearchParams()
  const level = (LEVELS as string[]).includes(params.get('level') ?? '') ? (params.get('level') as Level) : 'all'
  const types = (params.get('types') ?? '').split(',').filter((x): x is TuneType => (TUNE_TYPES as readonly string[]).includes(x))
  const filters = { query: params.get('q') ?? '', level, whistle: params.get('whistle') ?? 'all', types, favorites: params.get('fav') === '1' }
  const update = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch }
    const p = new URLSearchParams()
    if (next.query) p.set('q', next.query)
    if (next.level !== 'all') p.set('level', next.level)
    if (next.whistle !== 'all') p.set('whistle', next.whistle)
    if (next.types.length) p.set('types', next.types.join(','))
    if (next.favorites) p.set('fav', '1')
    setParams(p, { replace: true })
  }
  const active = Boolean(filters.query || filters.level !== 'all' || filters.whistle !== 'all' || filters.types.length || filters.favorites)
  return { ...filters, update, active, reset: () => setParams(new URLSearchParams(), { replace: true }) }
}

const pill = (on: boolean) => cn('h-10 shrink-0 cursor-pointer rounded-2xl px-4 text-sm font-semibold whitespace-nowrap transition', on ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft hover:text-ink')

export default function TuneLibrary() {
  const { t } = useT()
  const tunes = useAllTunes()
  const favoriteIds = useSettings((s) => s.favoriteTunes)
  const f = useLibraryFilters()
  const { search } = useLocation()
  useEffect(() => stopPreview, [])
  useEffect(() => rememberLibrarySearch(search), [search])
  // only offer keys and types that some tune actually has
  const whistleCounts = WHISTLE_KEYS.map((w) => ({ ...w, count: tunes.filter((x) => playsOn(x, w.id)).length })).filter((w) => w.count > 0)
  const duets = tunes.filter(isDuet).length
  const typeCounts = TUNE_TYPES.map((type) => ({ type, count: tunes.filter((x) => x.type === type).length })).filter((x) => x.count > 0)
  const levelCounts = LEVELS.filter((l) => l !== 'all').map((l) => ({ value: l, label: t(`tunes.level.${l}`), count: tunes.filter((x) => matchesLevel(x, l)).length }))
  const favorites = tunes.filter((x) => favoriteIds.includes(x.id)).length
  const query = f.query.toLowerCase()
  const filtered = tunes.filter((x) => {
    if (query && !`${x.title} ${x.composer ?? ''} ${t(`tuneType.${x.type}`)}`.toLowerCase().includes(query)) return false
    if (f.whistle === DUET_FILTER ? !isDuet(x) : f.whistle !== 'all' && !playsOn(x, f.whistle)) return false
    if (f.types.length && !f.types.includes(x.type)) return false
    if (f.favorites && !favoriteIds.includes(x.id)) return false
    return matchesLevel(x, f.level)
  })
  const builtin = filtered.filter((x) => x.origin === 'builtin')
  const mine = filtered.filter((x) => x.origin === 'user')
  const hasOwnTunes = tunes.some((x) => x.origin === 'user')

  return (
    <div>
      <PageHeader
        title={t('tunes.title')}
        subtitle={t('tunes.subtitle')}
        actions={
          <ButtonLink to="/tunes/import" icon="plus">
            {t('tunes.add')}
          </ButtonLink>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <label className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
          <span className="sr-only">{t('tunes.search')}</span>
          <input
            type="search"
            value={f.query}
            onChange={(e) => f.update({ query: e.target.value })}
            placeholder={t('tunes.search')}
            className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-moss"
          />
        </label>
        <button
          type="button"
          aria-pressed={f.favorites}
          aria-label={t('tunes.favorites')}
          title={t('tunes.favorites')}
          onClick={() => f.update({ favorites: !f.favorites })}
          className={cn(pill(f.favorites), 'inline-flex items-center gap-1.5 px-3.5')}
        >
          <Icon name="heart" size={18} filled={f.favorites} className={f.favorites ? undefined : 'text-moss'} />
          <span className="tabular">{favorites}</span>
        </button>
        <TypeFilter options={typeCounts} selected={f.types} onChange={(types) => f.update({ types })} />
        <SelectFilter
          name={t('tune.difficulty')}
          allValue="all"
          allLabel={t('tunes.anyDifficulty')}
          value={f.level}
          options={levelCounts}
          onChange={(level) => f.update({ level })}
        />
        <SelectFilter
          name={t('editor.whistle')}
          icon="whistle"
          allValue="all"
          allLabel={t('tunes.allWhistles')}
          value={f.whistle}
          options={[
            ...whistleCounts.map((w) => ({ value: w.id, label: whistleShort(w.id), count: w.count })),
            ...(duets ? [{ value: DUET_FILTER, label: t('duet.badge'), count: duets }] : []),
          ]}
          onChange={(whistle) => f.update({ whistle })}
        />
      </div>
      <div className="mb-5 flex min-h-6 items-center gap-3 text-sm text-ink-soft">
        <span className="tabular">{t('tunes.found', { n: filtered.length })}</span>
        {f.active && (
          <button type="button" onClick={f.reset} className="cursor-pointer font-semibold text-moss hover:underline">
            {t('tunes.resetFilters')}
          </button>
        )}
      </div>

      {builtin.length ? (
        <Stagger as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {builtin.map((x) => (
            <TuneCard key={x.id} tune={x} />
          ))}
        </Stagger>
      ) : (
        !mine.length && (
          <EmptyState
            title={f.favorites && !favorites ? t('tunes.noFavoritesTitle') : t('tunes.noMatchTitle')}
            body={f.favorites && !favorites ? t('tunes.noFavoritesBody') : t('tunes.noMatchBody')}
            action={
              <Button variant="secondary" onClick={f.reset}>
                {t('tunes.resetFilters')}
              </Button>
            }
          />
        )
      )}

      {/* with filters on, "my tunes" shows only when something of the user's matches */}
      {(mine.length > 0 || !f.active) && (
        <>
          <h2 className="mt-10 mb-4 font-display text-2xl font-semibold">{t('tunes.mine')}</h2>
          {mine.length ? (
            <Stagger as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mine.map((x) => (
                <TuneCard key={x.id} tune={x} />
              ))}
            </Stagger>
          ) : (
            !hasOwnTunes && (
              <EmptyState
                title={t('tunes.emptyTitle')}
                body={t('tunes.emptyBody')}
                action={
                  <ButtonLink to="/tunes/import" variant="secondary" icon="plus">
                    {t('tunes.add')}
                  </ButtonLink>
                }
              />
            )
          )}
        </>
      )}
    </div>
  )
}
