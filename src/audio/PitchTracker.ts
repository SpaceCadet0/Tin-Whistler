import { Emitter } from '../lib/emitter'
import { CHROMATIC_DETECTION, micInput, WHISTLE_DETECTION } from './MicInput'
import { DEFAULT_CALIBRATION, PitchStabilizer, type Calibration, type PitchFrame } from './pitch/stabilizer'

export type { PitchFrame } from './pitch/stabilizer'

const HISTORY_SECONDS = 180

/**
 * App-wide pitch service: subscribes to the mic, stabilises frames and keeps a short history
 * that exercises and the performance scorer read from.
 */
class PitchTracker {
  readonly frames = new Emitter<PitchFrame>()
  readonly history: PitchFrame[] = []
  private stabilizer = new PitchStabilizer()
  private unsub: (() => void) | null = null
  latest: PitchFrame | null = null

  setCalibration(c: Partial<Calibration>): void {
    this.stabilizer.calibration = { ...this.stabilizer.calibration, ...c }
  }

  get calibration(): Calibration {
    return this.stabilizer.calibration
  }

  get noiseFloor(): number {
    return this.stabilizer.noiseFloor
  }

  /** Whistle mode ignores low sounds (voices, hum); chromatic mode is for the tuner. */
  setMode(mode: 'whistle' | 'chromatic'): void {
    micInput.setDetection(mode === 'whistle' ? WHISTLE_DETECTION : CHROMATIC_DETECTION)
  }

  async start(): Promise<boolean> {
    const ok = await micInput.acquire()
    if (ok && !this.unsub) {
      this.stabilizer.reset()
      this.unsub = micInput.frames.on((raw) => {
        const f = this.stabilizer.process(raw)
        this.latest = f
        this.history.push(f)
        const cutoff = f.time - HISTORY_SECONDS
        while (this.history.length && this.history[0].time < cutoff) this.history.shift()
        this.frames.emit(f)
      })
    }
    return ok
  }

  stop(): void {
    micInput.release()
    if (micInput.current !== 'on') {
      this.unsub?.()
      this.unsub = null
      this.latest = null
    }
  }

  /** Frames between two AudioContext times. */
  framesBetween(from: number, to: number): PitchFrame[] {
    return this.history.filter((f) => f.time >= from && f.time <= to)
  }
}

export const pitchTracker = new PitchTracker()
export { DEFAULT_CALIBRATION }
