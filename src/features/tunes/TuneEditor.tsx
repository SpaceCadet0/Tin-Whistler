import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams, useSearchParams, type BlockerFunction } from 'react-router-dom'
import { useT } from '../../i18n'
import { toast } from '../../lib/toast'
import { changeWhistle, insertClip, insertNote, locate, moveRange, removeRange, sliceClip, togglePhraseBreak, toggleLineBreak, updateNote } from '../../music/editing'
import { parseTabText, sectionToTabText } from '../../music/tabText'
import { autoSection, sectionNotes } from '../../music/tune'
import type { Tune, TuneSection, TuneType } from '../../music/types'
import { getWhistle, noteById, WHISTLE_KEYS } from '../../music/whistles'
import { usePlayer } from '../../hooks/audio'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useTune, useTuneLibrary } from '../../state/tunes'
import { Button, ButtonLink, Card, cn, IconButton, Modal, PageHeader, Segmented } from '../../ui/primitives'
import { Shortcuts } from '../../ui/Shortcuts'
import { TabView } from '../../ui/whistle/TabView'
import { tabClipboard } from './editor/clipboard'
import { NoteInspector } from './editor/NoteInspector'

const TYPES: TuneType[] = ['air', 'reel', 'jig', 'polka', 'march', 'waltz', 'hornpipe', 'slide', 'song', 'exercise']
const HISTORY_LIMIT = 100
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'
const KEY_NOTES: Record<string, string> = { d: 'D', e: 'E', f: 'F#', g: 'G', a: 'A', b: 'B', c: 'C#' }

export default function TuneEditor() {
  const { tuneId } = useParams()
  const stored = useTune(tuneId)
  const save = useTuneLibrary((s) => s.save)
  const navigate = useNavigate()
  const { t } = useT()
  const [tune, setTune] = useState<Tune | null>(null)
  // ?section=N opens that section (e.g. after appending sections from an import)
  const [searchParams] = useSearchParams()
  const [sectionIdx, setSectionIdx] = useState(() => Math.max(0, Number(searchParams.get('section')) || 0))
  const [sel, setSel] = useState(0)
  // other end of a shift-selection (null = only the marker is selected)
  const [anchor, setAnchor] = useState<number | null>(null)
  const [clipSize, setClipSize] = useState(tabClipboard.size)
  const [mode, setMode] = useState<'visual' | 'text'>('visual')
  const [text, setText] = useState('')
  const [textError, setTextError] = useState<string | null>(null)
  // undo / redo stacks of whole tunes (newest last / next first)
  const [past, setPast] = useState<Tune[]>([])
  const [future, setFuture] = useState<Tune[]>([])
  const { player, state: playState, position } = usePlayer(tune ?? undefined)
  const [dirty, setDirtyState] = useState(false)
  // the ref is read by the navigation blocker, which must see a save made in the same click
  const dirtyRef = useRef(false)
  const setDirty = (value: boolean) => {
    dirtyRef.current = value
    setDirtyState(value)
  }

  // leaving with unsaved changes: ask inside the app (save / don't save / cancel); on reload or
  // closing the tab the browser only allows its own "leave site?" prompt
  const blocker = useBlocker(useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname, []))
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (stored && !tune) setTune(structuredClone(stored))
  }, [stored, tune])

  const section = tune ? tune.sections[Math.min(sectionIdx, tune.sections.length - 1)] : null
  const count = section ? sectionNotes(section).length : 0
  const selIdx = Math.min(sel, Math.max(0, count - 1))
  const note = section ? sectionNotes(section)[selIdx] : undefined
  const lo = Math.min(anchor ?? selIdx, selIdx, Math.max(0, count - 1))
  const hi = Math.min(Math.max(anchor ?? selIdx, selIdx), Math.max(0, count - 1))
  const selCount = hi - lo + 1

  const commit = (next: Tune) => {
    if (tune) setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), tune])
    setFuture([])
    setTune(next)
    setDirty(true)
  }
  const setSection = (s: TuneSection) => tune && commit({ ...tune, sections: tune.sections.map((x, i) => (i === sectionIdx ? s : x)) })
  const undo = () => {
    const prev = past[past.length - 1]
    if (!prev || !tune) return
    setPast(past.slice(0, -1))
    setFuture([tune, ...future])
    setTune(prev)
    setDirty(true)
  }
  const redo = () => {
    const next = future[0]
    if (!next || !tune) return
    setFuture(future.slice(1))
    setPast([...past, tune])
    setTune(next)
    setDirty(true)
  }

  // --- selection of several columns: copy, cut, paste, delete, drag ---
  const select = (from: number, to: number) => {
    setAnchor(from === to ? null : from)
    setSel(to)
  }
  /** Shift+click / Shift+arrow: grow the selection from where it started. */
  const extendTo = (i: number) => {
    if (anchor == null) setAnchor(selIdx)
    setSel(i)
  }
  const copySelection = () => {
    if (!section) return
    tabClipboard.set(sliceClip(section, lo, hi))
    setClipSize(tabClipboard.size)
    toast({ kind: 'info', title: t('editor.copied', { n: selCount }) })
  }
  const deleteSelection = () => {
    if (!section) return
    setSection(removeRange(section, lo, hi))
    select(lo, lo)
  }
  const cutSelection = () => {
    copySelection()
    deleteSelection()
  }
  /** Pasted columns go after the selection and become the new selection. */
  const paste = () => {
    if (!section || !tabClipboard.size) return
    const clip = tabClipboard.get()
    setSection(insertClip(section, hi, clip, true))
    select(hi + 1, hi + clip.notes.length)
  }
  const moveColumns = (target: number, dragged: number) => {
    if (!section) return
    const [from, to] = dragged >= lo && dragged <= hi ? [lo, hi] : [dragged, dragged]
    const moved = moveRange(section, from, to, target)
    if (moved.section === section) return
    setSection(moved.section)
    select(moved.from, moved.to)
  }

  // Ctrl/Cmd shortcuts (useHotkeys skips modified keys); text fields keep their own undo/copy/paste
  const modKeys = useRef<Record<string, () => void>>({})
  useEffect(() => {
    const clipboard: Record<string, () => void> = mode === 'visual' ? { c: copySelection, x: cutSelection, v: paste, a: () => select(0, count - 1) } : {}
    modKeys.current = { ...clipboard, z: undo, 'shift+z': redo, y: redo }
  })
  const editable = tune?.origin === 'user'
  useEffect(() => {
    if (!editable) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      const key = (e.shiftKey ? 'shift+' : '') + e.key.toLowerCase()
      if (key === 'c' && window.getSelection()?.toString()) return
      const run = modKeys.current[key]
      if (!run) return
      e.preventDefault()
      run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editable])

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
          ArrowRight: (e) => (e.shiftKey ? extendTo(Math.min(count - 1, selIdx + 1)) : select(Math.min(count - 1, selIdx + 1), Math.min(count - 1, selIdx + 1))),
          ArrowLeft: (e) => (e.shiftKey ? extendTo(Math.max(0, selIdx - 1)) : select(Math.max(0, selIdx - 1), Math.max(0, selIdx - 1))),
          Delete: deleteSelection,
          Backspace: deleteSelection,
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

  /** Same tab on a whistle in another key: fingerings stay, every note moves by the interval. */
  const changeWhistleKey = (whistleId: string) => {
    const shift = getWhistle(whistleId).baseMidi - getWhistle(tune.whistle).baseMidi
    commit(changeWhistle(tune, whistleId))
    if (shift) toast({ kind: 'info', title: t('editor.whistleChanged', { whistle: getWhistle(whistleId).label, shift: shift > 0 ? `+${shift}` : String(shift) }) })
  }

  /** Resolves true once the tune is stored. */
  const doSave = async () => {
    if (!(await save(tune))) return false
    setDirty(false)
    toast({ kind: 'info', title: t('editor.saved') })
    return true
  }

  const addSection = () => {
    const s: TuneSection = { id: `s${Date.now().toString(36)}`, name: `${t('import.section')} ${tune.sections.length + 1}`, phrases: [[{ pitch: 74, beats: 1, attack: 'tongue' }]] }
    commit({ ...tune, sections: [...tune.sections, s] })
    setSectionIdx(tune.sections.length)
    select(0, 0)
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
            <IconButton icon="undo" label={`${t('editor.undo')} (${MOD}+Z)`} onClick={undo} disabled={!past.length} />
            <IconButton icon="redo" label={`${t('editor.redo')} (${MOD}+Shift+Z)`} onClick={redo} disabled={!future.length} />
            <Button icon="check" onClick={doSave} variant={dirty ? 'primary' : 'secondary'}>
              {t('editor.save')}
            </Button>
          </>
        }
      />

      <Card className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft" title={t('editor.whistleHint')}>
          {t('editor.whistle')}
          <select value={tune.whistle} onChange={(e) => changeWhistleKey(e.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3 text-ink">
            {WHISTLE_KEYS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tune.sections.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSectionIdx(i)
              select(0, 0)
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
        <ButtonLink to={`/tunes/${tune.id}/add-section`} size="sm" variant="ghost" icon="upload">
          {t('editor.importSection')}
        </ButtonLink>
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
                  range={[lo, hi]}
                  onMove={moveColumns}
                  onSelect={(i, extend) => {
                    if (extend) return extendTo(i)
                    // tapping the marker again plays from it; tapping another note moves the marker
                    if (i === selIdx && anchor == null) playFromMarker()
                    else {
                      select(i, i)
                      if (playing) player.stop()
                    }
                  }}
                />
              </div>
              <p className="text-xs text-ink-faint">{t('editor.dragHint')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <IconButton icon="undo" label={`${t('editor.undo')} (${MOD}+Z)`} onClick={undo} disabled={!past.length} size={36} />
                <IconButton icon="redo" label={`${t('editor.redo')} (${MOD}+Shift+Z)`} onClick={redo} disabled={!future.length} size={36} />
                <span className="mr-1 text-sm text-ink-soft tabular-nums">{t('editor.selected', { n: selCount })}</span>
                <Button size="sm" variant="secondary" icon="file" onClick={copySelection}>
                  {t('editor.copy')}
                </Button>
                <Button size="sm" variant="secondary" icon="split" onClick={cutSelection}>
                  {t('editor.cut')}
                </Button>
                <Button size="sm" variant="secondary" icon="download" onClick={paste} disabled={!clipSize} title={clipSize ? t('editor.pasteHint', { n: clipSize }) : undefined}>
                  {clipSize ? `${t('editor.paste')} · ${clipSize}` : t('editor.paste')}
                </Button>
                <Button size="sm" variant="ghost" icon="trash" onClick={deleteSelection}>
                  {t('editor.deleteNotes')}
                </Button>
              </div>
              <Shortcuts
                items={[
                  [['Space'], 'sc.editorPlay'],
                  [['Esc'], 'sc.stop'],
                  [['←', '→'], 'sc.select'],
                  [['Shift', '←', '→'], 'sc.extendSelection'],
                  [[MOD, 'C'], 'sc.copy'],
                  [[MOD, 'X'], 'sc.cut'],
                  [[MOD, 'V'], 'sc.paste'],
                  [['D', 'E', 'F', 'G', 'A', 'B', 'C'], 'sc.setNote'],
                  [['1', '4'], 'sc.beats'],
                  [['Enter'], 'sc.insert'],
                  [['Del'], 'sc.remove'],
                  [[MOD, 'Z'], 'sc.undo'],
                  [[MOD, 'Shift', 'Z'], 'sc.redo'],
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
              onDelete={deleteSelection}
              startsPhrase={phrase > 0 && locate(section, selIdx).offset === 0}
              startsLine={phrase > 0 && !!section.lineBreaks?.includes(phrase)}
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
            if (await doSave()) navigate(`/tunes/${tune.id}`)
          }}
        >
          {t('editor.saveClose')}
        </Button>
      </div>
      <Modal open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title={t('editor.unsavedTitle')}>
        <p className="mb-6 text-ink-soft">{t('editor.unsavedBody')}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => blocker.reset?.()}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDirty(false)
              blocker.proceed?.()
            }}
          >
            {t('editor.unsavedDiscard')}
          </Button>
          <Button
            icon="check"
            onClick={async () => {
              if (await doSave()) blocker.proceed?.()
              else blocker.reset?.()
            }}
          >
            {t('editor.unsavedSave')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
