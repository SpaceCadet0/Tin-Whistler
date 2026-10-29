import { alignNotes, HOP, type Alignment, type PitchFrame } from './align'

/**
 * Notes the tab and the recording disagree on, put right by the recording. A tab read off video
 * frames can misread a hole (a blurred dot, a ring cutting into it), and the alignment then squeezes
 * the wrong note to nothing and lets a neighbour take its sound. So each such note is tried as the
 * notes of the tune a few semitones round it, the page aligned again each time, and of those that
 * make the recording fit clearly better the best fit is kept, the nearer winning a close call. A long run of misfits is the alignment slipping (a page
 * played differently, a repeat), not the tab, and so are the first and last notes of a page, where
 * its stretch of the recording is least sure, and a page that fits the recording poorly throughout:
 * those stay as written.
 */

/** A note is in question when its frames fit this badly (mean cost, as in the alignment). */
export const MISFIT = 1
/** A misread hole moves a note a few semitones at most (a missed "+" is an octave, which the timing already hears). */
const MAX_SHIFT = 5
/** Misfits in a row up to this many can be misreads (one wrong note puts its neighbour off too); more is a slip. */
const MAX_RUN = 2
/** Notes this close to either end of a page are left alone: the page's stretch of the recording is least sure there. */
const PAGE_EDGE = 2
/** The note put in must hold its own stretch of sound this long (seconds): squeezed to nothing, any note "fits". */
const MIN_HELD = 0.08
/** Misfit charged per semitone a change moves the note: the nearer note wins a close call. */
const SHIFT_COST = 0.3
/** A page with more than this share of misfits is aligned too poorly to tell a misread from a slip. */
const MAX_MISFIT_SHARE = 0.25
/** The page's total misfit must drop by this much for a change to count: the sound clearly prefers it. */
const MIN_GAIN = 1

const total = (al: Alignment) => al.misfit.reduce((s, m) => s + m, 0)
/** Frames from a note's start to the next one's (or its own end, for the last). */
const held = (al: Alignment, k: number) => (k + 1 < al.onsets.length ? al.onsets[k + 1] : al.ends[k]) - al.onsets[k]
/** Notes squeezed shorter than MIN_HELD: their sound went to a neighbour. */
const squeezed = (al: Alignment) => al.onsets.filter((_, k) => held(al, k) * HOP < MIN_HELD).length
/** Sounding frames no note claims (taken for silence between notes). */
function unclaimed(frames: PitchFrame[], al: Alignment): number {
  let n = 0
  for (let k = 0; k + 1 < al.onsets.length; k++) for (let i = al.ends[k]; i < al.onsets[k + 1]; i++) if (frames[i]?.midi != null) n++
  return n
}

/**
 * Whether the page aligned with the changed note fits the recording clearly better: less misfit,
 * the note holding its own sound, and no other note squeezed nor sound left over for it.
 */
function better(frames: PitchFrame[], k: number, now: Alignment, tried: Alignment, gain: number): boolean {
  return (
    held(tried, k) * HOP >= MIN_HELD &&
    tried.misfit[k] <= MISFIT &&
    squeezed(tried) <= squeezed(now) &&
    unclaimed(frames, tried) <= unclaimed(frames, now) &&
    total(tried) <= total(now) - gain
  )
}

/** Notes the misread one may stand for: a few semitones round it, in the tune's scale (pitch classes the page uses). */
function candidates(pitches: number[], k: number): number[] {
  const scale = new Set(pitches.map((p) => ((Math.round(p) % 12) + 12) % 12))
  const out: number[] = []
  for (let shift = -MAX_SHIFT; shift <= MAX_SHIFT; shift++) {
    const p = pitches[k] + shift
    if (shift !== 0 && scale.has(((Math.round(p) % 12) + 12) % 12)) out.push(p)
  }
  return out
}

/** Indexes of the misfits that stand in runs short enough to be misreads. */
function shortRuns(misfit: number[]): number[] {
  const out: number[] = []
  let run: number[] = []
  for (let k = 0; k <= misfit.length; k++) {
    if (k < misfit.length && misfit[k] > MISFIT) {
      run.push(k)
      continue
    }
    if (run.length && run.length <= MAX_RUN) out.push(...run)
    run = []
  }
  return out
}

export interface SoundFix {
  pitches: number[]
  al: Alignment
  /** Notes (indexes) whose pitch now comes from the recording. */
  fixed: number[]
}

/**
 * The page's notes with misreads replaced by what the recording plays, worst first. `playable` says
 * whether the whistle has a note.
 */
export function fixBySound(frames: PitchFrame[], pitches: number[], al: Alignment, playable: (midi: number) => boolean): SoundFix {
  let best = { pitches, al }
  const fixed: number[] = []
  if (al.misfit.filter((m) => m > MISFIT).length > pitches.length * MAX_MISFIT_SHARE) return { ...best, fixed }
  const worst = shortRuns(al.misfit)
    .filter((k) => k >= PAGE_EDGE && k < pitches.length - PAGE_EDGE)
    .sort((x, y) => al.misfit[y] - al.misfit[x])
  for (const k of worst) {
    if (best.al.misfit[k] <= MISFIT) continue
    // the best fit wins, a little ahead for being near the tab: a misread hole is most often one hole
    let pick: { pitches: number[]; al: Alignment; score: number } | null = null
    for (const pitch of candidates(pitches, k).filter(playable)) {
      const tried = best.pitches.map((p, i) => (i === k ? pitch : p))
      const al2 = alignNotes(frames, tried)
      if (!better(frames, k, best.al, al2, MIN_GAIN)) continue
      const score = total(al2) + SHIFT_COST * Math.abs(pitch - pitches[k])
      if (!pick || score < pick.score) pick = { pitches: tried, al: al2, score }
    }
    if (!pick) continue
    best = pick
    fixed.push(k)
  }
  return { ...best, fixed: fixed.sort((x, y) => x - y) }
}
