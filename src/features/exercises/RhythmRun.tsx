import { useEffect, useRef, useState } from 'react'
import { audioEngine } from '../../audio/AudioEngine'
import { metronome } from '../../audio/Metronome'
import { pitchTracker } from '../../audio/PitchTracker'
import { scoreRhythm, type RhythmReport } from '../../engine/scoring/rhythm'
import { usePitch, useRaf } from '../../hooks/audio'
import { useT, type MessageKey } from '../../i18n'
import { noteById } from '../../music/whistles'
import { useSession } from '../../state/session'
import { useSettings } from '../../state/settings'
import { BeatIndicator } from '../../ui/feedback/Feedback'
import { MicControl } from '../../ui/feedback/MicControl'
import { Button, Chip, cn } from '../../ui/primitives'
import { FingeringColumn } from '../../ui/whistle/FingeringColumn'
import { StepActions } from './StepActions'

const VERDICT: Record<string, MessageKey> = { perfect: 'rhythm.perfect', early: 'rhythm.early', late: 'rhythm.late', missed: 'rhythm.missed' }

interface Props {
  note: string
  bpm: number
  pattern: (number | null)[]
  bars: number
  onFinish: (r: RhythmReport) => void
  /** Look of the Start / Try again button (the caller makes it quieter when something else is the main action). */
  startVariant?: 'primary' | 'secondary'
}

/** Play on the beat: count-in, metronome, beat dots, then per-note timing feedback. */
export function RhythmRun({ note, bpm, pattern, bars, onFinish, startVariant = 'primary' }: Props) {
  const { t } = useT()
  const { micWanted, setMicWanted } = useSession()
  const latencyMs = useSettings((s) => s.latencyMs)
  const n = noteById(note)!
  const [phase, setPhase] = useState<'idle' | 'count' | 'run' | 'done'>('idle')
  const [step, setStep] = useState<number | null>(null)
  const [report, setReport] = useState<RhythmReport | null>(null)
  const plan = useRef<{ onsets: number[]; start: number; end: number; beatTimes: number[] } | null>(null)
  const { frame, status } = usePitch(micWanted)
  const spb = 60 / bpm
  const countIn = 4

  const steps = Array.from({ length: bars }, () => pattern).flat()
  const stepBeats = steps.map((b) => Math.abs(b ?? 1))

  const start = () => {
    metronome.bpm = bpm
    metronome.beatsPerBar = 4
    const first = metronome.start()
    const t0 = first + countIn * spb
    const onsets: number[] = []
    const beatTimes: number[] = []
    let beat = 0
    steps.forEach((b, i) => {
      beatTimes.push(t0 + beat * spb)
      if (b != null) onsets.push(t0 + beat * spb)
      beat += stepBeats[i]
    })
    plan.current = { onsets, start: t0, end: t0 + beat * spb, beatTimes }
    setReport(null)
    setPhase('count')
  }

  useRaf(() => {
    const p = plan.current
    if (!p) return
    const now = audioEngine.now
    if (now < p.start) {
      setPhase('count')
      setStep(null)
      return
    }
    let idx = 0
    while (idx + 1 < p.beatTimes.length && p.beatTimes[idx + 1] <= now) idx++
    setPhase('run')
    setStep(idx)
    if (now > p.end + 0.35) {
      metronome.stop()
      const lat = latencyMs / 1000
      const frames = pitchTracker.framesBetween(p.start - 0.5, p.end + 0.3).map((f) => ({ ...f, time: f.time - lat }))
      const r = scoreRhythm(p.onsets, frames)
      plan.current = null
      setReport(r)
      setPhase('done')
      setStep(null)
      onFinish(r)
    }
  }, phase === 'count' || phase === 'run')

  useEffect(() => () => metronome.stop(), [])

  const countLeft = phase === 'count' && plan.current ? Math.ceil((plan.current.start - audioEngine.now) / spb) : null

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <FingeringColumn fingering={n.fingering} register={n.register} dot={14} />
        <div>
          <p className="font-display text-5xl font-semibold">{n.id}</p>
          <p className="text-sm text-ink-soft">{t('rhythm.bpm', { bpm })}</p>
        </div>
      </div>

      <div className="flex min-h-12 flex-wrap items-end justify-center gap-2" aria-hidden="true">
        {steps.map((b, i) => (
          <span
            key={i}
            className={cn('flex items-end justify-center rounded-md transition-colors', step === i ? 'bg-moss' : b == null ? 'bg-transparent ring-1 ring-line' : 'bg-surface-2')}
            style={{ width: 22 * stepBeats[i], height: b == null ? 12 : 36 }}
          />
        ))}
      </div>
      <BeatIndicator count={4} current={step != null ? stepIndexToBeat(step, stepBeats) % 4 : null} />
      {countLeft != null && countLeft > 0 && (
        <p className="font-display text-6xl font-semibold text-moss" aria-live="assertive">
          {countLeft}
        </p>
      )}

      {report && (
        <div className="flex w-full max-w-xl flex-col items-center gap-3" role="status">
          <p className="font-display text-3xl font-semibold">{t('rhythm.score', { n: Math.round(report.timing * 100) })}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {report.steps.map((s, i) => (
              <Chip key={i} tone={s.verdict === 'perfect' ? 'good' : s.verdict === 'missed' ? 'bad' : 'warn'}>
                {i + 1}: {t(VERDICT[s.verdict])}
                {s.delta != null && s.verdict !== 'perfect' && ` ${Math.round(s.delta * 1000)}ms`}
              </Chip>
            ))}
          </div>
          <p className="text-ink-soft">
            {Math.abs(report.bias) < 30 ? t('rhythm.biasNone') : report.bias < 0 ? t('rhythm.biasEarly') : t('rhythm.biasLate')}
          </p>
        </div>
      )}

      <MicControl enabled={micWanted} onChange={setMicWanted} status={status} level={frame?.level ?? 0} />
      {(phase === 'idle' || phase === 'done') && (
        <StepActions>
          <Button size="lg" variant={startVariant} icon="play" onClick={start} disabled={!micWanted || status !== 'on'}>
            {phase === 'done' ? t('rhythm.again') : t('rhythm.start')}
          </Button>
        </StepActions>
      )}
    </div>
  )
}

function stepIndexToBeat(step: number, beats: number[]): number {
  let b = 0
  for (let i = 0; i < step; i++) b += beats[i]
  return Math.floor(b)
}
