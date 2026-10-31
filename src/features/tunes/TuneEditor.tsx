import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams, useSearchParams, type BlockerFunction } from 'react-router-dom'
import { whistleSynth } from '../../audio/WhistleSynth'
import { sectionName, useT } from '../../i18n'
import { hasKeyboard, isNativeApp, MOD_KEY as MOD } from '../../lib/platform'
import { toast } from '../../lib/toast'
import { changeWhistle, insertClip, insertNote, locate, moveRange, removeRange, sliceClip, togglePhraseBreak, toggleLineBreak, updateNote } from '../../music/editing'
import { parseTabText, sectionToTabText } from '../../music/tabText'
import { autoSection, sectionNotes } from '../../music/tune'
import { TUNE_TYPES, type Tune, type TuneNote, type TuneSection, type TuneType } from '../../music/types'
import { getWhistle, WHISTLE_KEYS } from '../../music/whistles'
import { usePlayer } from '../../hooks/audio'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useProgress } from '../../state/progress'
import { useTune, useTuneLibrary } from '../../state/tunes'
import { Button, ButtonLink, Card, cn, IconButton, Modal, PageHeader, Segmented } from '../../ui/primitives'
import { Select } from '../../ui/Select'
import { TabView } from '../../ui/whistle/TabView'
import { tabClipboard } from './editor/clipboard'
import { doubleBeats, editorKey, halveBeats, pitchForLetter, setRing, toggleAccidental, toggleDot, toggleOrnament, type EditorKey } from './editor/keyboard'
import { KeyboardGuide } from './editor/KeyboardGuide'
import { NoteInspector } from './editor/NoteInspector'

const HISTORY_LIMIT = 100
/** The keyboard guide opens by itself once per browser. */
const GUIDE_SEEN_KEY = 'tw.editorGuideSeen'
/** Length of the preview sound when a note is typed, seconds. */
const TYPED_NOTE_SEC = 0.35
/** A long note changed in the editor is heard for at most this long. */
const MAX_AUDITION_SEC = 4

const guideSeen = (): boolean => {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export default function TuneEditor() {
  const { tuneId } = useParams()
  const stored = useTune(tuneId)
  const save = useTuneLibrary((s) => s.save)
  const recordEdit = useProgress((s) => s.recordEdit)
  const navigate = useNavigate()
  const { t, lang } = useT()
  const [tune, setTune] = useState<Tune | null>(null)
  // ?section=N opens that section (e.g. after appending sections from an import)
  const [searchParams] = useSearchParams()
  const [sectionIdx, setSectionIdx] = useState(() => Math.max(0, Number(searchParams.get('section')) || 0))
  const [sel, setSel] = useState(0)
  // other end of a shift-selection (null = only the marker is selected)
  const [anchor, setAnchor] = useState<number | null>(null)
  // keyboard entry: the note just typed (lengths and ornaments go to it) and whether the next
  // typed note is appended after the last one
  const [typing, setTyping] = useState<{ index: number; append: boolean } | null>(null)
  // keyboard guide: web only (the Android app has no keyboard), opens by itself the first time
  const showGuide = !isNativeApp()
  const [guideOpen, setGuideOpen] = useState(() => showGuide && hasKeyboard() && !guideSeen())
  const closeGuide = () => {
    setGuideOpen(false)
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, '1')
    } catch {
      // private mode: the guide just opens again next time
    }
  }
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
    setTyping(null)
  }
  /** Shift+click / Shift+arrow: grow the selection from where it started. */
  const extendTo = (i: number) => {
    if (anchor == null) setAnchor(selIdx)
    setSel(i)
    setTyping(null)
  }
  const copySelection = () => {
    if (!section) return
    tabClipboard.set(sliceClip(section, lo, hi))
    setClipSize(tabClipboard.size)
    toast({ kind: 'info', title: t('editor.copied', { n: selCount }) })
  }
  /** The marker stays where the deleted notes were: on the note that moved up, or the empty slot at the end. */
  const deleteSelection = () => {
    if (!section) return
    const next = removeRange(section, lo, hi)
    const left = sectionNotes(next).length
    setSection(next)
    if (lo < left) return select(lo, lo)
    setAnchor(null)
    setSel(left - 1)
    setTyping({ index: left, append: true })
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

  // --- keyboard entry (scheme in editor/keyboard.ts) ---
  /** A typed note fills the marker and the marker moves on; past the last note, notes are appended. */
  const enterPitch = (pitch: number | null) => {
    if (!section || !note) return
    if (pitch != null && playState === 'stopped') whistleSynth.playNote(pitch, TYPED_NOTE_SEC)
    setAnchor(null)
    if (typing?.append) {
      setSection(insertNote(section, selIdx, { pitch, beats: note.beats, attack: 'tongue' }, true))
      setSel(selIdx + 1)
      setTyping({ index: selIdx + 1, append: true })
      return
    }
    setSection(updateNote(section, selIdx, { ...note, pitch, fingering: undefined }))
    const last = selIdx >= count - 1
    if (!last) setSel(selIdx + 1)
    setTyping({ index: selIdx, append: last })
  }
  /** Hear a note as written: its length at the tune's tempo, its attack (not while the tune plays). */
  const audition = (n: TuneNote) => {
    if (!tune || n.pitch == null || playState !== 'stopped') return
    const seconds = Math.min(MAX_AUDITION_SEC, (n.beats * 60) / tune.bpm)
    whistleSynth.playNote(n.pitch, seconds, { attack: n.attack ?? 'tongue', stop: n.stop, ornament: n.ornament, fingering: n.fingering })
  }
  /** A new pitch, length or articulation is played at once, keys or mouse alike. */
  const auditionChange = (before: TuneNote, after: TuneNote) => {
    if (before.pitch !== after.pitch || before.beats !== after.beats || before.attack !== after.attack || before.stop !== after.stop) audition(after)
  }
  /** Lengths, articulation and ornaments go to the note just typed, otherwise to the marker. */
  const editTarget = (change: (n: TuneNote) => TuneNote) => {
    if (!section) return
    const i = typing && typing.index < count ? typing.index : selIdx
    const n = sectionNotes(section)[i]
    if (!n) return
    const next = change(n)
    setSection(updateNote(section, i, next))
    auditionChange(n, next)
  }
  /** The empty slot after the last note: the next typed note is added there. */
  const atEnd = typing?.append === true
  const toEnd = () => {
    setAnchor(null)
    setSel(count - 1)
    setTyping({ index: count, append: true })
  }
  const onEditorKey = (k: EditorKey) => {
    if (!tune) return
    switch (k.kind) {
      case 'note': {
        const pitch = pitchForLetter(k.letter, k.upper, tune.whistle)
        if (pitch != null) enterPitch(pitch)
        return
      }
      case 'rest':
        return enterPitch(null)
      case 'natural':
        return editTarget((n) => (n.pitch == null ? n : { ...n, pitch: toggleAccidental(n.pitch, tune.whistle), fingering: undefined }))
      case 'beats':
        return editTarget((n) => ({ ...n, beats: k.beats }))
      case 'halve':
        return editTarget((n) => ({ ...n, beats: halveBeats(n.beats) }))
      case 'double':
        return editTarget((n) => ({ ...n, beats: doubleBeats(n.beats) }))
      case 'dot':
        return editTarget((n) => ({ ...n, beats: toggleDot(n.beats) }))
      case 'attack':
        return editTarget((n) => ({ ...n, attack: k.attack }))
      case 'stop':
        return editTarget((n) => ({ ...n, stop: n.stop ? undefined : true }))
      case 'ornament':
        return editTarget((n) => toggleOrnament(n, k.ornament))
      case 'ring':
        return editTarget((n) => setRing(n, k.hole))
    }
  }
  const editorKeyRef = useRef(onEditorKey)
  useEffect(() => {
    editorKeyRef.current = onEditorKey
  })
  const typingActive = mode === 'visual' && tune?.origin === 'user'
  useEffect(() => {
    if (!typingActive) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      // a dialog (unsaved changes, the guide) is open: keys belong to it
      if (document.querySelector('dialog[open]')) return
      const k = editorKey(e)
      if (!k) return
      e.preventDefault()
      editorKeyRef.current(k)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typingActive])

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
      // by physical key, so the shortcuts also work with a Russian layout
      const key = (e.shiftKey ? 'shift+' : '') + (e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase())
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
  /** Where the last play started: stopping with Space brings the marker back there. */
  const playStart = useRef(0)
  const playFromMarker = () => {
    if (!tune || !count) return
    playStart.current = selIdx
    player.setOptions({ tempo: 1, countIn: 0, melody: true, repeat: false })
    player.play(firstInSection + selIdx, firstInSection + count - 1)
  }
  const playing = playState !== 'stopped'
  /** Space: play from the marker; again while it sounds: stop, the marker back where the play began. */
  const togglePlay = () => {
    if (!playing) return playFromMarker()
    player.stop()
    select(playStart.current, playStart.current)
  }
  const playhead = playing && position ? position.index - firstInSection : null

  useHotkeys(
    section && note && tune
      ? {
          ArrowRight: (e) => {
            if (e.shiftKey) return extendTo(Math.min(count - 1, selIdx + 1))
            // past the last note: the empty slot where the next note goes
            if (selIdx >= count - 1) return toEnd()
            select(selIdx + 1, selIdx + 1)
          },
          ArrowLeft: (e) => {
            if (e.shiftKey) return extendTo(Math.max(0, selIdx - 1))
            const to = atEnd ? selIdx : Math.max(0, selIdx - 1)
            select(to, to)
          },
          Delete: deleteSelection,
          Backspace: deleteSelection,
          Enter: () => {
            setSection(insertNote(section, selIdx, { ...note }, true))
            select(selIdx + 1, selIdx + 1)
          },
          ' ': togglePlay,
          Escape: () => player.stop(),
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
    recordEdit()
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

      {/* BPM and difficulty are short numbers: their columns are narrow so long type names ("Медленная мелодия") fit */}
      <Card className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1.2fr)]">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          {t('import.name')}
          <input value={tune.title} onChange={(e) => commit({ ...tune, title: e.target.value })} className="h-11 rounded-xl border border-line bg-surface px-3 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          {t('editor.type')}
          <Select<TuneType> value={tune.type} onChange={(type) => commit({ ...tune, type })} options={TUNE_TYPES.map((x) => ({ value: x, label: t(`tuneType.${x}`) }))} />
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
          <Select value={tune.whistle} onChange={changeWhistleKey} options={WHISTLE_KEYS.map((w) => ({ value: w.id, label: w.label }))} />
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
            {sectionName(s.name, lang)}
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
              value={sectionName(section.name, lang)}
              onChange={(e) => setSection({ ...section, name: e.target.value })}
              aria-label={t('editor.sectionName')}
              className="h-10 rounded-xl border border-transparent bg-transparent px-2 font-display text-xl font-semibold hover:border-line focus:border-moss"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant={playing ? 'danger' : 'secondary'} icon={playing ? 'stop' : 'play'} onClick={togglePlay} title={t('editor.playHint')}>
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
              {showGuide && <IconButton icon="keyboard" label={t('guide.open')} onClick={() => setGuideOpen(true)} size={36} />}
              {tune.sections.length > 1 && <IconButton icon="trash" label={t('editor.deleteSection')} onClick={removeSection} size={36} />}
            </div>
          </div>
          {mode === 'visual' ? (
            <>
              {/* padding keeps the selection ring inside the scroll box, which clips it otherwise */}
              <div className="-m-1 overflow-x-auto p-1">
                <TabView
                  tune={tune}
                  section={section}
                  selected={atEnd ? null : selIdx}
                  appendSlot={atEnd}
                  current={playhead}
                  range={[lo, hi]}
                  onMove={moveColumns}
                  onSelect={(i, extend) => {
                    if (i >= count) return toEnd()
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
              <div className="flex flex-wrap items-center gap-2">
                <IconButton icon="undo" label={`${t('editor.undo')} (${MOD}+Z)`} onClick={undo} disabled={!past.length} size={36} />
                <IconButton icon="redo" label={`${t('editor.redo')} (${MOD}+Shift+Z)`} onClick={redo} disabled={!future.length} size={36} />
                <span className="mr-1 text-sm text-ink-soft tabular-nums">{t('editor.selected', { n: selCount })}</span>
                <Button size="sm" variant="secondary" icon="copy" onClick={copySelection}>
                  {t('editor.copy')}
                </Button>
                <Button size="sm" variant="secondary" icon="cut" onClick={cutSelection}>
                  {t('editor.cut')}
                </Button>
                <Button size="sm" variant="secondary" icon="paste" onClick={paste} disabled={!clipSize} title={clipSize ? t('editor.pasteHint', { n: clipSize }) : undefined}>
                  {clipSize ? `${t('editor.paste')} · ${clipSize}` : t('editor.paste')}
                </Button>
                <Button size="sm" variant="ghost" icon="trash" onClick={deleteSelection}>
                  {t('editor.deleteNotes')}
                </Button>
              </div>
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
              onChange={(n) => {
                // on the empty slot a picked note (or rest) fills the slot, not the note before it
                if (atEnd && n.pitch !== note.pitch) return enterPitch(n.pitch)
                setSection(updateNote(section, selIdx, n))
                auditionChange(note, n)
              }}
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
      {showGuide && <KeyboardGuide open={guideOpen} onClose={closeGuide} />}
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
