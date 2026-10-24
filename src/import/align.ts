import { yin } from '../audio/pitch/yin'
import type { TuneNote } from '../music/types'

/**
 * Timing a known note sequence against a recording: the notes come from the tab (pitch, ornaments,
 * articulation), the recording says when each one starts and how long it lasts.
 *  1. pitchTrack: YIN every HOP seconds → fundamental (as MIDI), clarity and level per frame;
 *  2. alignNotes: dynamic programming over (frame, note): every note owns one unbroken run of
 *     frames, in order, with optional silence between notes. A frame is cheap for a note when its
 *     pitch class matches (the octave is checked afterwards) and cheap for silence when it is quiet;
 *     a new note costs a little, less where the level dips, which is how repeated "du du" notes on
 *     one pitch are told apart;
 *  3. timedNotes: onsets → beats at the chosen tempo, rests where the player stopped, and the
 *     octave each note was actually played in.
 */

export const HOP = 0.005

export interface PitchFrame {
  /** Seconds from the start of the samples. */
  t: number
  /** Fundamental as a (fractional) MIDI number, null when unpitched. */
  midi: number | null
  rms: number
  /** YIN clarity, 0…1: a tongued attack blurs the tone for a few milliseconds. */
  clarity: number
}

const MIN_CLARITY = 0.8

export function pitchTrack(samples: Float32Array, sampleRate: number, opts: { minFreq?: number; maxFreq?: number; window?: number } = {}): PitchFrame[] {
  const win = opts.window ?? 1024
  const hop = Math.round(HOP * sampleRate)
  const frames: PitchFrame[] = []
  for (let start = 0; start + win <= samples.length; start += hop) {
    const est = yin(samples.subarray(start, start + win), sampleRate, { minFreq: opts.minFreq ?? 250, maxFreq: opts.maxFreq ?? 4000, threshold: 0.15 })
    const midi = est.freq > 0 && est.clarity >= MIN_CLARITY ? 69 + 12 * Math.log2(est.freq / 440) : null
    frames.push({ t: (start + win / 2) / sampleRate, midi, rms: est.rms, clarity: est.clarity })
  }
  return frames
}

/** Tuning offsets tried, semitones: whistles (and recordings) are often a fair bit sharp up high. */
const TUNING_RANGE = 1
const TUNING_STEP = 0.05

/**
 * Undo the player's tuning, separately for the low and high register (`split`, MIDI): the offset
 * that best lays the heard pitches onto the pitch classes the tab uses.
 */
export function correctTuning(frames: PitchFrame[], pitches: number[], split: number): { frames: PitchFrame[]; low: number; high: number } {
  const voiced = frames.map((f) => f.midi).filter((m): m is number => m != null)
  const low = bestTuning(voiced.filter((m) => m < split), pitches).offset
  const high = bestTuning(voiced.filter((m) => m >= split), pitches).offset
  return { frames: frames.map((f) => (f.midi == null ? f : { ...f, midi: f.midi - (f.midi < split ? low : high) })), low, high }
}

/** The tuning offset that best lays heard pitches onto the tab's pitch classes, and how well (mean
 * distance in semitones, 0 = perfect fit). */
export function bestTuning(heard: number[], pitches: number[]): { offset: number; misfit: number } {
  const classes = [...new Set(pitches.map((p) => ((Math.round(p) % 12) + 12) % 12))]
  let offset = 0
  let bestCost = Infinity
  for (let o = -TUNING_RANGE; o <= TUNING_RANGE + 1e-9; o += TUNING_STEP) {
    let cost = 0
    for (const m of heard) cost += Math.min(1, ...classes.map((c) => pcDistance(m - o, c)))
    // equal fits: the smaller correction wins
    if (cost < bestCost - 1e-6 || (Math.abs(cost - bestCost) < 1e-6 && Math.abs(o) < Math.abs(offset))) {
      bestCost = cost
      offset = o
    }
  }
  return { offset: Math.round(offset * 100) / 100, misfit: heard.length ? bestCost / heard.length : 1 }
}

/** Semitone distance between pitch classes (0…6). */
const pcDistance = (a: number, b: number) => {
  const d = (((a - b) % 12) + 12) % 12
  return Math.min(d, 12 - d)
}

export interface AlignOptions {
  /** Shortest note, seconds. */
  minNote?: number
}

export interface Alignment {
  /** Frame index where each note starts. */
  onsets: number[]
  /** Frame index where each note's sound ends (silence after it starts there). */
  ends: number[]
  /** Mean per-frame cost of each note's run: high = the recording doesn't match the tab there. */
  misfit: number[]
}

// frame costs
const PITCH_SLOPE = 1.2
const UNVOICED_IN_NOTE = 0.9
const VOICED_IN_GAP = 2.5
const QUIET_GAP = 0.05
/** Cost of starting a note, and how much a level dip takes off it. */
const ENTER = 3
const DIP_BONUS = 2.5

/** Clarity below which the tone counts as fully broken by an attack. */
const ATTACK_CLARITY = 0.7

/**
 * How strongly a new note seems to start at frame t (0…1): the level climbs back after a dip, or the
 * tone loses its clarity for a moment, as a tongued "tu" / "du" does even on a repeated pitch. A
 * fading tail is no attack: after a real one the note sounds at full strength again. `levelOnly`
 * ignores the clarity, which also blurs where a slur glides to a new pitch.
 */
export function attackAt(frames: PitchFrame[], t: number, loud: number, levelOnly = false): number {
  const look = Math.round(0.03 / HOP)
  let lo = Infinity
  let minClarity = 1
  for (let k = Math.max(0, t - look); k <= t; k++) {
    lo = Math.min(lo, frames[k].rms)
    minClarity = Math.min(minClarity, frames[k].clarity)
  }
  let after = 0
  for (let k = t; k < Math.min(frames.length, t + look * 2); k++) after = Math.max(after, frames[k].rms)
  if (after < loud * SOUNDING) return 0
  // the attack is where the dip bottoms out, before the level climbs back: not anywhere after it
  const here = frames[t].rms
  if (here > lo * DIP_BOTTOM || here > frames[Math.min(frames.length - 1, t + 2)].rms) return levelOnly ? 0 : clarityBlur(minClarity)
  const rise = Math.max(0, 1 - lo / after)
  if (levelOnly) return rise
  return Math.max(rise, clarityBlur(minClarity))
}
const clarityBlur = (minClarity: number) => Math.min(1, Math.max(0, (1 - minClarity) / (1 - ATTACK_CLARITY)))
/** A frame this close to the dip's lowest level still counts as its bottom. */
const DIP_BOTTOM = 1.2
/** Level (share of a loud frame) a note must reach after its attack. */
const SOUNDING = 0.25

export function alignNotes(frames: PitchFrame[], pitches: number[], opts: AlignOptions = {}): Alignment {
  const T = frames.length
  const N = pitches.length
  const minLen = Math.max(1, Math.round((opts.minNote ?? 0.06) / HOP))
  const loud = frames.map((f) => f.rms).sort((a, b) => a - b)[Math.floor(T * 0.9)] || 1
  const quiet = (t: number) => frames[t].rms < loud * 0.08
  const noteCost = (t: number, i: number) => {
    const m = frames[t].midi
    if (m == null) return quiet(t) ? UNVOICED_IN_NOTE * 1.5 : UNVOICED_IN_NOTE
    return Math.min(4, pcDistance(m, pitches[i]) * PITCH_SLOPE)
  }
  const gapCost = (t: number) => (frames[t].midi == null || quiet(t) ? QUIET_GAP : VOICED_IN_GAP)
  const dip = frames.map((_, t) => attackAt(frames, t, loud))

  /*
   * Exact minimum note length: L[i][t] = in note i at frame t having sounded for at least minLen
   * frames (reached by staying, or by starting at t - minLen + 1 and holding through t); G[i][t] =
   * in the silence after note i. A note can only be left from L, so no note is shorter than
   * minLen. Holding costs come from per-note running sums of the frame costs.
   */
  const INF = Infinity
  const W = T + 1
  const L = new Float64Array((N + 1) * W).fill(INF)
  const G = new Float64Array((N + 1) * W).fill(INF)
  const fromL = new Uint8Array((N + 1) * W) // 0 stay, 1 started minLen frames ago
  const fromG = new Uint8Array((N + 1) * W) // 0 stay, 1 left L[i]
  const startFrom = new Uint8Array((N + 1) * W) // how note i was started at frame t: 1 L[i-1], 2 G[i-1], 3 lead
  const idx = (i: number, t: number) => i * W + t
  const lead = new Float64Array(W)
  for (let t = 1; t <= T; t++) lead[t] = lead[t - 1] + gapCost(t - 1)
  const sums = new Float64Array(W)
  for (let i = 1; i <= N; i++) {
    for (let t = 1; t <= T; t++) sums[t] = sums[t - 1] + noteCost(t - 1, i - 1)
    for (let t = 1; t <= T; t++) {
      // start note i at frame s = t - minLen (0-based), coming from the state at s
      const s0 = t - minLen
      if (s0 >= 0) {
        const fromPrev = i === 1 ? INF : L[idx(i - 1, s0)]
        const fromGap = i === 1 ? INF : G[idx(i - 1, s0)]
        const fromLead = i === 1 ? lead[s0] : INF
        const before = Math.min(fromPrev, fromGap, fromLead)
        if (before < INF) {
          const started = before + ENTER - DIP_BONUS * dip[s0] + sums[t] - sums[s0]
          if (started < L[idx(i, t)]) {
            L[idx(i, t)] = started
            fromL[idx(i, t)] = 1
            startFrom[idx(i, t)] = before === fromPrev ? 1 : before === fromGap ? 2 : 3
          }
        }
      }
      const stay = L[idx(i, t - 1)] + noteCost(t - 1, i - 1)
      if (stay < L[idx(i, t)]) {
        L[idx(i, t)] = stay
        fromL[idx(i, t)] = 0
      }
      const gapStay = G[idx(i, t - 1)]
      const gapLeave = L[idx(i, t - 1)]
      G[idx(i, t)] = Math.min(gapStay, gapLeave) + gapCost(t - 1)
      fromG[idx(i, t)] = gapLeave < gapStay ? 1 : 0
    }
  }
  if (Math.min(L[idx(N, T)], G[idx(N, T)]) === INF) throw new Error(`Cannot fit ${N} notes into ${(T * HOP).toFixed(1)} s of recording`)

  // backtrack from the better of "in the last note" or "silent after it"
  const onsets = new Array<number>(N).fill(0)
  const ends = new Array<number>(N).fill(T)
  let i = N
  let t = T
  let inGap = G[idx(N, T)] < L[idx(N, T)]
  while (i >= 1 && t >= 0) {
    if (inGap) {
      if (fromG[idx(i, t)] === 1) {
        ends[i - 1] = t - 1
        inGap = false
      }
      t--
      continue
    }
    if (fromL[idx(i, t)] === 0) {
      t--
      continue
    }
    const s0 = t - minLen
    onsets[i - 1] = s0
    const src = startFrom[idx(i, t)]
    if (src === 2) inGap = true
    else if (src === 1) ends[i - 2] = s0
    i--
    t = s0
  }
  const misfit = onsets.map((on, k) => {
    const end = Math.max(on + 1, ends[k])
    let s = 0
    for (let f = on; f < end; f++) s += noteCost(f, k)
    return s / (end - on)
  })
  return { onsets, ends, misfit }
}

/** The octave actually played: the tab's pitch moved by whole octaves to the median heard pitch. */
export function heardOctave(frames: PitchFrame[], from: number, to: number, pitch: number): number {
  const heard = frames
    .slice(from, Math.max(from + 1, to))
    .map((f) => f.midi)
    .filter((m): m is number => m != null && pcDistance(m, pitch) < 1.5)
    .sort((x, y) => x - y)
  if (!heard.length) return pitch
  const med = heard[heard.length >> 1]
  return pitch + 12 * Math.round((med - pitch) / 12)
}

/** Silence longer than this between notes becomes a rest (a breath). */
export const REST_MIN = 0.12
const round2 = (x: number) => Math.round(x * 100) / 100

/**
 * Notes with their measured timing, in beats at `bpm` (60 → 1 beat = 1 second of the recording).
 * Each note lasts until the next one starts; a long enough silence after it becomes a rest. The last
 * note lasts until its sound ends.
 */
export function timedNotes(notes: TuneNote[], frames: PitchFrame[], al: Alignment, bpm = 60): TuneNote[] {
  const beat = 60 / bpm
  // round the moments, not the lengths, so rounding never adds up along the section
  const at = (frame: number) => round2((frame * HOP) / beat)
  const out: TuneNote[] = []
  notes.forEach((n, k) => {
    const on = al.onsets[k]
    const next = k + 1 < notes.length ? al.onsets[k + 1] : al.ends[k]
    const soundEnd = Math.min(al.ends[k], next)
    const pitch = n.pitch == null ? null : heardOctave(frames, on, soundEnd, n.pitch)
    if ((next - soundEnd) * HOP >= REST_MIN) {
      out.push({ ...n, pitch, beats: round2(at(soundEnd) - at(on)) })
      out.push({ pitch: null, beats: round2(at(next) - at(soundEnd)) })
    } else out.push({ ...n, pitch, beats: round2(at(next) - at(on)) })
  })
  return out
}
