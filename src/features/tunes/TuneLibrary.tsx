import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import { tuneDurationSec, usedNotes } from '../../music/tune'
import type { Tune } from '../../music/types'
import { useProgress } from '../../state/progress'
import { useAllTunes } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { ButtonLink, Chip, cn, Difficulty, EmptyState, PageHeader, ProgressBar } from '../../ui/primitives'
import { Stagger } from '../../ui/motion'

function TuneCard({ tune }: { tune: Tune }) {
  const { t } = useT()
  const tp = useProgress((s) => s.tunes[tune.id])
  const notes = usedNotes(tune)
  const mins = Math.max(1, Math.round(tuneDurationSec(tune) / 60))
  return (
    <Link to={`/tunes/${tune.id}`} className="group flex flex-col gap-3 rounded-[var(--radius-card)] border border-line/70 bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
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
  )
}

export default function TuneLibrary() {
  const { t } = useT()
  const tunes = useAllTunes()
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<'all' | 'easy' | 'mid' | 'hard'>('all')
  const filtered = tunes.filter((x) => {
    if (query && !`${x.title} ${x.composer ?? ''} ${x.type}`.toLowerCase().includes(query.toLowerCase())) return false
    if (level === 'easy') return x.difficulty <= 1
    if (level === 'mid') return x.difficulty >= 2 && x.difficulty <= 3
    if (level === 'hard') return x.difficulty >= 4
    return true
  })
  const builtin = filtered.filter((x) => x.origin === 'builtin')
  const mine = filtered.filter((x) => x.origin === 'user')

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
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative flex-1 sm:max-w-xs">
          <span className="sr-only">{t('tunes.search')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tunes.search')}
            className="h-11 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-moss"
          />
        </label>
        <div className="flex gap-1.5" role="group" aria-label={t('tune.difficulty')}>
          {(['all', 'easy', 'mid', 'hard'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
              className={cn('h-10 rounded-2xl px-4 text-sm font-semibold transition', level === l ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft')}
            >
              {t(`tunes.level.${l}`)}
            </button>
          ))}
        </div>
      </div>

      <Stagger as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {builtin.map((x) => (
          <TuneCard key={x.id} tune={x} />
        ))}
      </Stagger>

      <h2 className="mt-10 mb-4 font-display text-2xl font-semibold">{t('tunes.mine')}</h2>
      {mine.length ? (
        <Stagger as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((x) => (
            <TuneCard key={x.id} tune={x} />
          ))}
        </Stagger>
      ) : (
        <EmptyState
          title={t('tunes.emptyTitle')}
          body={t('tunes.emptyBody')}
          action={
            <ButtonLink to="/tunes/import" variant="secondary" icon="plus">
              {t('tunes.add')}
            </ButtonLink>
          }
        />
      )}
    </div>
  )
}
