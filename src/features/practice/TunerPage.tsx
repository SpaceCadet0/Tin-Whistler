import { useRef, useState } from 'react'
import { usePitch, usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { centsBetween, frequencyToMidi, midiToFrequency, nearestNote } from '../../music/pitch'
import { getWhistle } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSession } from '../../state/session'
import { useSettings } from '../../state/settings'
import { TunerGauge } from '../../ui/feedback/Feedback'
import { MicControl } from '../../ui/feedback/MicControl'
import { Button, Card, cn, PageHeader, ProgressBar, Slider } from '../../ui/primitives'

const CALIBRATE_SECONDS = 3

/** Chromatic tuner + A4 reference + whistle calibration. */
export default function TunerPage() {
  const { t } = useT()
  const { micWanted, setMicWanted } = useSession()
  const { a4, offsetCents, whistleId, set } = useSettings()
  const tonic = getWhistle(whistleId).baseMidi
  const recordLock = useProgress((s) => s.recordTunerLock)
  const [calib, setCalib] = useState<{ samples: number[]; progress: number } | null>(null)
  const [locked, setLocked] = useState(false)
  const inTuneSince = useRef<number | null>(null)
  const lockCounted = useRef(false)
  usePracticeTimer(true)

  const { frame, status } = usePitch(
    micWanted,
    (f) => {
      if (!f.voiced || !f.freq) {
        inTuneSince.current = null
        setLocked(false)
        return
      }
      const n = nearestNote(f.freq, a4)
      if (Math.abs(n.cents) <= 5 && f.stable) {
        inTuneSince.current ??= f.time
        if (f.time - inTuneSince.current > 1.5) {
          setLocked(true)
          if (!lockCounted.current) {
            lockCounted.current = true
            recordLock()
          }
        }
      } else {
        inTuneSince.current = null
        setLocked(false)
      }
      if (calib) {
        // calibrating on low D: collect cents relative to the whistle's tonic
        const ref = midiToFrequency(Math.round(frequencyToMidi(f.freq, a4)), a4)
        if (Math.abs(frequencyToMidi(f.freq, a4) - tonic) < 0.6 && f.stable) {
          const samples = [...calib.samples, centsBetween(f.freq, ref)]
          const progress = samples.length / (CALIBRATE_SECONDS * 90)
          if (progress >= 1) {
            const sorted = [...samples].sort((a, b) => a - b)
            set({ offsetCents: Math.round(sorted[sorted.length >> 1]) })
            setCalib(null)
          } else setCalib({ samples, progress })
        }
      }
    },
    'chromatic',
  )

  const n = frame?.voiced && frame.freq ? nearestNote(frame.freq, a4) : null
  const octave = n ? Math.floor(n.midi / 12) - 1 : null

  return (
    <div>
      <PageHeader back="/practice" title={t('practice.tuner')} subtitle={t('tuner.subtitle')} />
      <Card className={cn('flex flex-col items-center gap-4 p-6 transition-colors sm:p-10', locked && 'bg-good-soft')}>
        <p className="text-xs font-bold tracking-[0.2em] text-ink-soft uppercase">{t('tuner.note')}</p>
        <p className={cn('font-display text-[7rem] leading-none font-semibold sm:text-[9rem]', locked && 'text-good')} aria-live="off">
          {n ? n.name : '-'}
          {n && <sub className="ml-1 font-sans text-3xl text-ink-soft">{octave}</sub>}
        </p>
        <p className={cn('tabular text-3xl font-semibold', !n ? 'text-ink-faint' : Math.abs(n.cents) <= 5 ? 'text-good' : 'text-warn')} role="status" aria-live="polite">
          {n ? `${n.cents > 0 ? '+' : ''}${Math.round(n.cents)} ${t('tuner.cents')}` : t('tuner.idle')}
        </p>
        <TunerGauge cents={n?.cents ?? 0} active={!!n} locked={locked} big />
        {frame?.freq && frame.voiced && <p className="tabular text-sm text-ink-soft">{frame.freq.toFixed(1)} Hz</p>}
        {locked && <p className="font-semibold text-good">✓ {t('tuner.locked')}</p>}
        <MicControl enabled={micWanted} onChange={setMicWanted} status={status} level={frame?.level ?? 0} />
      </Card>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-xl font-semibold">{t('tuner.reference')}</h2>
          <Slider label="A4" value={a4} min={430} max={450} onChange={(v) => set({ a4: v })} format={(v) => `${v} Hz`} />
          <p className="mt-3 text-sm text-ink-soft">{t('tuner.referenceHint')}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-display text-xl font-semibold">{t('tuner.calibrate')}</h2>
          <p className="mb-4 text-sm text-ink-soft">{t('tuner.calibrateHint')}</p>
          <p className="mb-3 font-semibold">
            {t('tuner.offset')}: <span className="tabular">{offsetCents > 0 ? '+' : ''}{offsetCents} {t('tuner.cents')}</span>
          </p>
          {calib ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-moss">{t('tuner.calibrating')}</p>
              <ProgressBar value={calib.progress} tone="good" />
              <Button size="sm" variant="ghost" onClick={() => setCalib(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                icon="tuner"
                onClick={() => {
                  setMicWanted(true)
                  setCalib({ samples: [], progress: 0 })
                }}
              >
                {t('tuner.startCalibration')}
              </Button>
              {offsetCents !== 0 && (
                <Button variant="ghost" onClick={() => set({ offsetCents: 0 })}>
                  {t('tuner.reset')}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
