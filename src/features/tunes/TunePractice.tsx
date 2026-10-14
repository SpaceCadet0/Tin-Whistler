import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audioEngine } from '../../audio/AudioEngine'
import { pitchTracker } from '../../audio/PitchTracker'
import { scorePerformance, type PerformanceReport } from '../../engine/scoring/performance'
import { matchNote } from '../../engine/scoring/noteMatch'
import { usePitch, usePlayer } from '../../hooks/audio'
import { useHotkeys } from '../../hooks/useHotkeys'
import { sectionName, useT } from '../../i18n'
import { noteFingering } from '../../music/ornaments'
import { flattenTune } from '../../music/tune'
import type { Tune } from '../../music/types'
import { whistleLabel } from '../../music/whistles'
import { useSession } from '../../state/session'
import { useSettings } from '../../state/settings'
import { MicControl } from '../../ui/feedback/MicControl'
import { Icon } from '../../ui/Icon'
import { AnimatePresence, motion } from '../../ui/motion'
import { Shortcuts } from '../../ui/Shortcuts'
import { Button, Chip, cn, IconButton, Segmented, Toggle } from '../../ui/primitives'
import { TabView } from '../../ui/whistle/TabView'
import { WhistleView } from '../../ui/whistle/WhistleView'
import { PerformanceReportView } from './PerformanceReportView'

export interface PracticePreset {
  melody: boolean
  metronome: boolean
  tempo: number
  mic: boolean
}

export interface ScoredRun {
  report: PerformanceReport
  /** Section id when a single section was played, null for the whole tune. */
  sectionId: string | null
  tempo: number
  complete: boolean
}

interface Props {
  tune: Tune
  initialSection?: number | 'all'
  preset?: Partial<PracticePreset>
  /** Smaller layout for lessons. */
  compact?: boolean
  onScored?: (run: ScoredRun) => void
}

const ORN_KEY = { cut: 'orn.cut', bounce: 'orn.bounce', slide: 'orn.slide', roll: 'orn.roll', trill: 'orn.trill' } as const
const ART_KEY = { tongue: 'art.tongue', ru: 'art.ru', slur: 'art.slur' } as const

/**
 * The tune learning player: big "now / next" stage, tab with markers, sections, loop, tempo,
 * metronome, guide audio, second voice, mic scoring. Space or tapping the stage replays from
 * the marker, the core "again from here" loop of learning a tune.
 */
export function TunePractice({ tune, initialSection = 0, preset, compact, onScored }: Props) {
  const { t, lang } = useT()
  const latencyMs = useSettings((s) => s.latencyMs)
  const { micWanted, setMicWanted } = useSession()
  const { player, state, position } = usePlayer(tune)
  const [section, setSection] = useState<number | 'all'>(initialSection)
  const [tempo, setTempo] = useState(preset?.tempo ?? 0.8)
  const [melody, setMelody] = useState(preset?.melody ?? true)
  const [metro, setMetro] = useState(preset?.metronome ?? false)
  const [repeat, setRepeat] = useState(false)
  const [secondVoice, setSecondVoice] = useState(false)
  const [names, setNames] = useState(true)
  const [countIn, setCountIn] = useState(false)
  const [marker, setMarker] = useState<number | null>(null)
  const [phraseLoop, setPhraseLoop] = useState<{ from: number; to: number } | null>(null)
  const [report, setReport] = useState<PerformanceReport | null>(null)
  const [verdicts, setVerdicts] = useState<Record<number, 'right' | 'wrong'>>({})
  const pass = useRef<{ start: number; from: number; to: number } | null>(null)
  const micOn = micWanted
  const { frame, status } = usePitch(micOn)

  useEffect(() => {
    if (preset?.mic) setMicWanted(true)
  }, [preset?.mic, setMicWanted])

  // timeline for the whole tune at the current tempo (same layout the player schedules)
  const timeline = useMemo(() => flattenTune(tune, { tempo }), [tune, tempo])

  const sectionRange = useCallback(
    (s: number | 'all'): [number, number] => {
      if (s === 'all' || !timeline.length) return [0, timeline.length - 1]
      const idx = timeline.filter((n) => n.sectionIndex === s)
      return [idx[0]?.index ?? 0, idx[idx.length - 1]?.index ?? 0]
    },
    [timeline],
  )
  const [rangeFrom, rangeTo] = phraseLoop ? [phraseLoop.from, phraseLoop.to] : sectionRange(section)
  const start = marker != null && marker >= rangeFrom && marker <= rangeTo ? marker : rangeFrom

  useEffect(() => {
    player.setOptions({ metronome: metro, melody, secondVoice, repeat, countIn: countIn ? (tune.beatsPerBar ?? 4) / (tune.pulse ?? 1) : 0, tempo })
  }, [player, metro, melody, secondVoice, repeat, countIn, tempo, tune])

  const scorePass = useCallback(
    (p: { start: number; from: number; to: number }, until: number) => {
      const origin = p.start + latencyMs / 1000
      const expected = timeline.slice(p.from, p.to + 1).filter((n) => origin + n.start - timeline[p.from].start + n.duration <= until + 0.05)
      if (expected.length < 3) return
      const rebased = expected.map((n) => ({ ...n, start: n.start - timeline[p.from].start }))
      const frames = pitchTracker.framesBetween(origin - 0.3, until + 0.3)
      const r = scorePerformance(rebased, frames, origin)
      // result indexes are absolute timeline indexes (rebased notes keep their index)
      const v: Record<number, 'right' | 'wrong'> = {}
      for (const res of r.results) {
        const tn = timeline[res.index]
        if (tn) v[tn.noteInSection] = res.credit >= 1 ? 'right' : 'wrong'
      }
      setVerdicts(v)
      setReport(r)
      const complete = expected.length === p.to - p.from + 1
      onScored?.({
        report: r,
        sectionId: section === 'all' && !phraseLoop ? null : tune.sections[timeline[p.from].sectionIndex]?.id ?? null,
        tempo,
        complete,
      })
    },
    [latencyMs, timeline, section, onScored, phraseLoop, tempo, tune],
  )

  // score each finished pass while looping, and the last pass when playback stops
  useEffect(
    () =>
      player.passStarted.on(({ pass: n, startTime }) => {
        const [from, to] = player.currentRange
        if (n > 0 && pass.current && micOn) scorePass(pass.current, startTime)
        pass.current = { start: startTime, from, to }
      }),
    [player, micOn, scorePass],
  )
  const prevState = useRef(state)
  useEffect(() => {
    if (prevState.current !== 'stopped' && state === 'stopped' && pass.current && micOn) scorePass(pass.current, audioEngine.now)
    prevState.current = state
  }, [state, micOn, scorePass])

  const play = useCallback(
    (from = start) => {
      setReport(null)
      setVerdicts({})
      player.play(from, rangeTo)
    },
    [player, start, rangeTo],
  )
  const toggle = () => (state === 'stopped' ? play() : player.stop())
  const again = () => play(start)

  const moveMarker = (d: number) => {
    const base = marker ?? rangeFrom
    setMarker(Math.max(rangeFrom, Math.min(rangeTo, base + d)))
  }
  const changeTempo = (d: number) => setTempo((x) => Math.round(Math.max(0.3, Math.min(1.5, x + d)) * 20) / 20)
  const goSection = (d: number) => {
    const n = tune.sections.length
    const cur = section === 'all' ? 0 : section
    setSection((cur + d + n) % n)
    setMarker(null)
    setPhraseLoop(null)
  }

  useHotkeys({
    ' ': again,
    Enter: toggle,
    Escape: () => player.stop(),
    ArrowLeft: (e) => (e.shiftKey ? goSection(-1) : moveMarker(-1)),
    ArrowRight: (e) => (e.shiftKey ? goSection(1) : moveMarker(1)),
    m: () => setMetro((x) => !x),
    l: () => setRepeat((x) => !x),
    '+': () => changeTempo(0.05),
    '=': () => changeTempo(0.05),
    '-': () => changeTempo(-0.05),
  })

  const playing = state !== 'stopped'
  const curIdx = playing && position ? position.index : start
  const cur = timeline[curIdx]
  const next = timeline[curIdx + 1]
  const curPitch = cur?.note.pitch ?? null
  const curFg = curPitch != null ? noteFingering(curPitch, cur.note.fingering, tune.whistle) : undefined
  const nextFg = next?.note.pitch != null ? noteFingering(next.note.pitch, next.note.fingering, tune.whistle) : undefined
  const live = micOn && curPitch != null ? matchNote(frame, curPitch, 45) : null
  const shownSections = section === 'all' ? tune.sections.map((_, i) => i) : [section]
  const bpm = Math.round(tune.bpm * tempo)

  return (
    <div className="flex flex-col gap-5">
      {/* section picker */}
      {tune.sections.length > 1 && (
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t('tune.sections')}>
          {tune.sections.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={section === i}
              onClick={() => {
                player.stop()
                setSection(i)
                setMarker(null)
                setPhraseLoop(null)
              }}
              className={cn('h-10 shrink-0 rounded-2xl px-4 text-sm font-semibold transition', section === i ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft hover:text-ink')}
            >
              {sectionName(s.name, lang)}
            </button>
          ))}
          <button
            role="tab"
            aria-selected={section === 'all'}
            onClick={() => {
              player.stop()
              setSection('all')
              setMarker(null)
              setPhraseLoop(null)
            }}
            className={cn('h-10 shrink-0 rounded-2xl px-4 text-sm font-semibold transition', section === 'all' ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft hover:text-ink')}
          >
            {t('tune.wholeTune')}
          </button>
        </div>
      )}

      {/* stage: tap = again from marker */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t('tune.stageAria')}
        onClick={again}
        onKeyDown={(e) => e.key === 'Enter' && toggle()}
        className={cn(
          'relative grid cursor-pointer items-center gap-6 overflow-hidden rounded-[2rem] border border-line/70 bg-surface p-5 shadow-soft select-none sm:p-8',
          compact ? 'grid-cols-[auto_1fr]' : 'grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto]',
        )}
      >
        {curFg ? (
          <WhistleView fingering={curFg.fingering} next={nextFg?.fingering} ornamentHole={cur.note.ornament?.hole ? cur.note.ornament.hole - 1 : undefined} height={compact ? 250 : 340} showHands={!compact} />
        ) : (
          <div className="w-24" />
        )}
        <div className="flex flex-col items-center gap-2 text-center">
          {position?.state === 'counting' ? (
            <p className="font-display text-8xl font-semibold text-brass tabular" aria-live="assertive">
              {Math.max(1, Math.ceil(position.countdown / ((60 / (tune.bpm * tempo)) * (tune.pulse ?? 1))))}
            </p>
          ) : (
            <>
              <p className="text-xs font-bold tracking-[0.2em] text-ink-soft uppercase">{playing ? t('tune.now') : t('tune.startsHere')}</p>
              <span className={cn('relative grid overflow-hidden font-display leading-[1.05] font-semibold', compact ? 'h-[4.8rem] text-7xl' : 'h-[6.6rem] text-8xl sm:h-[8.4rem] sm:text-9xl')}>
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={curIdx}
                    className={cn('col-start-1 row-start-1 transition-colors duration-200', live?.status === 'correct' && 'text-good')}
                    initial={{ y: '60%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1, scale: live?.status === 'correct' ? 1.06 : 1 }}
                    exit={{ y: '-60%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  >
                    {curPitch != null ? whistleLabel(curPitch, tune.whistle) : '-'}
                  </motion.span>
                </AnimatePresence>
              </span>
              <div className="flex min-h-7 flex-wrap justify-center gap-1.5">
                {cur?.note.ornament && <Chip tone="bad">{t(ORN_KEY[cur.note.ornament.type])}</Chip>}
                {cur?.note.attack && <Chip>{t(ART_KEY[cur.note.attack])}</Chip>}
                {cur?.note.stop && <Chip tone="warn">{t('art.stop')}</Chip>}
              </div>
              {next?.note.pitch != null && (
                <p className="text-lg text-ink-soft">
                  {t('tune.next')} <span className="font-display text-2xl font-semibold text-ink">{whistleLabel(next.note.pitch, tune.whistle)}</span>
                </p>
              )}
              {live && live.status !== 'silent' && (
                <p className={cn('text-sm font-semibold', live.status === 'correct' ? 'text-good' : 'text-warn')}>
                  {t('tune.hearing', { note: frame?.note != null ? whistleLabel(frame.note, tune.whistle) : '-' })}
                </p>
              )}
            </>
          )}
        </div>
        {!compact && (
          <div className="hidden flex-col items-end gap-1 text-right lg:flex">
            <span className="text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">{t('tune.tempo')}</span>
            <span className="font-display text-4xl font-semibold tabular">{bpm}</span>
            <span className="text-sm text-ink-soft">BPM · {Math.round(tempo * 100)}%</span>
          </div>
        )}
        <span className="pointer-events-none absolute right-4 bottom-3 hidden text-xs text-ink-faint sm:block">{t('tune.tapHint')}</span>
      </div>

      {/* transport */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <IconButton icon="back" label={t('tune.prevSection')} onClick={() => goSection(-1)} disabled={tune.sections.length < 2} />
        <Button size="xl" icon={playing ? 'stop' : 'play'} onClick={toggle} className="min-w-0 flex-1 px-4 sm:max-w-xs sm:flex-none sm:px-8">
          {playing ? t('tune.stop') : t('tune.play')}
        </Button>
        <Button size="xl" variant="secondary" icon="repeat" onClick={again} title={t('tune.againHint')} aria-label={t('tune.again')} className="px-4 sm:px-6">
          <span className="hidden sm:inline">{t('tune.again')}</span>
        </Button>
        <IconButton icon="next" label={t('tune.nextSection')} onClick={() => goSection(1)} disabled={tune.sections.length < 2} />
      </div>

      {/* tempo & options */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-3xl bg-surface-2/60 p-4">
        <div className="flex items-center gap-2" role="group" aria-label={t('tune.tempo')}>
          <IconButton icon="minus" label={t('tune.slower')} onClick={() => changeTempo(-0.05)} size={40} />
          <span className="tabular w-28 text-center text-sm font-semibold">
            {bpm} BPM <span className="text-ink-soft">({Math.round(tempo * 100)}%)</span>
          </span>
          <IconButton icon="plus" label={t('tune.faster')} onClick={() => changeTempo(0.05)} size={40} />
        </div>
        <Segmented
          size="sm"
          label={t('tune.guide')}
          value={melody ? 'on' : 'off'}
          onChange={(v) => setMelody(v === 'on')}
          options={[
            { value: 'on', label: t('tune.withGuide') },
            { value: 'off', label: t('tune.alone') },
          ]}
        />
        <div className="flex flex-wrap items-center gap-1">
          <IconButton icon="metronome" label={t('tune.metronome')} active={metro} onClick={() => setMetro((x) => !x)} size={40} />
          <IconButton icon="loop" label={t('tune.loop')} active={repeat} onClick={() => setRepeat((x) => !x)} size={40} />
          <IconButton icon="timer" label={t('tune.countIn')} active={countIn} onClick={() => setCountIn((x) => !x)} size={40} />
          <IconButton icon="keyboard" label={t('tune.names')} active={names} onClick={() => setNames((x) => !x)} size={40} />
        </div>
        <MicControl enabled={micOn} onChange={setMicWanted} status={status} level={frame?.level ?? 0} />
      </div>

      {phraseLoop && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Chip tone="brass">
            <Icon name="loop" size={14} /> {t('tune.loopingPhrase')}
          </Chip>
          <Button size="sm" variant="ghost" onClick={() => setPhraseLoop(null)}>
            {t('tune.clearLoop')}
          </Button>
        </div>
      )}

      {report && (
        <PerformanceReportView
          report={report}
          tune={tune}
          timeline={timeline}
          onClose={() => setReport(null)}
          onPracticePhrase={(from, to) => {
            setPhraseLoop({ from, to })
            setMarker(from)
            setRepeat(true)
            setTempo((x) => Math.max(0.4, x - 0.1))
            setReport(null)
          }}
        />
      )}

      {/* tab */}
      <div className="flex flex-col gap-6 rounded-3xl border border-line/70 bg-surface p-4 sm:p-6">
        {shownSections.map((si) => {
          const s = tune.sections[si]
          const inSection = cur && cur.sectionIndex === si
          const first = timeline.find((n) => n.sectionIndex === si && n.noteInSection === 0)?.index ?? 0
          const loopInSection =
            phraseLoop && timeline[phraseLoop.from]?.sectionIndex === si
              ? { from: timeline[phraseLoop.from].noteInSection, to: timeline[phraseLoop.to].noteInSection }
              : null
          return (
            <section key={s.id} aria-label={s.name}>
              {section === 'all' && <h3 className="mb-2 font-display text-lg font-semibold">{sectionName(s.name, lang)}</h3>}
              <TabView
                tune={tune}
                section={s}
                current={inSection ? cur.noteInSection : null}
                selected={marker != null && timeline[marker]?.sectionIndex === si ? timeline[marker].noteInSection : null}
                loop={loopInSection}
                verdicts={section === 'all' ? undefined : verdicts}
                onSelect={(i) => {
                  const abs = first + i
                  setMarker(abs)
                  if (playing) play(abs)
                }}
                showNames={names}
                showSecondVoice={secondVoice}
                dot={compact ? 12 : 14}
              />
            </section>
          )
        })}
        {tune.sections.some((s) => s.secondVoice) && (
          <Toggle label={t('tune.secondVoice')} description={t('tune.secondVoiceHint')} checked={secondVoice} onChange={setSecondVoice} />
        )}
        <Shortcuts
          items={[
            [['Space'], 'sc.again'],
            [['Enter'], 'sc.playStop'],
            [['←', '→'], 'sc.marker'],
            [['Shift', '←', '→'], 'sc.section'],
            [['M'], 'sc.metronome'],
            [['L'], 'sc.loop'],
            [['+', '-'], 'sc.tempo'],
          ]}
        />
      </div>
    </div>
  )
}
