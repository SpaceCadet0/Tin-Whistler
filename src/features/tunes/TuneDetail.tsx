import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { whistleSynth } from '../../audio/WhistleSynth'
import { useHotkeys } from '../../hooks/useHotkeys'
import { sectionName, useT } from '../../i18n'
import { toast } from '../../lib/toast'
import { noteFingering } from '../../music/ornaments'
import { sectionToTabText } from '../../music/tabText'
import { flattenTune, tuneDurationSec, usedNotes } from '../../music/tune'
import type { Tune } from '../../music/types'
import { whistleLabel } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useTune, useTuneLibrary } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { Button, ButtonLink, Card, Chip, cn, Difficulty, IconButton, Modal, PageHeader } from '../../ui/primitives'
import { Stagger } from '../../ui/motion'
import { TabLegend } from '../../ui/Shortcuts'
import { TabView } from '../../ui/whistle/TabView'
import { WhistleView } from '../../ui/whistle/WhistleView'
import { FavoriteButton } from './FavoriteButton'
import { LEARNING_STEPS } from './learningSteps'
import { libraryPath } from './libraryReturn'

/** Step 3: walk through the fingerings note by note. */
function FingeringWalk({ tune, onClose }: { tune: Tune; onClose: () => void }) {
  const { t, lang } = useT()
  const notes = flattenTune(tune).filter((n) => n.note.pitch != null)
  const [i, setI] = useState(0)
  const cur = notes[i]
  const prev = notes[i - 1]
  const fg = noteFingering(cur.note.pitch!, cur.note.fingering, tune.whistle)!
  const prevFg = prev ? noteFingering(prev.note.pitch!, prev.note.fingering, tune.whistle) : undefined
  const go = (d: number) => {
    const j = Math.max(0, Math.min(notes.length - 1, i + d))
    setI(j)
    whistleSynth.playNote(notes[j].note.pitch!, 0.6, { ornament: notes[j].note.ornament, fingering: notes[j].note.fingering })
  }
  useHotkeys({ ArrowRight: () => go(1), ArrowLeft: () => go(-1), ' ': () => go(1) })
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-ink-soft">
        {sectionName(tune.sections[cur.sectionIndex].name, lang)} · {t('walk.noteOf', { n: i + 1, of: notes.length })}
      </p>
      <p className="font-display text-7xl font-semibold">{whistleLabel(cur.note.pitch!, tune.whistle)}</p>
      <WhistleView fingering={fg.fingering} from={prevFg?.fingering} ornamentHole={cur.note.ornament?.hole ? cur.note.ornament.hole - 1 : undefined} height={340} />
      <div className="flex items-center gap-3">
        <IconButton icon="back" label={t('walk.prev')} onClick={() => go(-1)} disabled={i === 0} />
        <Button onClick={() => go(0)} icon="volume" variant="secondary">
          {t('ex.listen')}
        </Button>
        <IconButton icon="next" label={t('walk.next')} onClick={() => go(1)} disabled={i === notes.length - 1} />
      </div>
      <p className="text-xs text-ink-faint">{t('walk.keys')}</p>
      <Button onClick={onClose}>{t('ex.continue')}</Button>
    </div>
  )
}

export default function TuneDetail() {
  const { tuneId } = useParams()
  const tune = useTune(tuneId)
  const { t, L, lang } = useT()
  const navigate = useNavigate()
  const tp = useProgress((s) => (tuneId ? s.tunes[tuneId] : undefined))
  const setStep = useProgress((s) => s.setTuneStep)
  const remove = useTuneLibrary((s) => s.remove)
  const save = useTuneLibrary((s) => s.save)
  const [walk, setWalk] = useState(false)
  const [showTab, setShowTab] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!tune) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-lg">{t('tune.notFound')}</p>
        <ButtonLink to="/tunes">{t('nav.tunes')}</ButtonLink>
      </div>
    )
  }
  const step = tp?.step ?? 0
  const mins = Math.max(1, Math.round(tuneDurationSec(tune) / 60))

  const openStep = (n: number) => {
    if (n === 2) {
      setShowTab(true)
      setStep(tune.id, 2)
      document.getElementById('tab-overview')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (n === 3) {
      setWalk(true)
      setStep(tune.id, 3)
      return
    }
    if (n === 1) setStep(tune.id, 1)
    navigate(`/tunes/${tune.id}/play?step=${n}`)
  }

  const duplicate = async () => {
    const copy: Tune = { ...structuredClone(tune), id: `user-${Date.now().toString(36)}`, origin: 'user', source: 'editor', title: `${tune.title} (${t('tune.copy')})`, createdAt: Date.now() }
    if (await save(copy)) navigate(`/tunes/${copy.id}/edit`)
  }

  const copyText = async () => {
    const text = `# ${tune.title}\n` + tune.sections.map((s) => `## ${s.name}\n${sectionToTabText(s, tune.whistle)}`).join('\n\n')
    await navigator.clipboard?.writeText(text)
    toast({ kind: 'info', title: t('tune.copied') })
  }

  return (
    <div>
      <PageHeader
        back={libraryPath()}
        title={tune.title}
        subtitle={tune.composer}
        actions={
          <>
            <FavoriteButton tuneId={tune.id} title={tune.title} />
            <ButtonLink to={`/tunes/${tune.id}/play`} icon="play" size="lg">
              {t('tune.practise')}
            </ButtonLink>
          </>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Chip tone="moss">{t(`tuneType.${tune.type}`)}</Chip>
        <Chip>
          {t('tune.key')}: {tune.key}
        </Chip>
        {tune.meter && <Chip>{tune.meter}</Chip>}
        <Chip>{tune.bpm} BPM</Chip>
        <Chip>
          {tune.sections.length} {t('tune.sectionsShort')} · ~{mins} {t('common.min')}
        </Chip>
        <span className="ml-1 inline-flex items-center gap-2 text-sm text-ink-soft">
          {t('tune.difficulty')} <Difficulty value={tune.difficulty} label={t('tune.difficulty')} />
        </span>
      </div>
      {tune.description && <p className="mb-6 max-w-2xl text-lg text-ink-soft">{L(tune.description)}</p>}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink-soft">{t('tune.notesUsed')}:</span>
        {usedNotes(tune).map((n) => (
          <span key={n} className="rounded-lg bg-surface-2 px-2 py-0.5 font-display font-semibold">
            {n}
          </span>
        ))}
      </div>

      <h2 className="mb-4 font-display text-2xl font-semibold">{t('steps.title')}</h2>
      <Stagger as="ol" className="mb-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {LEARNING_STEPS.map((s) => {
          const done = step >= s.n
          const next = step + 1 === s.n
          return (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => openStep(s.n)}
                className={cn(
                  'flex h-full w-full items-start gap-3 rounded-[var(--radius-card)] border bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift',
                  next ? 'border-moss ring-2 ring-moss/25' : 'border-line/70',
                )}
              >
                <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', done ? 'bg-good-soft text-good' : next ? 'bg-moss text-on-moss' : 'bg-surface-2 text-ink-soft')}>
                  {done ? <Icon name="check" size={20} /> : <Icon name={s.icon} size={20} />}
                </span>
                <span>
                  <span className="block text-xs font-bold tracking-wider text-ink-faint uppercase">{t('steps.step', { n: s.n })}</span>
                  <span className="block font-semibold">{t(s.title)}</span>
                  <span className="text-sm text-ink-soft">{t(s.body)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </Stagger>

      <section id="tab-overview" className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">{t('tune.tab')}</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => setShowTab((x) => !x)} icon="eye">
              {showTab ? t('tune.hideTab') : t('tune.showTab')}
            </Button>
            <Button size="sm" variant="ghost" className="whitespace-nowrap" icon="file" onClick={copyText}>
              {t('tune.copyText')}
            </Button>
          </div>
        </div>
        {showTab && (
          <div className="flex flex-col gap-6">
            {tune.sections.map((s) => (
              <Card key={s.id}>
                <h3 className="mb-3 font-display text-lg font-semibold">{sectionName(s.name, lang)}</h3>
                <div className="overflow-x-auto">
                  <TabView tune={tune} section={s} showSecondVoice={!!s.secondVoice} />
                </div>
              </Card>
            ))}
            <Card>
              <p className="mb-4 font-semibold">{t('legend.title')}</p>
              <TabLegend />
            </Card>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        {tune.origin === 'user' ? (
          <>
            <ButtonLink to={`/tunes/${tune.id}/edit`} variant="secondary" icon="edit">
              {t('tune.edit')}
            </ButtonLink>
            <Button variant="danger" icon="trash" onClick={() => setConfirmDelete(true)}>
              {t('tune.delete')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" icon="edit" onClick={duplicate}>
            {t('tune.duplicate')}
          </Button>
        )}
        <Link to={`/practice/game?tune=${tune.id}`} className="inline-flex h-11 items-center gap-2 rounded-2xl px-4 font-semibold text-ink-soft hover:bg-surface-2">
          <Icon name="gamepad" size={20} /> {t('tune.playGame')}
        </Link>
      </div>

      <Modal open={walk} onClose={() => setWalk(false)} title={t('steps.fingering')}>
        <FingeringWalk tune={tune} onClose={() => setWalk(false)} />
      </Modal>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('tune.deleteTitle')}>
        <p className="mb-6 text-ink-soft">{t('tune.deleteBody', { title: tune.title })}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            icon="trash"
            onClick={async () => {
              if (await remove(tune.id)) navigate('/tunes')
            }}
          >
            {t('tune.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
