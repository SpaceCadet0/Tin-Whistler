import { frequencyToMidi } from '../../music/pitch'

export interface RawFrame {
  time: number
  freq: number
  clarity: number
  rms: number
}

/** A musically-interpreted pitch frame. */
export interface PitchFrame {
  time: number
  voiced: boolean
  freq: number | null
  /** Continuous MIDI pitch after calibration (null when unvoiced). */
  midi: number | null
  /** Nearest equal-tempered MIDI note. */
  note: number | null
  /** Deviation from `note`, −50…+50. */
  cents: number
  clarity: number
  rms: number
  /** 0…1 loudness for meters. */
  level: number
  /** Pitch has been steady (±20 cents) for the last ~65 ms. */
  stable: boolean
}

export interface Calibration {
  /** Concert pitch reference. */
  a4: number
  /** Whistle tuning offset in cents (measured by instrument calibration). */
  offsetCents: number
  /** 0 (strict, noisy rooms) … 1 (very sensitive, quiet rooms). */
  sensitivity: number
}

export const DEFAULT_CALIBRATION: Calibration = { a4: 440, offsetCents: 0, sensitivity: 0.5 }

const STABLE_FRAMES = 6
const CHANGE_CONFIRM = 2

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[s.length >> 1]
}

/**
 * Turns raw detector output into steady, noise-robust pitch: adaptive noise gate,
 * clarity threshold, jump confirmation (kills octave glitches), median smoothing.
 */
export class PitchStabilizer {
  private floor = 0.002
  private recent: number[] = []
  private accepted: number | null = null
  private pending: number[] = []
  private silentFrames = 0

  calibration: Calibration

  constructor(calibration: Calibration = DEFAULT_CALIBRATION) {
    this.calibration = calibration
  }

  get noiseFloor(): number {
    return this.floor
  }

  reset(): void {
    this.recent = []
    this.accepted = null
    this.pending = []
    this.silentFrames = 0
  }

  process(raw: RawFrame): PitchFrame {
    const { a4, offsetCents, sensitivity } = this.calibration
    const periodic = raw.freq > 0 && raw.clarity >= 0.86 - sensitivity * 0.14
    if (!periodic || raw.clarity < 0.5) this.floor = this.floor * 0.97 + Math.min(raw.rms, 0.05) * 0.03
    this.floor = Math.max(0.0004, this.floor)
    const gate = Math.max(0.0015 * (1.6 - sensitivity), this.floor * (3.2 - sensitivity * 1.4))
    const db = 20 * Math.log10(Math.max(raw.rms, 1e-6))
    const level = Math.max(0, Math.min(1, (db + 62) / 48))

    const base = { time: raw.time, clarity: raw.clarity, rms: raw.rms, level }
    if (!periodic || raw.rms < gate) {
      this.silentFrames++
      if (this.silentFrames > 1) this.reset()
      return { ...base, voiced: false, freq: null, midi: null, note: null, cents: 0, stable: false }
    }
    this.silentFrames = 0

    const midi = frequencyToMidi(raw.freq, a4) - offsetCents / 100
    if (this.accepted != null && Math.abs(midi - this.accepted) > 0.8) {
      // a jump must be confirmed by consecutive frames before we believe it
      this.pending.push(midi)
      const agree = this.pending.every((p) => Math.abs(p - midi) < 0.5)
      if (!agree) this.pending = [midi]
      if (this.pending.length < CHANGE_CONFIRM) {
        return this.frame(base, this.accepted, raw.freq)
      }
      this.recent = []
    }
    this.pending = []
    this.recent.push(midi)
    if (this.recent.length > STABLE_FRAMES) this.recent.shift()
    this.accepted = this.recent.length >= 3 ? median(this.recent.slice(-3)) : midi
    return this.frame(base, this.accepted, raw.freq)
  }

  private frame(base: Pick<PitchFrame, 'time' | 'clarity' | 'rms' | 'level'>, midi: number, freq: number): PitchFrame {
    const note = Math.round(midi)
    const stable =
      this.recent.length >= STABLE_FRAMES && this.recent.every((m) => Math.abs(m - median(this.recent)) < 0.2)
    return { ...base, voiced: true, freq, midi, note, cents: (midi - note) * 100, stable }
  }
}
