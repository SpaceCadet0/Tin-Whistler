import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseAbc } from '../../import/abc'
import { readMidi, type MidiImport } from '../../import/midi'
import { isNotationSvg, mergeScorePages, parseNotationSvg } from '../../import/notationSvg'
import { recognizeImageFile } from '../../import/recognizeFile'
import { sectionFromRecognition } from '../../import/tabImage'
import { useT } from '../../i18n'
import { usedNotes } from '../../music/tune'
import type { Tune } from '../../music/types'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { useTuneLibrary } from '../../state/tunes'
import { Icon } from '../../ui/Icon'
import { Button, Card, Chip, cn, PageHeader, Segmented } from '../../ui/primitives'
import { TabView } from '../../ui/whistle/TabView'

type Mode = 'abc' | 'midi' | 'notation' | 'image' | 'blank'

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

export default function TuneImport() {
  const { t } = useT()
  const navigate = useNavigate()
  const whistleId = useSettings((s) => s.whistleId)
  const save = useTuneLibrary((s) => s.save)
  const recordImport = useProgress((s) => s.recordImport)
  const [mode, setMode] = useState<Mode>('abc')
  const [abc, setAbc] = useState('')
  const [tune, setTune] = useState<Tune | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [midi, setMidi] = useState<{ data: MidiImport; name: string } | null>(null)
  const [images, setImages] = useState<string[]>([])

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
      setMidi({ data, name: f.name })
      const r = data.build(data.tracks[0].index)
      setTune(r.tune)
      setWarnings(r.warnings)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  /** Sheet music exported as SVG (one file per page) → one tune. */
  const onScore = async (files: File[]) => {
    reset()
    const svgs = files.filter((f) => f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
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
      const sections = []
      const previews: string[] = []
      const warn: string[] = []
      for (const [i, f] of files.entries()) {
        const { result, preview } = await recognizeImageFile(f, whistleId)
        previews.push(preview)
        warn.push(...result.warnings.map((w) => `${f.name}: ${w}`))
        if (result.systems.length) sections.push(sectionFromRecognition(result, `s${i + 1}`, `${t('import.section')} ${i + 1}`, whistleId, 0.5))
      }
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
    void save(tn).then(() => navigate(`/tunes/${tn.id}/edit`))
  }

  const commit = async (edit: boolean) => {
    if (!tune) return
    await save(tune)
    recordImport()
    navigate(edit ? `/tunes/${tune.id}/edit` : `/tunes/${tune.id}`)
  }

  return (
    <div>
      <PageHeader back="/tunes" title={t('import.title')} subtitle={t('import.subtitle')} />
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
            { value: 'blank', label: t('import.blank') },
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
                  <select
                    className="h-11 rounded-xl border border-line bg-surface px-3 text-ink"
                    onChange={(e) => {
                      const r = midi.data.build(Number(e.target.value))
                      setTune(r.tune)
                      setWarnings(r.warnings)
                    }}
                  >
                    {midi.data.tracks.map((tr) => (
                      <option key={tr.index} value={tr.index}>
                        {tr.name} · {tr.notes} {t('import.notes')} {tr.instrument && `· ${tr.instrument}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {mode === 'notation' && (
            <div className="flex flex-col gap-4">
              <FileDrop accept=".svg,image/svg+xml" multiple onFiles={onScore} label={t('import.dropScore')} icon="music" />
              <p className="text-sm text-ink-soft">{t('import.scoreHelp')}</p>
            </div>
          )}
          {mode === 'image' && (
            <div className="flex flex-col gap-4">
              <FileDrop accept="image/*" multiple onFiles={onImages} label={t('import.dropImage')} icon="image" />
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
              {warnings.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
                  {warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              )}
              <div className="max-h-96 overflow-auto rounded-2xl border border-line p-3">
                {tune.sections.slice(0, 3).map((s) => (
                  <div key={s.id} className="mb-4">
                    <p className="mb-1 text-sm font-semibold">{s.name}</p>
                    <TabView tune={tune} section={s} dot={10} />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon="check" onClick={() => commit(false)}>
                  {t('import.save')}
                </Button>
                <Button variant="secondary" icon="edit" onClick={() => commit(true)}>
                  {t('import.saveEdit')}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
