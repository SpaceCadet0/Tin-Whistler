import { useEffect, useMemo, useState } from 'react'
import { whistleSynth } from '../../audio/WhistleSynth'
import type { ExerciseResult } from '../../engine/lesson/types'
import { useNoteHold } from '../../hooks/useNoteHold'
import { useT } from '../../i18n'
import { noteById } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSession } from '../../state/session'
import { MicControl } from '../../ui/feedback/MicControl'
import { Button, cn, ProgressBar } from '../../ui/primitives'
import { FingeringColumn } from '../../ui/whistle/FingeringColumn'
import { Celebrate } from './shared'
import { StepActions } from './StepActions'

function pick(choices: string[], avoid?: string): string {
  const pool = choices.length > 1 ? choices.filter((c) => c !== avoid) : choices
  return pool[Math.floor(Math.random() * pool.length)]
}

function PlayBack({ note, onDone }: { note: string; onDone: () => void }) {
  const { t } = useT()
  const n = noteById(note)!
  const { micWanted, setMicWanted } = useSession()
  const [ok, setOk] = useState(false)
  const hold = useNoteHold({ target: n.midi, holdMs: 500, enabled: micWanted && !ok, onEvent: (e) => e.kind === 'success' && setOk(true) })
  useEffect(() => {
    if (ok) {
      const id = window.setTimeout(onDone, 700)
      return () => window.clearTimeout(id)
    }
  }, [ok, onDone])
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface-2 p-5">
      <p className="text-lg font-semibold">{ok ? t('ex.great') : t('ear.nowPlay', { note })}</p>
      {!ok && (
        <>
          <MicControl enabled={micWanted} onChange={setMicWanted} status={hold.status} level={hold.frame?.level ?? 0} />
          <ProgressBar value={hold.progress} tone="good" />
          <Button variant="ghost" size="sm" onClick={onDone}>
            {t('ex.skip')}
          </Button>
        </>
      )}
    </div>
  )
}

/** Hear a note → pick it → (optionally) play it back. */
export function EarQuiz({ choices, rounds, playBack, onComplete }: { choices: string[]; rounds: number; playBack?: boolean; onComplete: (r: ExerciseResult) => void }) {
  const { t } = useT()
  const recordEar = useProgress((s) => s.recordEar)
  const [round, setRound] = useState(0)
  const [target, setTarget] = useState(() => pick(choices))
  const [answer, setAnswer] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [phase, setPhase] = useState<'ask' | 'answered' | 'playback'>('ask')
  const sorted = useMemo(() => [...choices].sort((a, b) => noteById(a)!.midi - noteById(b)!.midi), [choices])
  const finished = round >= rounds

  const play = (id = target) => whistleSynth.playNote(noteById(id)!.midi, 1.1)

  useEffect(() => {
    if (!finished && phase === 'ask') {
      const timer = window.setTimeout(() => play(), 350)
      return () => window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, finished])

  const choose = (c: string) => {
    if (phase !== 'ask') return
    const ok = c === target
    setAnswer(c)
    setPhase('answered')
    recordEar(ok)
    if (ok) setCorrect((n) => n + 1)
    else setMissed((m) => [...m, target])
  }

  const next = () => {
    setRound((r) => r + 1)
    setTarget((prev) => pick(choices, prev))
    setAnswer(null)
    setPhase('ask')
  }

  if (finished) {
    return (
      <>
        <Celebrate title={t('ear.result', { correct, total: rounds })} />
        <StepActions>
          <Button size="lg" iconRight="next" onClick={() => onComplete({ score: correct / rounds, missedNotes: missed })} autoFocus>
            {t('ex.continue')}
          </Button>
        </StepActions>
      </>
    )
  }

  const tMidi = noteById(target)!.midi
  const aMidi = answer ? noteById(answer)!.midi : 0
  const explain =
    answer == null
      ? ''
      : answer === target
        ? t('ear.explainCorrect', { note: target })
        : t(tMidi > aMidi ? 'ear.explainHigher' : 'ear.explainLower', { a: target, b: answer })

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-4 sm:gap-6">
      <p className="text-sm font-semibold text-ink-soft">{t('ear.round', { n: round + 1, of: rounds })}</p>
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t('ear.question')}</h2>
      <Button variant="secondary" size="lg" icon="volume" onClick={() => play()}>
        {t('ear.playAgain')}
      </Button>
      <div className="grid w-full max-w-lg grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3" role="group" aria-label={t('ear.choices')}>
        {sorted.map((c) => {
          const isTarget = phase !== 'ask' && c === target
          const isWrong = phase !== 'ask' && c === answer && c !== target
          return (
            <button
              key={c}
              type="button"
              onClick={() => choose(c)}
              disabled={phase !== 'ask'}
              className={cn(
                'flex h-14 flex-col items-center justify-center rounded-3xl border-2 font-display text-3xl font-semibold transition sm:h-20',
                isTarget ? 'border-good bg-good-soft text-good' : isWrong ? 'border-bad bg-bad-soft text-bad' : 'border-line bg-surface hover:border-moss',
              )}
            >
              {c}
              {isTarget && <span className="text-xs font-sans font-bold">✓</span>}
              {isWrong && <span className="text-xs font-sans font-bold">✗</span>}
            </button>
          )
        })}
      </div>
      {/* reserved from the start so the choices don't move when the answer is explained */}
      <div className="flex min-h-20 w-full max-w-lg flex-col items-center justify-center sm:min-h-24">
        {phase !== 'ask' && (
          <div className="flex w-full animate-fade-up flex-col items-center gap-3 text-center" role="status">
            <div className="flex items-center gap-4">
              <FingeringColumn fingering={noteById(target)!.fingering} dot={14} />
              <p className="text-lg">{explain}</p>
            </div>
            {answer !== target && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon="volume" onClick={() => play(target)}>
                  {target}
                </Button>
                <Button size="sm" variant="secondary" icon="volume" onClick={() => play(answer!)}>
                  {answer}
                </Button>
              </div>
            )}
            {phase === 'playback' && <PlayBack note={target} onDone={next} />}
          </div>
        )}
      </div>
      {phase === 'answered' && (
        <StepActions>
          <Button size="lg" iconRight="next" onClick={() => (playBack ? setPhase('playback') : next())} autoFocus>
            {playBack ? t('ear.playIt') : t('ex.next')}
          </Button>
        </StepActions>
      )}
    </div>
  )
}
