import type { TuneNote, TuneSection } from '../music/types'
import { getWhistle, WHISTLE_KEYS } from '../music/whistles'
import { alignNotes, attackAt, correctTuning, HOP, pitchTrack, timedNotes, type Alignment, type PitchFrame } from './align'
import { lightPaper, toHouseColours } from './palette'
import { quantizeSections } from './quantize'
import { cleanTab } from './tabClean'
import { recognizeTab, type RecognitionResult, type RGBAImage } from './tabImage'
import { cropImage, medianFrame, tabRegion } from './videoFrames'

/**
 * A tutorial video → a tune, in steps that run anywhere (a web worker, the CLI): a clean picture of
 * each tab page, then the notes of all pages timed against the recording and written in musical
 * lengths. Reading the video file itself (frames, sound) is the caller's job.
 */

// --- 1. the page picture -------------------------------------------------------------------------

/** Level steps for finding when the playing starts, seconds. */
const LEVEL_HOP = 0.02
/** A page has settled on screen this long after it appears (fades, page turns). */
const PAGE_SETTLE = 0.25
/** The playing has started when the level stays above this share of a loud moment... */
const PLAYING = 0.3
/** ...for this many level steps. */
const PLAYING_RUN = 3
/** Frames stop this long before the first note: its highlight may light up just ahead of it. */
const BEFORE_PLAY = 0.15
/** A quiet stretch shorter than this is too short to trust: the page is sampled across its whole time. */
const MIN_QUIET = 0.6

/** The recording's level (RMS) in steps of LEVEL_HOP seconds. */
export function levelsOf(samples: Float32Array, sampleRate: number): Float32Array {
  const step = Math.round(LEVEL_HOP * sampleRate)
  const out = new Float32Array(Math.floor(samples.length / step))
  for (let k = 0; k < out.length; k++) {
    let s = 0
    for (let i = k * step; i < (k + 1) * step; i++) s += samples[i] * samples[i]
    out[k] = Math.sqrt(s / step)
  }
  return out
}

/**
 * The stretch of a page's time before anyone plays it: the page is on screen but no note is lit
 * yet, so its frames show the clean page. Null when the playing goes straight on (no such stretch).
 */
export function quietWindow(levels: Float32Array, start: number, end: number): [number, number] | null {
  const loud = [...levels].sort((a, b) => a - b)[Math.floor(levels.length * 0.9)] || 1
  const from = start + PAGE_SETTLE
  let run = 0
  let onset = end
  for (let k = Math.ceil(from / LEVEL_HOP); k < Math.min(levels.length, end / LEVEL_HOP); k++) {
    run = levels[k] > loud * PLAYING ? run + 1 : 0
    if (run >= PLAYING_RUN) {
      onset = (k - PLAYING_RUN + 1) * LEVEL_HOP
      break
    }
  }
  const to = Math.min(end, onset - BEFORE_PLAY)
  return to - from >= MIN_QUIET ? [from, to] : null
}

/** Frames taken for a page's median: some from the quiet stretch, more from across the page's time. */
const QUIET_FRAMES = 5
const SPREAD_FRAMES = 9
/** The page's time sampled away from its edges (fades, page turns). */
const SPREAD_FROM = 0.1
const SPREAD_TO = 0.9

/**
 * When to take a page's frames. Before the playing starts the page is clean, though the highlight
 * may already wait on the first note; across the page's time the highlight and the hands move. A
 * median over both kinds drops all of it: the waiting highlight is in fewer than half the frames.
 */
export function pageFrameTimes(levels: Float32Array, start: number, end: number): number[] {
  const spread = (a: number, b: number, n: number) => Array.from({ length: n }, (_, k) => a + ((b - a) * k) / Math.max(1, n - 1))
  const quiet = quietWindow(levels, start, end)
  const len = end - start
  return [...(quiet ? spread(quiet[0], quiet[1], QUIET_FRAMES) : []), ...spread(start + len * SPREAD_FROM, start + len * SPREAD_TO, SPREAD_FRAMES)]
}

/**
 * One tab page from frames of the video taken while it was on screen: their median (the moving
 * highlight and hands drop out), a dark page flipped to light, the tab cut out round its dots at
 * full resolution and cleaned of everything but its marks, then read. Null when there is no tab.
 */
export function pagePanel(frames: RGBAImage[]): { panel: RGBAImage; result: RecognitionResult } | null {
  const light = lightPaper(medianFrame(frames))
  const region = tabRegion(light)
  if (!region) return null
  const panel = cleanTab(cropImage(light, region))
  const result = recognizeTab(toHouseColours(panel), 'D')
  return result.systems.length ? { panel, result } : null
}

// --- 2. the notes in time ------------------------------------------------------------------------

/** A page of the tune: its notes read as D-whistle fingerings, and when it was on screen. */
export interface VideoPage {
  section: TuneSection
  start: number
  end: number
}

export interface VideoTune {
  whistle: string
  bpm: number
  sections: TuneSection[]
  /** Every key tried, best first: how badly the recording fits the notes in it. */
  keyFits: { id: string; misfit: number }[]
  /** Notes where the recording doesn't match the tab (section and note, from 1). */
  doubtful: { section: number; note: number }[]
}

/** A page is played until a little after the next one appears (pages show up ahead of the playing). */
const PLAYED_PAST = 4
/** The keys are judged on the first pages only: enough to tell them apart, quicker on a phone. */
const KEY_PAGES = 2
/** Mean cost per frame above which a note doesn't match the recording. */
const MISFIT = 1
/** Below this attack strength a note with no articulation mark is taken as slurred. */
const SLUR_ATTACK = 0.25
/** The fingerings are read as a D whistle. */
const READ_AS = 74
/** At least this many frames per note in a page's stretch of the recording. */
const FRAMES_PER_NOTE = 30

const sounding = (s: TuneSection) => s.phrases.flat().filter((n) => n.pitch != null)

/**
 * Align the pages one after another, each in its own stretch of the recording (from where the
 * previous page's last note ended to a little after the next page appears): little memory, so a
 * phone copes with a whole tune.
 */
function alignChain(frames: PitchFrame[], pages: VideoPage[], shift: number) {
  const out: { tuned: PitchFrame[]; al: Alignment; misfit: number }[] = []
  let cursor = Math.round(pages[0].start / HOP)
  pages.forEach((page, k) => {
    const pitches = sounding(page.section).map((n) => n.pitch! + shift)
    const next = k + 1 < pages.length ? pages[k + 1].start : page.end
    const to = Math.min(frames.length, Math.max(cursor + pitches.length * FRAMES_PER_NOTE, Math.round((next + PLAYED_PAST) / HOP)))
    const slice = frames.slice(cursor, to)
    const tuning = correctTuning(slice, pitches, READ_AS + shift + 11.5)
    const al = alignNotes(tuning.frames, pitches)
    out.push({ tuned: tuning.frames, al, misfit: al.misfit.reduce((a, b) => a + b, 0) / Math.max(1, pitches.length) })
    cursor += Math.min(slice.length - 1, al.ends[al.ends.length - 1])
  })
  return out
}

/** The notes of the pages timed against the recording, in the whistle that fits it best (or `whistle`). */
export function buildVideoTune(pages: VideoPage[], samples: Float32Array, sampleRate: number, whistle?: string): VideoTune {
  const frames = pitchTrack(samples, sampleRate)
  const keys = WHISTLE_KEYS.filter((w) => w.id !== 'lowD' && (!whistle || w.id === whistle || (whistle === 'lowD' && w.id === 'D')))
  const keyFits = keys
    .map((w) => {
      const chain = alignChain(frames, pages.slice(0, KEY_PAGES), w.baseMidi - READ_AS)
      return { id: w.id, misfit: chain.reduce((a, c) => a + c.misfit, 0) / chain.length }
    })
    .sort((a, b) => a.misfit - b.misfit)
  let id = whistle ?? keyFits[0].id
  // a low D plays the D whistle's fingerings an octave down
  const heard = frames.flatMap((f) => (f.midi == null ? [] : [f.midi])).sort((a, b) => a - b)
  if (!whistle && id === 'D' && heard[heard.length >> 1] < READ_AS) id = 'lowD'
  const shift = getWhistle(id).baseMidi - READ_AS
  const chain = alignChain(frames, pages, shift)
  const doubtful: { section: number; note: number }[] = []
  const measured = pages.map((page, si): TuneSection => {
    const { tuned, al } = chain[si]
    const notes = sounding(page.section).map((n): TuneNote => ({ ...n, pitch: n.pitch! + shift }))
    al.misfit.forEach((m, k) => m > MISFIT && doubtful.push({ section: si + 1, note: k + 1 }))
    const loud = tuned.map((f) => f.rms).sort((a, b) => a - b)[Math.floor(tuned.length * 0.9)]
    // no articulation under a note: the recording decides, a smooth change of pitch is a slur
    const articulated = notes.map((n, k): TuneNote => (n.attack || k === 0 || attackAt(tuned, al.onsets[k], loud, true) >= SLUR_ATTACK ? n : { ...n, attack: 'slur' }))
    const groupEnds = page.section.phrases.flatMap((p) => p.filter((n) => n.pitch != null).map((_, k, a) => k === a.length - 1))
    const timed = timedNotes(articulated, tuned, al, 60, groupEnds)
    // back into the page's groups: every sounding note brings the rest that follows it
    let cursor = 0
    const phrases = page.section.phrases.map((p) =>
      p
        .filter((n) => n.pitch != null)
        .flatMap(() => {
          const note = timed[cursor++]
          return timed[cursor] && timed[cursor].pitch == null ? [note, timed[cursor++]] : [note]
        }),
    )
    return { ...page.section, phrases }
  })
  const written = quantizeSections(measured)
  return { whistle: id, bpm: written.bpm, sections: written.sections, keyFits, doubtful }
}
