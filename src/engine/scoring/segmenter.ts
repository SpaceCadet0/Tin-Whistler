import type { PitchFrame } from '../../audio/pitch/stabilizer'

/** A note the player actually produced, found in a stream of pitch frames. */
export interface PlayedNote {
  /** Median MIDI pitch (continuous). */
  midi: number
  start: number
  end: number
  /** Standard deviation of pitch in cents, lower is steadier. */
  wobble: number
}

export interface SegmentOptions {
  /** Pitch change (semitones) that starts a new note. */
  changeThreshold?: number
  /** Frames a new pitch must persist before it counts (filters ornaments / glitches). */
  confirmFrames?: number
  /** Unvoiced frames that end a note. */
  gapFrames?: number
  /** Notes shorter than this (s) are dropped, cuts, taps and blips. */
  minDuration?: number
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[s.length >> 1]
}

/**
 * Split pitch frames into played notes. Also splits repeated same-pitch notes when the
 * level dips sharply (tonguing), so "D D D" is three notes, not one long one.
 */
export function segmentNotes(frames: PitchFrame[], opts: SegmentOptions = {}): PlayedNote[] {
  const change = opts.changeThreshold ?? 0.6
  const confirm = opts.confirmFrames ?? 3
  const gapFrames = opts.gapFrames ?? 2
  const minDur = opts.minDuration ?? 0.06
  const out: PlayedNote[] = []

  let pitches: number[] = []
  let start = 0
  let lastVoiced = 0
  let peakRms = 0
  let dipped = false
  let pending: PitchFrame[] = []
  let gap = 0

  const close = (end: number) => {
    if (pitches.length && end - start >= minDur) {
      const m = median(pitches)
      const sd = Math.sqrt(pitches.reduce((s, p) => s + (p - m) ** 2, 0) / pitches.length) * 100
      out.push({ midi: m, start, end, wobble: sd })
    }
    pitches = []
    pending = []
    peakRms = 0
    dipped = false
  }
  const open = (f: PitchFrame) => {
    pitches = [f.midi!]
    start = f.time
    peakRms = f.rms
  }

  for (const f of frames) {
    if (!f.voiced || f.midi == null) {
      gap++
      if (gap >= gapFrames && pitches.length) close(lastVoiced)
      continue
    }
    gap = 0
    if (!pitches.length) {
      open(f)
      lastVoiced = f.time
      continue
    }
    const current = median(pitches)
    if (Math.abs(f.midi - current) > change) {
      pending.push(f)
      if (pending.length >= confirm && pending.every((p) => Math.abs(p.midi! - f.midi!) < change)) {
        const first = pending[0]
        const carried = pending
        close(first.time)
        open(first)
        for (const p of carried.slice(1)) pitches.push(p.midi!)
      }
    } else {
      pending = []
      // tongued repeat: a deep level dip followed by recovery
      if (f.rms < peakRms * 0.35) dipped = true
      else if (dipped && f.rms > peakRms * 0.6) {
        close(f.time)
        open(f)
      }
      pitches.push(f.midi)
      peakRms = Math.max(peakRms, f.rms)
    }
    lastVoiced = f.time
  }
  if (pitches.length) close(lastVoiced)
  return out
}
