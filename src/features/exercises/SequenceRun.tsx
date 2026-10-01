import { useEffect, useRef, useState } from 'react'
import { whistleSynth } from '../../audio/WhistleSynth'
import type { HoldEvent } from '../../engine/scoring/noteHold'
import { useNoteHold } from '../../hooks/useNoteHold'
import { useT } from '../../i18n'
import { noteById, whistleLabel } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSession } from '../../state/session'
import { MicControl } from '../../ui/feedback/MicControl'
import { Icon } from '../../ui/Icon'
import { Button, cn } from '../../ui/primitives'
import { FingeringColumn } from '../../ui/whistle/FingeringColumn'
import { WhistleView } from '../../ui/whistle/WhistleView'

export interface SequenceOutcome {
  correct: number
  total: number
  missed: string[]
}

/** Play notes in order: D → E → G → A. Each note must be held briefly to count. */
export function SequenceRun({ notes, onFinish }: { notes: string[]; onFinish: (o: SequenceOutcome) => void }) {
  const { t } = useT()
  const { micWanted, setMicWanted } = useSession()
  const recordNote = useProgress((s) => s.recordNote)
  const recordTransition = useProgress((s) => s.recordTransition)
  const [index, setIndex] = useState(0)
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const finished = index >= notes.length
  const current = noteById(notes[Math.min(index, notes.length - 1)])!
  const prev = index > 0 ? noteById(notes[index - 1]) : undefined
  const reported = useRef(false)

  const onEvent = (e: HoldEvent) => {
    if (finished) return
    const id = notes[index]
    if (e.kind === 'success') {
      const hit = !missed.has(index)
      recordNote(id, hit, e.cents)
      if (index > 0) recordTransition(notes[index - 1], id, hit)
      setIndex((i) => i + 1)
    } else if (!missed.has(index)) {
      setMissed((m) => new Set(m).add(index))
    }
  }
  const hold = useNoteHold({ target: current.midi, holdMs: 220, enabled: micWanted && !finished, onEvent })

  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true
      onFinish({ correct: notes.length - missed.size, total: notes.length, missed: [...missed].map((i) => notes[i]) })
    }
  }, [finished, missed, notes, onFinish])

  const demo = () => whistleSynth.playSequence(notes.map((n) => ({ midi: noteById(n)!.midi, duration: 0.55 })))

  return (
    <div className="flex flex-col items-center gap-6">
      <ol className="flex flex-wrap items-end justify-center gap-2 sm:gap-3" aria-label={t('seq.notes')}>
        {notes.map((n, i) => {
          const state = i < index ? (missed.has(i) ? 'wrong' : 'right') : i === index ? 'current' : 'idle'
          return (
            <li
              key={i}
              aria-current={i === index ? 'step' : undefined}
              className={cn(
                'flex min-w-14 flex-col items-center gap-2 rounded-2xl px-2 py-3 transition',
                i === index && 'bg-moss-soft ring-2 ring-moss',
              )}
            >
              <span className={cn('font-display text-3xl font-semibold', state === 'right' && 'text-good', state === 'wrong' && 'text-bad', state === 'idle' && 'text-ink-faint')}>
                {n}
              </span>
              <FingeringColumn fingering={noteById(n)!.fingering} register={noteById(n)!.register} dot={11} state={state === 'current' ? 'current' : state === 'idle' ? 'dim' : state} />
              <span className="h-4 text-sm font-bold" aria-hidden="true">
                {state === 'right' ? '✓' : state === 'wrong' ? '✗' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      {!finished && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-10">
          <WhistleView fingering={current.fingering} from={prev?.fingering} height={300} label={t('whistle.fingeringFor', { note: current.id })} />
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-bold tracking-[0.2em] text-ink-soft uppercase">{t('seq.playNow')}</p>
            <p className="font-display text-7xl font-semibold">{current.id}</p>
            <p className={cn('flex items-center gap-2 font-semibold', hold.match.status === 'correct' ? 'text-good' : 'text-ink-soft')} role="status">
              {hold.match.status === 'correct' ? <Icon name="check" size={18} /> : null}
              {hold.frame?.voiced && hold.frame.note != null ? t('seq.hearing', { note: whistleLabel(hold.frame.note) }) : t('fb.silent')}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <MicControl enabled={micWanted} onChange={setMicWanted} status={hold.status} level={hold.frame?.level ?? 0} />
        <Button variant="secondary" icon="volume" onClick={demo}>
          {t('ex.listen')}
        </Button>
        {!finished && (
          <Button variant="ghost" onClick={() => setIndex((i) => i + 1)}>
            {t('seq.skipNote')}
          </Button>
        )}
      </div>
    </div>
  )
}
