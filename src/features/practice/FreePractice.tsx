import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { audioEngine } from '../../audio/AudioEngine'
import { metronome } from '../../audio/Metronome'
import { Recorder, type Take } from '../../audio/Recorder'
import { whistleSynth } from '../../audio/WhistleSynth'
import { usePitch, usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { FIRST_OCTAVE, noteById, SECOND_OCTAVE, whistleLabel } from '../../music/whistles'
import { useSession } from '../../state/session'
import { BeatIndicator } from '../../ui/feedback/Feedback'
import { MicControl } from '../../ui/feedback/MicControl'
import { PitchTrace } from '../../ui/feedback/PitchTrace'
import { Icon } from '../../ui/Icon'
import { Button, Card, cn, PageHeader, Segmented, Slider } from '../../ui/primitives'
import { WhistleView } from '../../ui/whistle/WhistleView'

export default function FreePractice() {
  const { t } = useT()
  const { micWanted, setMicWanted } = useSession()
  const [note, setNote] = useState('D')
  const [bpm, setBpm] = useState(80)
  const [bar, setBar] = useState(4)
  const [metroOn, setMetroOn] = useState(false)
  const [beat, setBeat] = useState<number | null>(null)
  const [takes, setTakes] = useState<Take[]>([])
  const [recording, setRecording] = useState(false)
  const recorder = useRef(new Recorder())
  const n = noteById(note)!
  const { frame, status } = usePitch(micWanted)
  usePracticeTimer(true)

  useEffect(() => {
    metronome.bpm = bpm
    metronome.beatsPerBar = bar
  }, [bpm, bar])

  useEffect(() => {
    if (!metroOn) {
      metronome.stop()
      setBeat(null)
      return
    }
    metronome.bpm = bpm
    metronome.beatsPerBar = bar
    metronome.start()
    const off = metronome.beats.on((b) => {
      const delay = Math.max(0, (b.time - audioEngine.now) * 1000)
      window.setTimeout(() => setBeat(b.inBar), delay)
    })
    return () => {
      off()
      metronome.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metroOn])

  const takesRef = useRef(takes)
  takesRef.current = takes
  useEffect(() => () => takesRef.current.forEach((tk) => URL.revokeObjectURL(tk.url)), [])

  const toggleRecord = async () => {
    if (recording) {
      const take = await recorder.current.stop()
      setTakes((xs) => [take, ...xs])
      setRecording(false)
    } else {
      try {
        await recorder.current.start()
        setRecording(true)
      } catch {
        setRecording(false)
      }
    }
  }

  const heard = frame?.voiced && frame.note != null ? whistleLabel(frame.note) : '-'

  return (
    <div>
      <PageHeader back="/practice" title={t('practice.free')} subtitle={t('free.subtitle')} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center gap-4">
          <div className="grid w-full grid-cols-5 gap-2" role="radiogroup" aria-label={t('free.chooseNote')}>
            {[...FIRST_OCTAVE, ...SECOND_OCTAVE].map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={note === id}
                onClick={() => setNote(id)}
                className={cn('h-11 rounded-xl font-display text-lg font-semibold transition', note === id ? 'bg-moss text-on-moss' : 'bg-surface-2 text-ink-soft')}
              >
                {id}
              </button>
            ))}
          </div>
          <WhistleView fingering={n.fingering} height={300} label={t('whistle.fingeringFor', { note: n.id })} />
          <Button variant="secondary" icon="volume" onClick={() => whistleSynth.playNote(n.midi, 2)}>
            {t('free.reference')}
          </Button>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold text-ink-soft">{t('free.hearing')}</span>
                <span className="font-display text-5xl font-semibold">{heard}</span>
                {frame?.voiced && <span className="tabular text-ink-soft">{frame.cents > 0 ? '+' : ''}{Math.round(frame.cents)}¢</span>}
              </div>
              <MicControl enabled={micWanted} onChange={setMicWanted} status={status} level={frame?.level ?? 0} />
            </div>
            <PitchTrace active={micWanted} target={n.midi} height={240} />
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">{t('tune.metronome')}</h2>
                <Button size="sm" variant={metroOn ? 'danger' : 'primary'} icon={metroOn ? 'stop' : 'play'} onClick={() => setMetroOn((x) => !x)}>
                  {metroOn ? t('tune.stop') : t('tune.play')}
                </Button>
              </div>
              <BeatIndicator count={bar} current={beat} />
              <Slider label={t('rhythm.tempo')} value={bpm} min={40} max={200} onChange={setBpm} format={(v) => `${v} BPM`} />
              <Segmented
                size="sm"
                label={t('free.beatsPerBar')}
                value={bar}
                onChange={setBar}
                options={[2, 3, 4, 6].map((v) => ({ value: v, label: `${v}` }))}
              />
            </Card>

            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">{t('free.recorder')}</h2>
                {Recorder.supported() && (
                  <Button size="sm" variant={recording ? 'danger' : 'primary'} icon={recording ? 'stop' : 'record'} onClick={toggleRecord} className={cn(recording && 'animate-pulse-ring')}>
                    {recording ? t('free.stopRec') : t('free.record')}
                  </Button>
                )}
              </div>
              {takes.length === 0 ? (
                <p className="text-sm text-ink-soft">{t('free.noTakes')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {takes.map((tk, i) => (
                    <li key={tk.id} className="flex flex-col gap-1.5">
                      <span className="flex items-center justify-between text-sm font-semibold">
                        {t('free.take', { n: takes.length - i })} · {tk.seconds.toFixed(1)}s
                        <a href={tk.url} download={`tin-whistle-take-${tk.id}.webm`} className="text-moss" aria-label={t('free.download')}>
                          <Icon name="download" size={18} />
                        </a>
                      </span>
                      <audio controls src={tk.url} className="w-full" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 font-display text-xl font-semibold">{t('free.exercises')}</h2>
            <div className="flex flex-wrap gap-2">
              {[
                ['/practice/notes', 'practice.notes'],
                ['/practice/sequence', 'practice.sequence'],
                ['/practice/rhythm', 'practice.rhythm'],
                ['/practice/tuner', 'practice.tuner'],
              ].map(([to, key]) => (
                <Link key={to} to={to} className="rounded-2xl bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-moss-soft">
                  {t(key as 'practice.notes')}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
