import { useRef, useState } from 'react'
import { useT } from '../../i18n'
import { buildFromVideo, pageFromScreenshot, readVideo, type ImportedPage, type VideoStage } from '../../import/videoImport'
import { midiToName } from '../../music/pitch'
import type { Tune } from '../../music/types'
import { getWhistle, WHISTLE_KEYS } from '../../music/whistles'
import { Icon } from '../../ui/Icon'
import { Button, Chip, cn, IconButton, ProgressBar, Segmented, Toggle } from '../../ui/primitives'

/**
 * The "Video" import: a tab tutorial (mp4) read on the device. Its pages are cut out and shown for
 * checking (remove one, replace it or add a missed one with a screenshot); then the notes are timed
 * against the soundtrack in the key heard, which can be changed. The tune goes to the import preview.
 */

interface Props {
  onResult: (tune: Tune, warnings: string[]) => void
  onReset: () => void
}

type Phase = 'pick' | 'reading' | 'review' | 'building' | 'done'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const ERRORS = { 'video-too-long': 'import.videoTooLong', 'unsupported-video': 'import.videoUnsupported' } as const

export function VideoImport({ onResult, onReset }: Props) {
  const { t } = useT()
  const [phase, setPhase] = useState<Phase>('pick')
  const [progress, setProgress] = useState<{ stage: VideoStage; share: number }>({ stage: 'audio', share: 0 })
  const [pages, setPages] = useState<ImportedPage[]>([])
  const [whistle, setWhistle] = useState<string | null>(null)
  const [bySound, setBySound] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const source = useRef<{ samples: Float32Array; title: string } | null>(null)

  const fail = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    const known = ERRORS[msg as keyof typeof ERRORS]
    setError(known ? t(known) : msg)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    onReset()
    setError(null)
    setPhase('reading')
    try {
      const r = await readVideo(file, (stage, share) => setProgress({ stage, share }))
      if (!r.pages.length) throw new Error(t('import.videoNoPages'))
      source.current = { samples: r.samples, title: file.name.replace(/\.[a-z0-9]+$/i, '') }
      setPages(r.pages)
      setPhase('review')
    } catch (e) {
      fail(e)
      setPhase('pick')
    }
  }

  const build = async (key?: string, fix = bySound) => {
    if (!source.current) return
    setError(null)
    setPhase('building')
    try {
      const r = await buildFromVideo(pages, source.current.samples, { whistle: key, fixBySound: fix })
      setWhistle(r.whistle)
      const tune: Tune = {
        id: `user-${Date.now().toString(36)}`,
        title: source.current.title,
        origin: 'user',
        source: 'video',
        type: 'air',
        whistle: r.whistle,
        key: '',
        bpm: r.bpm,
        difficulty: 3,
        sections: r.sections.map((s, i) => ({ ...s, id: `s${i + 1}`, name: `${t('import.section')} ${i + 1}` })),
        createdAt: Date.now(),
      }
      const warnings = [
        t('import.videoNote'),
        ...(pages.some((p) => p.articulated) ? [] : [t('import.allTongued')]),
        ...pages.flatMap((p, i) => (p.twoColours ? [t('import.videoTwoColoursAt', { n: i + 1 })] : [])),
        ...r.fixed.map((f) => t('import.videoFixed', { s: f.section, n: f.note, from: midiToName(f.from), to: midiToName(f.to) })),
        ...r.doubtful.map((d) => t('import.videoDoubtful', { s: d.section, n: d.note })),
      ]
      onResult(tune, warnings)
      setPhase('done')
    } catch (e) {
      fail(e)
      setPhase('review')
    }
  }

  /** Swap a page for a screenshot, or (at = index + 1, add) put one after it sharing its time. */
  const fromScreenshot = async (file: File | undefined, at: number, add: boolean) => {
    if (!file) return
    const near = pages[add ? at - 1 : at]
    try {
      const page = await pageFromScreenshot(file, near.start, near.end)
      if (!page) throw new Error(t('import.noTab'))
      setPages((ps) => (add ? [...ps.slice(0, at), page, ...ps.slice(at)] : ps.map((p, i) => (i === at ? page : p))))
    } catch (e) {
      fail(e)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {phase === 'pick' && (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center transition hover:border-ink-faint">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-ink-soft">
            <Icon name="play" size={28} />
          </span>
          <span className="font-semibold">{t('import.videoDrop')}</span>
          <span className="max-w-md text-sm text-ink-soft">{t('import.videoHint')}</span>
          <input type="file" accept="video/mp4,video/*" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
      )}

      {(phase === 'reading' || phase === 'building') && (
        <div className="flex flex-col gap-2 rounded-3xl bg-surface-2 p-5" role="status">
          <p className="font-semibold">{phase === 'building' ? t('import.videoBuilding') : t(`import.videoStage.${progress.stage}`)}</p>
          <ProgressBar value={phase === 'building' ? 1 : progress.share} label={t('import.videoProgress')} />
        </div>
      )}

      {(phase === 'review' || phase === 'done') && (
        <>
          <p className="text-sm text-ink-soft">{t('import.videoPages', { n: pages.length })}</p>
          <ol className="flex flex-col gap-3">
            {pages.map((p, i) => (
              <li key={`${p.start}-${i}`} className="flex flex-col gap-2 rounded-3xl border border-line/70 bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span>{t('import.videoPage', { n: i + 1, from: clock(p.start), to: clock(p.end), notes: p.section.phrases.flat().length })}</span>
                  {p.twoColours && <Chip tone="warn">{t('import.videoTwoColours')}</Chip>}
                  <span className="ml-auto flex items-center gap-1">
                    <ScreenshotButton icon="image" label={t('import.videoReplace')} onFile={(f) => void fromScreenshot(f, i, false)} disabled={phase !== 'review'} />
                    <ScreenshotButton icon="plus" label={t('import.videoAddAfter')} onFile={(f) => void fromScreenshot(f, i + 1, true)} disabled={phase !== 'review'} />
                    <IconButton icon="trash" label={t('import.videoRemove')} disabled={phase !== 'review'} onClick={() => setPages((ps) => ps.filter((_, k) => k !== i))} />
                  </span>
                </div>
                {/* the clean page, as the tutorial drew it */}
                <img src={p.preview} alt={t('import.videoPageAlt', { n: i + 1 })} className="w-full rounded-2xl bg-white" />
              </li>
            ))}
          </ol>
          {(phase === 'review' || phase === 'done') && (
            <Toggle
              label={t('import.videoBySound')}
              description={t('import.videoBySoundHint')}
              checked={bySound}
              onChange={(v) => {
                setBySound(v)
                if (phase === 'done') void build(whistle ?? undefined, v)
              }}
            />
          )}
          {phase === 'review' && (
            <Button icon="wand" disabled={!pages.length} onClick={() => void build()}>
              {t('import.videoBuild')}
            </Button>
          )}
          {phase === 'done' && whistle && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink-soft">{t('import.videoKey', { key: getWhistle(whistle).label })}</span>
              <Segmented<string>
                size="sm"
                label={t('import.videoKeyPick')}
                value={whistle}
                onChange={(k) => void build(k)}
                options={WHISTLE_KEYS.map((w) => ({ value: w.id, label: w.label.replace(/ whistle$/, '') }))}
              />
            </div>
          )}
        </>
      )}

      {error && <p className={cn('rounded-2xl bg-bad/10 p-3 text-sm text-bad')}>{error}</p>}
    </div>
  )
}

function ScreenshotButton({ icon, label, onFile, disabled }: { icon: string; label: string; onFile: (f: File | undefined) => void; disabled?: boolean }) {
  return (
    <label className={cn('grid h-9 w-9 cursor-pointer place-items-center rounded-xl text-ink-soft hover:bg-surface-2 hover:text-ink', disabled && 'pointer-events-none opacity-40')} title={label}>
      <Icon name={icon} size={18} />
      <span className="sr-only">{label}</span>
      <input type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  )
}
