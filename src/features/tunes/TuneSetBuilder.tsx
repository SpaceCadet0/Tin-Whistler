import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useT } from '../../i18n'
import { tuneDurationSec } from '../../music/tune'
import { buildSet, canJoinSet, isSet, MAX_SET_TUNES, setTitle } from '../../music/tuneSet'
import type { Tune } from '../../music/types'
import { useAllTunes, useTuneLibrary } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { Button, Card, Difficulty, EmptyState, IconButton, PageHeader } from '../../ui/primitives'

function TuneRow({ tune, action }: { tune: Tune; action: React.ReactNode }) {
  const { t } = useT()
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface-2/60 py-2 pr-2 pl-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{tune.title}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
          <span>{t(`tuneType.${tune.type}`)}</span>
          <span>{tune.key}</span>
          <Difficulty value={tune.difficulty} label={t('tune.difficulty')} />
        </p>
      </div>
      {action}
    </li>
  )
}

/** The set as a tune of the user's own, stamped with the moment it was made. */
function newUserSet(tunes: Tune[]): Tune {
  const now = Date.now()
  return { ...buildSet(tunes, { id: `user-${now.toString(36)}` }), createdAt: now }
}

/** Build a set: start from one tune (?first=id) and add others in the same rhythm, in playing order. */
export default function TuneSetBuilder() {
  const { t } = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tunes = useAllTunes()
  const loaded = useTuneLibrary((s) => s.loaded)
  const save = useTuneLibrary((s) => s.save)
  const first = tunes.find((x) => x.id === params.get('first'))
  const [addedIds, setAddedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // a user tune may still be loading from storage; a built-in one is there at once
  if (!first) return loaded ? <Navigate to="/tunes" replace /> : null
  if (isSet(first)) return <Navigate to={`/tunes/${first.id}`} replace />

  const added = addedIds.flatMap((id) => tunes.find((x) => x.id === id) ?? [])
  const chosen = [first, ...added]
  const full = chosen.length >= MAX_SET_TUNES
  const candidates = tunes
    .filter((x) => x.id !== first.id && !addedIds.includes(x.id) && canJoinSet(first, x))
    // the same kind of tune first: a jig after a jig is the usual set
    .sort((a, b) => Number(b.type === first.type) - Number(a.type === first.type) || a.difficulty - b.difficulty)
  const minutes = Math.max(1, Math.round(chosen.reduce((a, x) => a + tuneDurationSec(x), 0) / 60))

  const saveSet = async () => {
    setSaving(true)
    const set = newUserSet(chosen)
    if (await save(set)) navigate(`/tunes/${set.id}`, { replace: true })
    else setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('set.new')} subtitle={t('set.subtitle')} back={`/tunes/${first.id}`} />

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">{t('set.chosen')}</h2>
          <p className="tabular text-sm text-ink-soft">
            {chosen.length} / {MAX_SET_TUNES} · ~{minutes} {t('common.min')}
          </p>
        </div>
        <ol className="flex flex-col gap-2">
          {chosen.map((x, i) => (
            <TuneRow
              key={x.id}
              tune={x}
              action={i > 0 ? <IconButton icon="x" label={t('set.remove', { title: x.title })} onClick={() => setAddedIds((ids) => ids.filter((id) => id !== x.id))} /> : <span className="h-11 w-11" aria-hidden="true" />}
            />
          ))}
        </ol>
        <p className="mt-4 text-sm text-ink-soft">{chosen.length < 2 ? t('set.needTwo') : setTitle(chosen)}</p>
        <Button className="mt-4 w-full sm:w-auto" icon="check" disabled={chosen.length < 2 || saving} onClick={saveSet}>
          {t('set.save')}
        </Button>
      </Card>

      <h2 className="mb-3 font-display text-xl font-semibold">{t('set.candidates')}</h2>
      {full ? (
        <p className="text-ink-soft">{t('set.full', { n: MAX_SET_TUNES })}</p>
      ) : candidates.length ? (
        <ul className="flex flex-col gap-2">
          {candidates.map((x) => (
            <TuneRow
              key={x.id}
              tune={x}
              action={
                <button
                  type="button"
                  onClick={() => setAddedIds((ids) => [...ids, x.id])}
                  aria-label={t('set.addTune', { title: x.title })}
                  className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-moss-soft text-moss transition hover:bg-moss hover:text-on-moss"
                >
                  <Icon name="plus" size={20} />
                </button>
              }
            />
          ))}
        </ul>
      ) : (
        <EmptyState title={t('set.none')} />
      )}
    </div>
  )
}
