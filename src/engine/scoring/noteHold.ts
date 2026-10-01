import type { PitchFrame } from '../../audio/pitch/stabilizer'
import { matchNote, type NoteMatch } from './noteMatch'

export interface HoldEvent {
  kind: 'success' | 'miss'
  /** Mean absolute cents error while holding (success). */
  cents?: number
  /** MIDI note that was played instead (miss). */
  played?: number
}

export interface HoldState {
  match: NoteMatch
  /** 0…1 progress towards the required hold time. */
  progress: number
  /** Waiting for the player to stop before the next repetition. */
  waitingRelease: boolean
}

/**
 * "Play the note and hold it" logic, shared by lessons, the note trainer and daily practice.
 * A success needs the target held for `holdMs`; the player must then stop (or change note)
 * before the next repetition can count. A steady wrong note for 0.6 s counts as a miss.
 */
export class NoteHoldTracker {
  target: number
  holdMs: number
  tolerance: number
  private holdStart: number | null = null
  private lastGood = -Infinity
  private lastVoiced = -Infinity
  private armed = true
  private wrongStart: number | null = null
  private wrongNote: number | null = null
  private wrongReported = false
  private centsSum = 0
  private centsN = 0

  constructor(target: number, holdMs: number, tolerance = 40) {
    this.target = target
    this.holdMs = holdMs
    this.tolerance = tolerance
  }

  reset(target = this.target): void {
    this.target = target
    this.holdStart = null
    this.armed = true
    this.wrongStart = null
    this.wrongReported = false
  }

  process(f: PitchFrame, emit: (e: HoldEvent) => void): HoldState {
    const match = matchNote(f, this.target, this.tolerance)
    if (f.voiced) this.lastVoiced = f.time
    if (!this.armed) {
      const released = f.time - this.lastVoiced > 0.12 || (match.status !== 'correct' && f.voiced)
      if (released) this.armed = true
      return { match, progress: this.armed ? 0 : 1, waitingRelease: !this.armed }
    }

    if (match.status === 'correct') {
      this.wrongStart = null
      this.wrongReported = false
      if (this.holdStart == null) {
        this.holdStart = f.time
        this.centsSum = 0
        this.centsN = 0
      }
      this.lastGood = f.time
      this.centsSum += Math.abs(match.cents)
      this.centsN++
      const progress = Math.min(1, ((f.time - this.holdStart) * 1000) / this.holdMs)
      if (progress >= 1) {
        emit({ kind: 'success', cents: this.centsSum / Math.max(1, this.centsN) })
        this.armed = false
        this.holdStart = null
      }
      return { match, progress, waitingRelease: false }
    }

    if (f.time - this.lastGood > 0.15) this.holdStart = null
    if (f.voiced && f.stable && f.note != null) {
      if (this.wrongNote !== f.note) {
        this.wrongNote = f.note
        this.wrongStart = f.time
        this.wrongReported = false
      } else if (!this.wrongReported && this.wrongStart != null && f.time - this.wrongStart > 0.6) {
        this.wrongReported = true
        emit({ kind: 'miss', played: f.note })
      }
    }
    const progress = this.holdStart == null ? 0 : Math.min(1, ((f.time - this.holdStart) * 1000) / this.holdMs)
    return { match, progress, waitingRelease: false }
  }
}
