import type { TuneNote, TuneSection } from '../music/types'
import { getWhistle, WHISTLE_KEYS } from '../music/whistles'
import { alignNotes, attackAt, correctTuning, HOP, pitchTrack, timedNotes, type Alignment, type PitchFrame } from './align'
import { lightPaper, paperOf, roundMarks, toHouseColours } from './palette'
import { quantizeSections } from './quantize'
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

/** What counts as a mark: this far (RGB distance) from the paper. Bold tab marks are, faded pictures behind them aren't. */
const STRONG_MARK = 120
/** A mark's anti-aliased edge: fainter, kept when it touches a kept mark. */
const EDGE_MARK = 30
/** A blob of marks this many dot sizes both wide and tall is no tab mark (hands, pictures, logos)... */
const BLOB = 2.5
/** ...nor one this many dot sizes tall (frame lines) or wide (rules across the page). */
const TALL = 8
const WIDE = 30
/** Edge pixels this far from a kept mark still belong to it. */
const EDGE_REACH = 2
/** A blob this grey (channel spread) and this light (luminance) is a speck of the picture behind the tab. */
const SPECK_TINT = 25
const SPECK_LIGHT = 120

/**
 * Keep only the tab on its page: dots and rings, ornament letters, "+" marks and articulation, all
 * of them small marks. Anything bigger (a hand that stayed still, a picture or logo behind the tab,
 * the lines of a frame) and the faded background turn to white paper. The marks keep their colours.
 */
export function cleanTab(img: RGBAImage): RGBAImage {
  const { width: W, height: H, data: d } = img
  const paper = paperOf(img)
  const dots = roundMarks(img, paper)
  if (!dots.length) return img
  const D = [...dots.map((t) => t.x1 - t.x0 + 1)].sort((a, b) => a - b)[dots.length >> 1]
  const away = (i: number) => Math.hypot(d[i * 4] - paper[0], d[i * 4 + 1] - paper[1], d[i * 4 + 2] - paper[2])
  const strong = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) strong[i] = away(i) > STRONG_MARK ? 1 : 0
  // connected blobs of strong marks: the small ones are the tab
  const keep = new Uint8Array(W * H)
  const seen = new Uint8Array(W * H)
  const stack: number[] = []
  const blob: number[] = []
  for (let s = 0; s < W * H; s++) {
    if (!strong[s] || seen[s]) continue
    seen[s] = 1
    stack.push(s)
    blob.length = 0
    let [x0, x1, y0, y1] = [W, 0, H, 0]
    while (stack.length) {
      const i = stack.pop()!
      blob.push(i)
      const x = i % W
      const y = (i - x) / W
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || seen[j] || !strong[j] || Math.abs((j % W) - x) > 1) continue
        seen[j] = 1
        stack.push(j)
      }
    }
    const w = x1 - x0 + 1
    const h = y1 - y0 + 1
    if ((w > D * BLOB && h > D * BLOB) || h > D * TALL || w > D * WIDE) continue
    // the tab is cut out with margins round its marks: what reaches the edge is the picture behind it
    if (x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1) continue
    // tab marks are dark at their core (dots, text, even a thin dash) or clearly coloured (ornaments);
    // a speck of a faded picture is light grey all through
    const lum = (i: number) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
    const core = blob.reduce((a, i) => (lum(i) < lum(a) ? i : a), blob[0])
    const tint = Math.max(d[core * 4], d[core * 4 + 1], d[core * 4 + 2]) - Math.min(d[core * 4], d[core * 4 + 1], d[core * 4 + 2])
    if (tint < SPECK_TINT && lum(core) > SPECK_LIGHT) continue
    for (const i of blob) keep[i] = 1
  }
  // the kept marks' soft edges come along; everything else becomes white paper
  const out = new Uint8Array(W * H * 4).fill(255)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      let near = keep[i] === 1
      for (let dy = -EDGE_REACH; !near && dy <= EDGE_REACH; dy++) {
        for (let dx = -EDGE_REACH; !near && dx <= EDGE_REACH; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx >= 0 && xx < W && yy >= 0 && yy < H && keep[yy * W + xx] && away(i) > EDGE_MARK) near = true
        }
      }
      if (near) for (let k = 0; k < 3; k++) out[i * 4 + k] = d[i * 4 + k]
    }
  }
  return { width: W, height: H, data: out }
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
