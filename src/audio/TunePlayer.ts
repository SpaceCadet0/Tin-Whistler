import { Emitter } from '../lib/emitter'
import { flattenSecondVoice, flattenTune } from '../music/tune'
import type { TimedNote, Tune, TuneNote } from '../music/types'
import { audioEngine } from './AudioEngine'
import { scheduleClick } from './click'
import { LOOKAHEAD_MS, onHide, scheduleAhead } from './lookahead'
import { WhistleVoice } from './WhistleSynth'

export interface PlayerOptions {
  /** Tempo multiplier, 0.25 … 1.5. */
  tempo: number
  /** Loop the played range instead of stopping at its end. */
  repeat: boolean
  metronome: boolean
  /** Hear the melody (off = "play alone" with only the visual guide / clicks). */
  melody: boolean
  secondVoice: boolean
  /** Count-in clicks before the first note (in metronome pulses). */
  countIn: number
  a4: number
}

export type PlayerState = 'stopped' | 'counting' | 'playing'

export interface PlayerPosition {
  state: PlayerState
  /** Current timeline index (or the start index while counting in). */
  index: number
  /** 0…1 progress through the current note. */
  progress: number
  /** Seconds until the first note while counting in. */
  countdown: number
  /** Seconds since the start of the current pass (negative during the count-in). */
  passTime: number
}

interface PlayEvent {
  /** Seconds from the start of the pass. */
  at: number
  kind: 'note' | 'voice2' | 'click'
  note?: TimedNote
  accent?: boolean
}

const SCHEDULE_AHEAD = 0.15

/**
 * Plays a tune with a look-ahead scheduler: loops, tempo, count-in, metronome, optional second
 * voice. UI polls positionAt(ctx.currentTime) from requestAnimationFrame.
 */
export class TunePlayer {
  readonly stateChange = new Emitter<PlayerState>()
  readonly passStarted = new Emitter<{ pass: number; startTime: number }>()
  options: PlayerOptions = {
    tempo: 1,
    repeat: false,
    metronome: false,
    melody: true,
    secondVoice: false,
    countIn: 0,
    a4: 440,
  }
  timeline: TimedNote[] = []
  private tune: Tune | null = null
  private state: PlayerState = 'stopped'
  private events: PlayEvent[] = []
  private cursor = 0
  private passStart = 0
  private passDuration = 0
  private pass = 0
  private range: [number, number] = [0, 0]
  private timer: number | null = null
  private voice: WhistleVoice | null = null
  private voice2: WhistleVoice | null = null
  private endTime = Infinity
  private unwatchHide: (() => void) | null = null

  load(tune: Tune): void {
    this.stop()
    this.tune = tune
    this.rebuild()
  }

  setOptions(patch: Partial<PlayerOptions>): void {
    const changed = (k: keyof PlayerOptions) => k in patch && patch[k] !== this.options[k]
    const needsRestart = this.state !== 'stopped' && (changed('tempo') || changed('secondVoice'))
    const resumeAt = this.positionAt(audioEngine.now).index
    const [, to] = this.range
    this.options = { ...this.options, ...patch }
    if (changed('tempo') || 'tempo' in patch) this.rebuild()
    if (needsRestart) this.play(resumeAt, to, false)
  }

  get playing(): boolean {
    return this.state !== 'stopped'
  }

  get currentState(): PlayerState {
    return this.state
  }

  private rebuild(): void {
    if (!this.tune) return
    this.timeline = flattenTune(this.tune, { tempo: this.options.tempo })
  }

  private secPerPulse(): number {
    const t = this.tune!
    return (60 / (t.bpm * this.options.tempo)) * (t.pulse ?? 1)
  }

  private buildEvents(from: number, to: number): void {
    const tune = this.tune!
    const tl = this.timeline
    const t0 = tl[from].start
    const end = tl[to].start + tl[to].duration
    const events: PlayEvent[] = []
    for (let i = from; i <= to; i++) events.push({ at: tl[i].start - t0, kind: 'note', note: tl[i] })

    if (this.options.secondVoice) {
      const sections = new Set(tl.slice(from, to + 1).map((n) => n.sectionIndex))
      for (const si of sections) {
        const first = tl.find((n) => n.sectionIndex === si && n.noteInSection === 0)
        if (!first) continue
        for (const v of flattenSecondVoice(tune, si, this.options.tempo)) {
          const at = first.start + v.start - t0
          if (at >= 0 && at < end - t0) events.push({ at, kind: 'voice2', note: v })
        }
      }
    }

    const pulse = tune.pulse ?? 1
    const bar = tune.beatsPerBar ?? 4
    const secPerBeat = 60 / (tune.bpm * this.options.tempo)
    const firstBeat = Math.ceil(tl[from].startBeat / pulse - 1e-6) * pulse
    const lastBeat = tl[to].startBeat + tl[to].note.beats
    for (let b = firstBeat; b < lastBeat - 1e-6; b += pulse) {
      events.push({ at: (b - tl[from].startBeat) * secPerBeat, kind: 'click', accent: Math.abs(b % bar) < 1e-6 })
    }
    events.sort((a, b) => a.at - b.at || (a.kind === 'click' ? -1 : 1))
    this.events = events
    this.passDuration = end - t0
  }

  /** Play timeline notes `from`…`to` (inclusive); loops when options.repeat is set. */
  play(fromIndex = 0, toIndex?: number, countIn = true): void {
    if (!this.tune || !this.timeline.length) return
    this.halt()
    void audioEngine.resume()
    const last = this.timeline.length - 1
    const from = Math.max(0, Math.min(fromIndex, last))
    const to = Math.min(Math.max(toIndex ?? last, from), last)
    this.range = [from, to]
    this.buildEvents(from, to)

    const now = audioEngine.now
    const lead = countIn ? this.options.countIn * this.secPerPulse() : 0
    this.passStart = now + 0.12 + lead
    this.cursor = 0
    this.pass = 0
    this.endTime = Infinity
    if (lead > 0) {
      for (let i = 0; i < this.options.countIn; i++) {
        scheduleClick(now + 0.12 + i * this.secPerPulse(), i === 0)
      }
    }
    this.voice = new WhistleVoice(audioEngine.output, this.options.a4, this.tune.whistle)
    this.voice2 = null
    this.setState(lead > 0 ? 'counting' : 'playing')
    this.passStarted.emit({ pass: 0, startTime: this.passStart })
    this.tick()
    this.timer = window.setInterval(() => this.tick(), LOOKAHEAD_MS)
    this.unwatchHide = onHide(() => this.tick())
  }

  private tick(): void {
    const now = audioEngine.now
    if (this.state === 'counting' && now >= this.passStart) this.setState('playing')
    if (now >= this.endTime) {
      this.stop()
      return
    }
    const horizon = now + scheduleAhead(SCHEDULE_AHEAD)
    while (this.passStart + (this.events[this.cursor]?.at ?? Infinity) < horizon) {
      const ev = this.events[this.cursor]
      const time = this.passStart + ev.at
      if (ev.kind === 'click') {
        if (this.options.metronome) scheduleClick(time, ev.accent, 0.8)
      } else if (ev.kind === 'note' && ev.note) {
        const n = ev.note.note
        const ornament = n.ornament ?? this.slideSpanOrnament(ev.note.index)
        this.voice?.schedule({
          time,
          duration: ev.note.duration,
          midi: this.options.melody ? n.pitch : null,
          attack: n.attack,
          stop: n.stop,
          ornament,
          fingering: n.fingering,
          slideTo: ornament?.type === 'slide' ? this.slideTarget(ev.note.index) : undefined,
        })
      } else if (ev.kind === 'voice2' && ev.note && this.options.melody) {
        this.voice2 ??= new WhistleVoice(audioEngine.output, this.options.a4, this.tune!.whistle)
        const n = ev.note.note
        this.voice2.schedule({ time, duration: ev.note.duration, midi: n.pitch, attack: n.attack, velocity: 0.7 })
      }
      this.cursor++
      if (this.cursor >= this.events.length) {
        const passEnd = this.passStart + this.passDuration
        if (this.options.repeat) {
          this.cursor = 0
          this.pass++
          this.passStart = passEnd
          this.passStarted.emit({ pass: this.pass, startTime: this.passStart })
        } else {
          this.voice?.schedule({ time: passEnd, duration: 0.1, midi: null })
          this.voice2?.schedule({ time: passEnd, duration: 0.1, midi: null })
          this.endTime = passEnd + 0.05
          break
        }
      }
    }
  }

  /** A slide glides into the next note when it follows without a rest inside the played range. */
  private slideTarget(index: number): number | undefined {
    const cur = this.timeline[index]
    const next = this.timeline[index + 1]
    if (!cur || !next || index + 1 > this.range[1] || next.note.pitch == null) return undefined
    if (Math.abs(next.start - (cur.start + cur.duration)) > 0.01) return undefined
    return next.note.pitch
  }

  /** Notes under a slide's oval (ornament.span > 1) keep gliding into their successors. */
  private slideSpanOrnament(index: number): TuneNote['ornament'] {
    for (let j = index - 1; j >= 0 && index - j < 8; j--) {
      const o = this.timeline[j].note.ornament
      if (!o) continue
      return o.type === 'slide' && (o.span ?? 1) - 1 > index - j ? { type: 'slide' } : undefined
    }
    return undefined
  }

  private halt(): void {
    if (this.timer != null) window.clearInterval(this.timer)
    this.timer = null
    this.unwatchHide?.()
    this.unwatchHide = null
    this.voice?.stop()
    this.voice2?.stop()
    this.voice = null
    this.voice2 = null
  }

  stop(): void {
    this.halt()
    this.setState('stopped')
  }

  private setState(s: PlayerState): void {
    if (s === this.state) return
    this.state = s
    this.stateChange.emit(s)
  }

  /** Where the playhead is at an AudioContext time. */
  positionAt(time: number): PlayerPosition {
    const [from, to] = this.range
    const passTime = time - this.passStart
    if (this.state === 'stopped' || !this.timeline.length) {
      return { state: this.state, index: from, progress: 0, countdown: 0, passTime: 0 }
    }
    if (passTime < 0) return { state: this.state, index: from, progress: 0, countdown: -passTime, passTime }
    const songTime = this.timeline[from].start + passTime
    let lo = from
    let hi = to
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.timeline[mid].start <= songTime) lo = mid
      else hi = mid - 1
    }
    const n = this.timeline[lo]
    const progress = Math.min(1, Math.max(0, (songTime - n.start) / n.duration))
    return { state: this.state, index: lo, progress, countdown: 0, passTime }
  }

  get passStartTime(): number {
    return this.passStart
  }

  get currentRange(): [number, number] {
    return this.range
  }
}
