import { Emitter } from '../lib/emitter'
import { audioEngine } from './AudioEngine'
import { scheduleClick } from './click'
import { LOOKAHEAD_MS, onHide, scheduleAhead } from './lookahead'

export interface BeatEvent {
  /** Running beat number since start (0-based). */
  index: number
  /** Position within the bar (0 = downbeat). */
  inBar: number
  /** AudioContext time the click sounds. */
  time: number
}

const SCHEDULE_AHEAD = 0.12

/** Stand-alone metronome with a look-ahead scheduler (for practice / rhythm modes). */
export class Metronome {
  readonly beats = new Emitter<BeatEvent>()
  bpm = 80
  beatsPerBar = 4
  volume = 1
  silent = false
  private timer: number | null = null
  private nextTime = 0
  private index = 0

  get running(): boolean {
    return this.timer != null
  }

  get secondsPerBeat(): number {
    return 60 / this.bpm
  }

  /** Start; the first beat sounds at `startAt` (defaults to ~100 ms from now). Returns its time. */
  start(startAt?: number): number {
    this.stop()
    void audioEngine.resume()
    this.nextTime = startAt ?? audioEngine.now + 0.1
    this.index = 0
    const first = this.nextTime
    this.tick()
    this.timer = window.setInterval(() => this.tick(), LOOKAHEAD_MS)
    this.unwatchHide = onHide(() => this.tick())
    return first
  }

  stop(): void {
    if (this.timer != null) window.clearInterval(this.timer)
    this.timer = null
    this.unwatchHide?.()
    this.unwatchHide = null
  }

  private unwatchHide: (() => void) | null = null

  private tick(): void {
    const horizon = audioEngine.now + scheduleAhead(SCHEDULE_AHEAD)
    while (this.nextTime < horizon) {
      const inBar = this.index % this.beatsPerBar
      if (!this.silent) scheduleClick(this.nextTime, inBar === 0, this.volume)
      this.beats.emit({ index: this.index, inBar, time: this.nextTime })
      this.index++
      this.nextTime += this.secondsPerBeat
    }
  }
}

export const metronome = new Metronome()
