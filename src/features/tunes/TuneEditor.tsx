import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useT } from '../../i18n'
import { toast } from '../../lib/toast'
import { deleteNote, insertNote, locate, togglePhraseBreak, toggleLineBreak, updateNote } from '../../music/editing'
import { parseTabText, sectionToTabText } from '../../music/tabText'
import { autoSection, sectionNotes } from '../../music/tune'
import type { Tune, TuneSection, TuneType } from '../../music/types'
import { noteById } from '../../music/whistles'
import { usePlayer } from '../../hooks/audio'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useTune, useTuneLibrary } from '../../state/tunes'
import { Button, ButtonLink, Card, cn, IconButton, PageHeader, Segmented } from '../../ui/primitives'
import { Shortcuts } from '../../ui/Shortcuts'
import { TabView } from '../../ui/whistle/TabView'
import { NoteInspector } from './editor/NoteInspector'

const TYPES: TuneType[] = ['air', 'reel', 'jig', 'polka', 'march', 'waltz', 'hornpipe', 'slide', 'song', 'exercise']
const KEY_NOTES: Record<string, string> = { d: 'D', e: 'E', f: 'F#', g: 'G', a: 'A', b: 'B', c: 'C#' }

export default function TuneEditor() {
  const { tuneId } = useParams()
  const stored = useTune(tuneId)
  const save = useTuneLibrary((s) => s.save)
  const navigate = useNavigate()
  const { t } = useT()
  const [tune, setTune] = useState<Tune | null>(null)
  const [sectionIdx, setSectionIdx] = useState(0)
  const [sel, setSel] = useState(0)
  const [mode, setMode] = useState<'visual' | 'text'>('visual')
  const [text, setText] = useState('')
  const [textError, setTextError] = useState<string | null>(null)
  const history = useRef<Tune[]>([])
  const { player, state: playState, position } = usePlayer(tune ?? undefined)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (stored && !tune) setTune(structuredClone(stored))
  }, [stored, tune])

  const section = tune ? tune.sections[Math.min(sectionIdx, tune.sections.length - 1)] : null
  const count = section ? sectionNotes(section).length : 0
  const selIdx = Math.min(sel, Math.max(0, count - 1))
  const note = section ? sectionNotes(section)[selIdx] : undefined

  const commit = (next: Tune) => {
    if (tune) history.current.push(tune)
    if (history.current.length > 100) history.current.shift()
    setTune(next)
    setDirty(true)
  }
  const setSection = (s: TuneSection) => tune && commit({ ...tune, sections: tune.sections.map((x, i) => (i === sectionIdx ? s : x)) })
  const undo = () => {
    const prev = history.current.pop()
    if (prev) setTune(prev)
  }

  // play the section from the marker (selected note) to its end, same as Space in the player
  const firstInSection = tune ? tune.sections.slice(0, sectionIdx).reduce((n, x) => n + sectionNotes(x).length, 0) : 0
  const playFromMarker = () => {
    if (!tune || !count) return
    player.setOptions({ tempo: 1, countIn: 0, melody: true, repeat: false })
    player.play(firstInSection + selIdx, firstInSection + count - 1)
  }
  const playing = playState !== 'stopped'
  const playhead = playing && position ? position.index - firstInSection : null

  useHotkeys(
    section && note && tune
      ? {
          ArrowRight: () => setSel((s) => Math.min(count - 1, s + 1)),
          ArrowLeft: () => setSel((s) => Math.max(0, s - 1)),
          Delete: () => setSection(deleteNote(section, selIdx)),
          Backspace: () => setSection(deleteNote(section, selIdx)),
          Enter: () => {
            setSection(insertNote(section, selIdx, { ...note }, true))
            setSel(selIdx + 1)
          },
          z: (e) => (e.shiftKey ? undefined : undo()),
          ' ': playFromMarker,
          Escape: () => player.stop(),
          ...Object.fromEntries(
            Object.entries(KEY_NOTES).map(([k, id]) => [
              k,
              () => {
                const n = noteById(id, tune.whistle)
                if (n) setSection(updateNote(section, selIdx, { ...note, pitch: n.midi, fingering: undefined }))
              },
            ]),
          ),
          ...Object.fromEntries(['1', '2', '3', '4'].map((k) => [k, () => setSection(updateNote(section, selIdx, { ...note, beats: Number(k) }))])),
        }
      : {},
    mode === 'visual' && tune?.origin === 'user',
  )

  if (!tune || !section) return <p className="text-ink-soft">{stored === undefined ? t('tune.notFound') : ''}</p>
  if (tune.origin !== 'user') {
    return (
      <div className="py-16 text-center">
        <p className="mb-4">{t('editor.builtin')}</p>
        <ButtonLink to={`/tunes/${tune.id}`}>{t('common.back')}</ButtonLink>
      </div>
    )
  }

  const doSave = async () => {
    await save(tune)
    setDirty(false)
    toast({ kind: 'info', title: t('editor.saved') })
  }

  const addSection = () => {
    const s: TuneSection = { id: `s${Date.now().toString(36)}`, name: `${t('import.section')} ${tune.sections.length + 1}`, phrases: [[{ pitch: 74, beats: 1, attack: 'tongue' }]] }
    commit({ ...tune, sections: [...tune.sections, s] })
    setSectionIdx(tune.sections.length)
    setSel(0)
  }
  const removeSection = () => {
    if (tune.sections.length < 2) return
    commit({ ...tune, sections: tune.sections.filter((_, i) => i !== sectionIdx) })
    setSectionIdx(Math.max(0, sectionIdx - 1))
  }
  const autoSplit = () => {
    const phrases = tune.sections.flatMap((s) => s.phrases)
    const sections = autoSection(phrases, (tune.beatsPerBar ?? 4) * 8, t('import.section'))
    commit({ ...tune, sections })
    setSectionIdx(0)
  }
  const openText = () => {
    setText(sectionToTabText(section, tune.whistle))
    setTextError(null)
    setMode('text')
  }
  const applyText = () => {
    try {
      const { phrases, lineBreaks } = parseTabText(text, tune.whistle)
      if (!phrases.length) throw new Error(t('editor.emptyText'))
      setSection({ ...section, phrases, lineBreaks: lineBreaks.length ? lineBreaks : undefined })
      setMode('visual')
    } catch (e) {
      setTextError(e instanceof Error ? e.message : String(e))
    }
  }
  const { phrase } = locate(section, selIdx)

  return (
    <div>
      <PageHeader
        back={`/tunes/${tune.id}`}
        title={t('editor.title')}
        subtitle={tune.title}
        actions={
          <>
            <IconButton icon="repeat" label={t('editor.undo')} onClick={undo} disabled={!history.current.length} />
            <Button icon="check" onClick={doSave} variant={dirty ? 'primary' : 'secondary'}>
              {t('editor.save')}
            </Button>
          </>
        }
      />

      <Card className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft lg:col-span-2">
          {t('import.name')}
          <input value={tune.title} onChange={(e) => commit({ ...tune, title: e.target.value })} className="h-11 rounded-xl border border-line bg-surface px-3 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          {t('editor.type')}
          <select value={tune.type} onChange={(e) => commit({ ...tune, type: e.target.value as TuneType })} className="h-11 rounded-xl border border-line bg-surface px-3 text-ink">
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`tuneType.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          BPM
          <input type="number" min={30} max={300} value={tune.bpm} onChange={(e) => commit({ ...tune, bpm: Math.max(30, Number(e.target.value) || 90) })} className="h-11 rounded-xl border border-line bg-surface px-3 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          {t('tune.difficulty')}
          <input type="number" min={1} max={5} value={tune.difficulty} onChange={(e) => commit({ ...tune, difficulty: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} className="h-11 rounded-xl border border-line bg-surface px-3 text-ink" />
        </label>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tune.sections.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSectionIdx(i)
              setSel(0)
              setMode('visual')
            }}
            className={cn('h-10 rounded-2xl px-4 text-sm font-semibold', i === sectionIdx ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft')}
          >
            {s.name}
          </button>
        ))}
        <Button size="sm" variant="ghost" icon="plus" onClick={addSection}>
          {t('editor.addSection')}
        </Button>
        <Button size="sm" variant="ghost" icon="split" onClick={autoSplit}>
          {t('editor.autoSplit')}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={section.name}
              onChange={(e) => setSection({ ...section, name: e.target.value })}
              aria-label={t('editor.sectionName')}
              className="h-10 rounded-xl border border-transparent bg-transparent px-2 font-display text-xl font-semibold hover:border-line focus:border-moss"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant={playing ? 'danger' : 'secondary'} icon={playing ? 'stop' : 'play'} onClick={() => (playing ? player.stop() : playFromMarker())} title={t('editor.playHint')}>
                {playing ? t('tune.stop') : t('editor.playFromMarker')}
              </Button>
              <Segmented
                size="sm"
                label={t('editor.mode')}
                value={mode}
                onChange={(m) => (m === 'text' ? openText() : setMode('visual'))}
                options={[
                  { value: 'visual', label: t('editor.visual') },
                  { value: 'text', label: t('editor.text') },
                ]}
              />
              {tune.sections.length > 1 && <IconButton icon="trash" label={t('editor.deleteSection')} onClick={removeSection} size={36} />}
            </div>
          </div>
          {mode === 'visual' ? (
            <>
              <div className="overflow-x-auto">
                <TabView
                  tune={tune}
                  section={section}
                  selected={selIdx}
                  current={playhead}
                  onSelect={(i) => {
                    // tapping the marker again plays from it; tapping another note moves the marker
                    if (i === selIdx) playFromMarker()
                    else {
                      setSel(i)
                      if (playing) player.stop()
                    }
                  }}
                />
              </div>
              <Shortcuts
                items={[
                  [['Space'], 'sc.editorPlay'],
                  [['Esc'], 'sc.stop'],
                  [['←', '→'], 'sc.select'],
                  [['D', 'E', 'F', 'G', 'A', 'B', 'C'], 'sc.setNote'],
                  [['1', '4'], 'sc.beats'],
                  [['Enter'], 'sc.insert'],
                  [['Del'], 'sc.remove'],
                  [['Z'], 'sc.undo'],
                ]}
              />
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-soft">{t('editor.textHelp')}</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} spellCheck={false} aria-label={t('editor.text')} className="rounded-2xl border border-line bg-surface-2/50 p-3 font-mono text-sm" />
              {textError && <p className="text-bad">{textError}</p>}
              <div className="flex gap-2">
                <Button onClick={applyText} icon="check">
                  {t('editor.apply')}
                </Button>
                <Button variant="ghost" onClick={() => setMode('visual')}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </Card>
        {mode === 'visual' && note && (
          <Card>
            <p className="mb-3 text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">
              {t('editor.noteN', { n: selIdx + 1, of: count })} · {t('tab.phrase', { n: phrase + 1 })}
            </p>
            <NoteInspector
              note={note}
              whistleId={tune.whistle}
              onChange={(n) => setSection(updateNote(section, selIdx, n))}
              onInsert={(after) => {
                setSection(insertNote(section, selIdx, { ...note, ornament: undefined }, after))
                if (after) setSel(selIdx + 1)
              }}
              onDelete={() => setSection(deleteNote(section, selIdx))}
              onBreakPhrase={() => setSection(togglePhraseBreak(section, selIdx))}
              onBreakLine={() => setSection(toggleLineBreak(section, selIdx))}
            />
          </Card>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={async () => {
            await doSave()
            navigate(`/tunes/${tune.id}`)
          }}
        >
          {t('editor.saveClose')}
        </Button>
      </div>
    </div>
  )
}
