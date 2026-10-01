import { whistleSynth } from '../../../audio/WhistleSynth'
import { useT } from '../../../i18n'
import { fingeringsEqual } from '../../../music/fingerings'
import { noteFingering } from '../../../music/ornaments'
import type { Attack, Fingering, HoleState, OrnamentType, Register, TuneNote } from '../../../music/types'
import { fingeringForMidi, midiForFingering, whistleLabel, whistleNotes } from '../../../music/whistles'
import { Button, cn, Segmented } from '../../../ui/primitives'
import { WhistleView } from '../../../ui/whistle/WhistleView'

const DURATIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
const ORNS: (OrnamentType | 'none')[] = ['none', 'cut', 'bounce', 'slide', 'roll']

interface Props {
  note: TuneNote
  whistleId: string
  onChange: (n: TuneNote) => void
  onInsert: (after: boolean) => void
  onDelete: () => void
  onBreakPhrase: () => void
  onBreakLine: () => void
}

export function NoteInspector({ note, whistleId, onChange, onInsert, onDelete, onBreakPhrase, onBreakLine }: Props) {
  const { t } = useT()
  const fg = note.pitch != null ? noteFingering(note.pitch, note.fingering, whistleId) : undefined
  const register: Register = fg?.register ?? 1

  const setPitch = (pitch: number | null, fingering?: Fingering) => {
    const next: TuneNote = { ...note, pitch }
    if (pitch == null) delete next.fingering
    else if (fingering) {
      const std = fingeringForMidi(Math.round(pitch), whistleId)
      if (std && fingeringsEqual(std.fingering, fingering) && Math.abs(pitch - Math.round(pitch)) < 0.01) delete next.fingering
      else next.fingering = fingering
    } else delete next.fingering
    onChange(next)
    if (pitch != null) whistleSynth.playNote(pitch, 0.5)
  }

  const toggleHole = (i: number) => {
    const cur = fg?.fingering ?? ([1, 1, 1, 1, 1, 1] as Fingering)
    const h = [...cur] as HoleState[]
    h[i] = cur[i] === 1 ? 0 : cur[i] === 0 ? 0.5 : 1
    const f = h as unknown as Fingering
    setPitch(midiForFingering(f, register, whistleId), f)
  }

  const setRegister = (r: Register) => {
    if (!fg) return
    setPitch(midiForFingering(fg.fingering, r, whistleId), fg.fingering)
  }

  const setOrnament = (type: OrnamentType | 'none') => {
    const next = { ...note }
    if (type === 'none') delete next.ornament
    else next.ornament = { ...note.ornament, type }
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        {fg ? (
          <WhistleView fingering={fg.fingering} interactive onToggle={toggleHole} ornamentHole={note.ornament?.hole ? note.ornament.hole - 1 : undefined} height={250} showHands={false} label={t('whistle.tapToCover')} />
        ) : (
          <div className="grid h-[250px] w-20 place-items-center rounded-2xl bg-surface-2 text-ink-faint">𝄽</div>
        )}
        <div className="flex flex-1 flex-col gap-3">
          <p className="font-display text-5xl font-semibold">{note.pitch != null ? whistleLabel(note.pitch, whistleId) : t('tab.rest')}</p>
          <Segmented
            size="sm"
            label={t('editor.register')}
            value={register}
            onChange={setRegister}
            options={[
              { value: 1, label: t('editor.low') },
              { value: 2, label: t('editor.high') },
            ]}
          />
          <div className="flex flex-wrap gap-1">
            {whistleNotes(whistleId)
              .filter((n) => !n.chromatic || n.name === 'C')
              .map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setPitch(n.midi)}
                  className={cn('h-9 min-w-9 rounded-xl px-2 text-sm font-semibold', note.pitch != null && Math.round(note.pitch) === n.midi ? 'bg-moss text-on-moss' : 'bg-surface-2')}
                >
                  {n.id}
                </button>
              ))}
            <button type="button" onClick={() => setPitch(null)} className={cn('h-9 rounded-xl px-2 text-sm font-semibold', note.pitch == null ? 'bg-moss text-on-moss' : 'bg-surface-2')}>
              {t('tab.rest')}
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink-soft">{t('editor.length')}</p>
        <div className="flex flex-wrap items-center gap-1">
          {DURATIONS.map((d) => (
            <button key={d} type="button" onClick={() => onChange({ ...note, beats: d })} className={cn('h-9 min-w-10 rounded-xl px-2 text-sm font-semibold tabular', Math.abs(note.beats - d) < 1e-6 ? 'bg-moss text-on-moss' : 'bg-surface-2')}>
              {d}
            </button>
          ))}
          <input
            type="number"
            min={0.0625}
            step={0.0625}
            value={Number(note.beats.toFixed(4))}
            onChange={(e) => onChange({ ...note, beats: Math.max(0.0625, Number(e.target.value) || 1) })}
            aria-label={t('editor.beats')}
            className="h-9 w-20 rounded-xl border border-line bg-surface px-2 text-sm"
          />
          <span className="text-sm text-ink-soft">{t('editor.beats')}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Segmented<Attack>
          size="sm"
          label={t('editor.attack')}
          value={note.attack ?? 'tongue'}
          onChange={(a) => onChange({ ...note, attack: a })}
          options={[
            { value: 'tongue', label: 't' },
            { value: 'ru', label: 'r' },
            { value: 'slur', label: '-' },
          ]}
        />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={!!note.stop} onChange={(e) => onChange({ ...note, stop: e.target.checked || undefined })} className="h-5 w-5 accent-[var(--c-moss)]" />
          {t('editor.stop')}
        </label>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink-soft">{t('editor.ornament')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" label={t('editor.ornament')} value={note.ornament?.type ?? 'none'} onChange={setOrnament} options={ORNS.map((o) => ({ value: o, label: o === 'none' ? '-' : t(`orn.${o}`) }))} />
          {note.ornament && (
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
              {t('editor.hole')}
              <select
                value={note.ornament.hole ?? ''}
                onChange={(e) => onChange({ ...note, ornament: { ...note.ornament!, hole: e.target.value ? Number(e.target.value) : undefined } })}
                className="h-9 rounded-xl border border-line bg-surface px-2 text-ink"
              >
                <option value="">{t('editor.auto')}</option>
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          )}
          {note.pitch != null && (
            <Button size="sm" variant="ghost" icon="volume" onClick={() => whistleSynth.playNote(note.pitch!, Math.max(0.4, note.beats * 0.6), { ornament: note.ornament, fingering: note.fingering })}>
              {t('ex.listen')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button size="sm" variant="secondary" icon="plus" onClick={() => onInsert(false)}>
          {t('editor.insertBefore')}
        </Button>
        <Button size="sm" variant="secondary" icon="plus" onClick={() => onInsert(true)}>
          {t('editor.insertAfter')}
        </Button>
        <Button size="sm" variant="secondary" icon="split" onClick={onBreakPhrase}>
          {t('editor.breakPhrase')}
        </Button>
        <Button size="sm" variant="secondary" icon="menu" onClick={onBreakLine}>
          {t('editor.breakLine')}
        </Button>
        <Button size="sm" variant="danger" icon="trash" onClick={onDelete}>
          {t('editor.deleteNote')}
        </Button>
      </div>
    </div>
  )
}
