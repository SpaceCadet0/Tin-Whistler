import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseAbc } from '../../import/abc'
import { readMidi, type MidiImport } from '../../import/midi'
import { isNotationSvg, mergeScorePages, parseNotationSvg } from '../../import/notationSvg'
import { tuneFromNotationImages, type NotationImageResult } from '../../import/notationImage'
import { recognizeImageFile, recognizeNotationFile } from '../../import/recognizeFile'
import { sectionFromRecognition, withAttack, writesArticulation, type RecognitionResult } from '../../import/tabImage'
import { useT } from '../../i18n'
import { toast } from '../../lib/toast'
import { usedNotes } from '../../music/tune'
import type { Tune } from '../../music/types'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { useTune, useTuneLibrary } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { Button, Card, Chip, cn, PageHeader, ProgressBar, Segmented } from '../../ui/primitives'
import { Select } from '../../ui/Select'
import { TabView } from '../../ui/whistle/TabView'
import { stopPreview, togglePreview, usePreview } from './preview'
import { VideoImport } from './VideoImport'

type Mode = 'abc' | 'midi' | 'notation' | 'image' | 'video' | 'blank'

const SAMPLE_ABC = `X:1
T:The Kesh
R:jig
M:6/8
L:1/8
K:Gmaj
|:G3 GAB|A3 ABd|edd gdd|edB dBA|GAG GAB|A3 ABd|edB dBA|BGG G3:|
|:BAB dBd|ege dBA|BAB dBG|ABA AGA|BAB dBd|ege dBd|gfg aga|bgg g3:|`

function FileDrop({ accept, multiple, onFiles, label, icon }: { accept: string; multiple?: boolean; onFiles: (f: File[]) => void; label: string; icon: string }) {
  const [over, setOver] = useState(false)
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles([...e.dataTransfer.files])
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition',
        over ? 'border-moss bg-moss-soft' : 'border-line hover:border-ink-faint',
      )}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-ink-soft">
        <Icon name={icon} size={28} />
      </span>
      <span className="font-semibold">{label}</span>
      <input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => onFiles([...(e.target.files ?? [])])} />
    </label>
  )
}

/** Hear the whole imported tune before saving it; stops when the result changes or the page is left. */
function ListenButton({ tune, playing, progress }: { tune: Tune; playing: boolean; progress: number }) {
  const { t } = useT()
  useEffect(() => stopPreview, [tune])
  return (
    <div className="flex flex-col gap-1.5">
      <Button variant={playing ? 'secondary' : 'primary'} icon={playing ? 'stop' : 'play'} onClick={() => togglePreview(tune, true)} className="self-start">
        {playing ? t('import.listenStop') : t('import.listen')}
      </Button>
      {playing && <ProgressBar value={progress} height={4} label={t('import.listen')} live />}
    </div>
  )
}

export default function TuneImport() {
  const { t } = useT()
  const navigate = useNavigate()
  // /tunes/:tuneId/add-section: the same importers, appending sections to an existing tune
  const { tuneId } = useParams()
  const target = useTune(tuneId)
  const settingsWhistle = useSettings((s) => s.whistleId)
  // recognise in the target's key, so tabs read from an image keep their fingerings
  const whistleId = target?.whistle ?? settingsWhistle
  const save = useTuneLibrary((s) => s.save)
  const recordImport = useProgress((s) => s.recordImport)
  const [mode, setMode] = useState<Mode>('abc')
  const [abc, setAbc] = useState('')
  const [tune, setTune] = useState<Tune | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [midi, setMidi] = useState<{ data: MidiImport; name: string; track: number } | null>(null)
  const [images, setImages] = useState<string[]>([])
  const heard = usePreview(tune?.id ?? '')

  const reset = () => {
    setTune(null)
    setWarnings([])
    setError(null)
  }

  const fromAbc = (text: string) => {
    reset()
    try {
      const r = parseAbc(text, whistleId)
      setTune(r.tune)
      setWarnings(r.warnings)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onMidi = async (files: File[]) => {
    reset()
    const f = files[0]
    if (!f) return
    try {
      const data = readMidi(await f.arrayBuffer(), f.name, whistleId)
      if (!data.tracks.length) throw new Error(t('import.midiEmpty'))
      setMidi({ data, name: f.name, track: data.tracks[0].index })
      const r = data.build(data.tracks[0].index)
      setTune(r.tune)
      setWarnings(r.warnings)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  /** Sheet music as JPG/PNG (one image per page): pitches only, every note one beat. */
  const onScoreImages = async (files: File[]) => {
    setBusy(true)
    try {
      const pages: NotationImageResult[] = []
      const previews: string[] = []
      for (const f of files) {
        const { result, preview } = await recognizeNotationFile(f)
        previews.push(preview)
        if (!result.staves.some((s) => s.notes.length)) throw new Error(t('import.noScoreImage', { name: f.name }))
        pages.push(result)
      }
      setImages(previews)
      const name = files[0].name.replace(/(_\d+)?\.(png|jpe?g)$/i, '').replace(/[-_]+/g, ' ').trim()
      const r = tuneFromNotationImages(pages, name, whistleId)
      setTune(r.tune)
      setWarnings([t('import.rasterNote'), t('import.rasterStats', { notes: r.stats.notes, staves: r.stats.staves, pages: pages.length }), ...r.warnings])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  /** Sheet music exported as SVG (one file per page) → one tune; JPG/PNG pages go to onScoreImages. */
  const onScore = async (files: File[]) => {
    reset()
    const byName = (a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true })
    const svgs = files.filter((f) => f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)).sort(byName)
    const rasters = files.filter((f) => /^image\/(png|jpe?g)$/.test(f.type) || /\.(png|jpe?g)$/i.test(f.name)).sort(byName)
    if (!svgs.length && rasters.length) return onScoreImages(rasters)
    if (!svgs.length) {
      setError(t(files.length ? 'import.scoreNotSvg' : 'import.noScore'))
      return
    }
    try {
      const pages = []
      for (const f of svgs) {
        const text = await f.text()
        if (!isNotationSvg(text)) throw new Error(`${f.name}: ${t('import.noScore')}`)
        pages.push(parseNotationSvg(text, '', whistleId))
      }
      const name = svgs[0].name.replace(/(_\d+)?\.svg$/i, '').replace(/[-_]+/g, ' ').trim()
      const r = pages.length > 1 ? mergeScorePages(pages, name) : { ...pages[0], tune: { ...pages[0].tune, title: name } }
      setTune(r.tune)
      setWarnings([t('import.scoreStats', { notes: r.stats.notes, bars: r.stats.measures, pages: pages.length }), t('import.scoreTempo'), ...r.warnings])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onImages = async (files: File[]) => {
    reset()
    if (!files.length) return
    // vector sheet music dropped here? read it as notation
    if (files.every((f) => /\.svg$/i.test(f.name) || f.type === 'image/svg+xml')) return onScore(files)
    setBusy(true)
    try {
      const read: { result: RecognitionResult; i: number }[] = []
      const previews: string[] = []
      const warn: string[] = []
      for (const [i, f] of files.entries()) {
        const { result, preview } = await recognizeImageFile(f, whistleId)
        previews.push(preview)
        warn.push(...result.warnings.map((w) => `${f.name}: ${w}`))
        if (result.systems.length) read.push({ result, i })
      }
      // no articulation written on any screenshot: every note is tongued
      const tongued = read.length > 0 && !read.some((r) => writesArticulation(r.result))
      const sections = read.map(({ result, i }) => {
        const section = sectionFromRecognition(result, `s${i + 1}`, `${t('import.section')} ${i + 1}`, whistleId, 0.5)
        return tongued ? withAttack(section, 'tongue') : section
      })
      if (tongued) warn.push(t('import.allTongued'))
      setImages(previews)
      if (!sections.length) throw new Error(t('import.noTab'))
      setTune({
        id: `user-${Date.now().toString(36)}`,
        title: files[0].name.replace(/\.[a-z]+$/i, ''),
        origin: 'user',
        source: 'image',
        type: 'air',
        whistle: whistleId,
        key: 'D',
        bpm: 90,
        difficulty: 3,
        sections,
        createdAt: Date.now(),
      })
      setWarnings([t('import.imageNote'), ...warn])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const blank = () => {
    const tn: Tune = {
      id: `user-${Date.now().toString(36)}`,
      title: t('import.untitled'),
      origin: 'user',
      source: 'editor',
      type: 'song',
      whistle: whistleId,
      key: 'D',
      meter: '4/4',
      bpm: 90,
      beatsPerBar: 4,
      difficulty: 1,
      sections: [{ id: 's1', name: `${t('import.section')} 1`, phrases: [[{ pitch: 74, beats: 1, attack: 'tongue' }]] }],
      createdAt: Date.now(),
    }
    void save(tn).then((ok) => ok && navigate(`/tunes/${tn.id}/edit`))
  }

  /** Append the imported sections to the target tune, renumbered after its own. */
  const append = async () => {
    if (!tune || !target) return
    const stamp = Date.now().toString(36)
    const added = tune.sections.map((s, i) => ({ ...s, id: `s${stamp}${i}`, name: `${t('import.section')} ${target.sections.length + i + 1}` }))
    if (!(await save({ ...target, sections: [...target.sections, ...added] }))) return
    recordImport()
    toast({ kind: 'info', title: t('import.sectionsAdded', { n: added.length }) })
    navigate(`/tunes/${target.id}/edit?section=${target.sections.length}`)
  }

  const commit = async (edit: boolean) => {
    if (!tune) return
    if (!(await save(tune))) return
    recordImport()
    navigate(edit ? `/tunes/${tune.id}/edit` : `/tunes/${tune.id}`)
  }

  return (
    <div>
      <PageHeader
        back={target ? `/tunes/${target.id}/edit` : '/tunes'}
        title={target ? t('import.addSectionTitle') : t('import.title')}
        subtitle={target ? t('import.addSectionSubtitle', { title: target.title }) : t('import.subtitle')}
      />
      <div className="mb-6">
        <Segmented
          label={t('import.format')}
          value={mode}
          onChange={(m) => {
            setMode(m)
            reset()
            setMidi(null)
            setImages([])
          }}
          options={[
            { value: 'abc', label: 'ABC' },
            { value: 'midi', label: 'MIDI' },
            { value: 'notation', label: t('import.notation') },
            { value: 'image', label: t('import.image') },
            { value: 'video', label: t('import.video') },
            // an empty section is one click in the editor itself
            ...(target ? [] : [{ value: 'blank' as const, label: t('import.blank') }]),
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          {mode === 'abc' && (
            <div className="flex flex-col gap-3">
              <p className="text-ink-soft">{t('import.abcHelp')}</p>
              <textarea
                value={abc}
                onChange={(e) => setAbc(e.target.value)}
                rows={12}
                spellCheck={false}
                aria-label={t('import.abcLabel')}
                placeholder={SAMPLE_ABC}
                className="w-full rounded-2xl border border-line bg-surface-2/50 p-4 font-mono text-sm outline-none focus:border-moss"
              />
              <div className="flex flex-wrap gap-2">
                <Button icon="wand" onClick={() => fromAbc(abc || SAMPLE_ABC)}>
                  {abc ? t('import.parse') : t('import.trySample')}
                </Button>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-line px-4 font-semibold hover:bg-surface-2">
                  <Icon name="file" size={18} /> {t('import.openFile')}
                  <input
                    type="file"
                    accept=".abc,.txt,text/plain"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        const text = await f.text()
                        setAbc(text)
                        fromAbc(text)
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}
          {mode === 'midi' && (
            <div className="flex flex-col gap-4">
              <FileDrop accept=".mid,.midi,audio/midi" onFiles={onMidi} label={t('import.dropMidi')} icon="music" />
              {midi && midi.data.tracks.length > 1 && (
                <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
                  {t('import.track')}
                  <Select
                    value={midi.track}
                    onChange={(track) => {
                      const r = midi.data.build(track)
                      setMidi({ ...midi, track })
                      setTune(r.tune)
                      setWarnings(r.warnings)
                    }}
                    options={midi.data.tracks.map((tr) => ({ value: tr.index, label: `${tr.name} · ${tr.notes} ${t('import.notes')}${tr.instrument ? ` · ${tr.instrument}` : ''}` }))}
                  />
                </label>
              )}
            </div>
          )}
          {mode === 'notation' && (
            <div className="flex flex-col gap-4">
              <FileDrop accept=".svg,image/svg+xml,.png,.jpg,.jpeg,image/png,image/jpeg" multiple onFiles={onScore} label={t('import.dropScore')} icon="music" />
              <p role="note" className="flex gap-2.5 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
                <Icon name="info" size={18} className="mt-0.5 shrink-0" />
                <span>{t('import.rasterWarning')}</span>
              </p>
              <p className="text-sm text-ink-soft">{t('import.scoreHelp')}</p>
              {busy && <p className="font-semibold text-moss" role="status">{t('import.reading')}</p>}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((src, i) => (
                    <img key={i} src={src} alt={`${t('import.section')} ${i + 1}`} className="rounded-xl border border-line" />
                  ))}
                </div>
              )}
            </div>
          )}
          {mode === 'image' && (
            <div className="flex flex-col gap-4">
              <FileDrop accept="image/*" multiple onFiles={onImages} label={t('import.dropImage')} icon="image" />
              <p role="note" className="flex gap-2.5 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
                <Icon name="info" size={18} className="mt-0.5 shrink-0" />
                <span>{t('import.imageNote')}</span>
              </p>
              <p className="text-sm text-ink-soft">{t('import.imageHelp')}</p>
              {busy && <p className="font-semibold text-moss" role="status">{t('import.reading')}</p>}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((src, i) => (
                    <img key={i} src={src} alt={`${t('import.section')} ${i + 1}`} className="rounded-xl border border-line" />
                  ))}
                </div>
              )}
            </div>
          )}
          {mode === 'video' && (
            <VideoImport
              onResult={(tn, w) => {
                setTune(tn)
                setWarnings(w)
              }}
              onReset={reset}
            />
          )}
          {mode === 'blank' && (
            <div className="flex flex-col items-start gap-4">
              <p className="text-ink-soft">{t('import.blankHelp')}</p>
              <Button icon="edit" onClick={blank}>
                {t('import.openEditor')}
              </Button>
            </div>
          )}
          {error && (
            <p className="mt-4 rounded-2xl bg-bad-soft p-3 text-bad" role="alert">
              {error}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold">{t('import.preview')}</h2>
          {!tune ? (
            <p className="text-ink-soft">{t('import.previewEmpty')}</p>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
                {t('import.name')}
                <input value={tune.title} onChange={(e) => setTune({ ...tune, title: e.target.value })} className="h-11 rounded-xl border border-line bg-surface px-3 text-lg text-ink" />
              </label>
              <div className="flex flex-wrap gap-1.5">
                <Chip tone="moss">{t(`tuneType.${tune.type}`)}</Chip>
                <Chip>{tune.bpm} BPM</Chip>
                <Chip>
                  {tune.sections.length} {t('tune.sectionsShort')}
                </Chip>
                {usedNotes(tune).map((n) => (
                  <Chip key={n}>{n}</Chip>
                ))}
              </div>
              <ListenButton tune={tune} playing={heard.playing} progress={heard.progress} />
              {warnings.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
                  {warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              )}
              <div className="max-h-96 overflow-auto rounded-2xl border border-line p-3">
                {/* every section while listening, so the marker can follow the whole tune */}
                {(heard.playing ? tune.sections : tune.sections.slice(0, 3)).map((s, si) => (
                  <div key={s.id} className="mb-4">
                    <p className="mb-1 text-sm font-semibold">{s.name}</p>
                    <TabView tune={tune} section={s} dot={10} current={heard.at?.section === si ? heard.at.note : null} />
                  </div>
                ))}
              </div>
              {target ? (
                <Button icon="plus" onClick={append} className="self-start">
                  {t('import.appendSections', { n: tune.sections.length })}
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button icon="check" onClick={() => commit(false)}>
                    {t('import.save')}
                  </Button>
                  <Button variant="secondary" icon="edit" onClick={() => commit(true)}>
                    {t('import.saveEdit')}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
