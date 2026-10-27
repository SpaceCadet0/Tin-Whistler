import type { Phrase, TuneNote, TuneSection } from '../music/types'

/**
 * Measured timing → musical lengths. A transcription times every note in seconds; a tune is written
 * in whole fractions of a beat that repeat. Here the measured sections (1 beat = 1 second, rests only
 * at the ends of groups) are put on a grid of sixteenths at one tempo for the whole tune:
 *
 *  1. the tempo comes from the typical short note (an eighth);
 *  2. a phrase repeated anywhere in the tune (same notes apart from the key, same attacks) is
 *     played alike everywhere: each of its lengths is the median over its repeats;
 *  3. groups of a section with the same number of notes are one pattern: its rhythm is the median
 *     length at each place, and a group close to it takes it (a misjudged split between repeated
 *     notes, an ornament that pulled a note);
 *  4. every length is rounded to the grid on its own, never against the recording's clock;
 *  5. a rest after a group follows the pattern too: when most of its groups breathe there, all of
 *     them do, for the same share of the last note's time; when most don't, none does and the note
 *     takes the time. The last group of a section keeps what the recording did.
 */

/** Grid steps per beat: sixteenths when a beat is a quarter. */
export const STEPS_PER_BEAT = 4
/** A group takes its pattern's rhythm when it differs by at most this many steps per note. */
const CLOSE_PER_NOTE = 1.5
/** IOIs longer than this many eighths (held notes, endings) say nothing about the tempo. */
const TEMPO_IOI_MAX = 3

export interface Quantized {
  bpm: number
  sections: TuneSection[]
}

interface Group {
  /** Sounding notes of the group. */
  notes: TuneNote[]
  /** Seconds from each note's onset to the next one's (the rest after the group included). */
  iois: number[]
  /** Seconds of rest the recording had after the group (0: none). */
  rest: number
}

/** A group on the grid: steps between onsets, and steps of rest after it. */
interface GridGroup {
  notes: TuneNote[]
  steps: number[]
  rest: number
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1]

/** Each sounding note with the time to the next onset (its own length plus a rest after it). */
function toGroup(phrase: Phrase): Group {
  const notes: TuneNote[] = []
  const iois: number[] = []
  let rest = 0
  for (const n of phrase) {
    if (n.pitch == null) {
      if (iois.length) {
        iois[iois.length - 1] += n.beats
        rest += n.beats
      }
    } else {
      notes.push(n)
      iois.push(n.beats)
      rest = 0
    }
  }
  return { notes, iois, rest }
}

/**
 * The eighth in seconds: the typical short note, refined by least squares over the short notes.
 */
export function eighthOf(iois: number[]): number {
  const sorted = [...iois].sort((a, b) => a - b)
  const short = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)))
  let eighth = short[short.length >> 1]
  for (let pass = 0; pass < 3; pass++) {
    const half = eighth / 2
    const used = iois.filter((x) => x < eighth * TEMPO_IOI_MAX)
    const n = used.map((x) => Math.max(1, Math.round(x / half)))
    eighth = (2 * used.reduce((a, x, i) => a + x * n[i], 0)) / n.reduce((a, k) => a + k * k, 0)
  }
  return eighth
}

/**
 * A length in grid steps, rounded on its own: the tune is written in repeating lengths, not timed
 * against the recording, so a slightly wrong tempo must not make the same rhythm round differently
 * further along. Held notes round coarser: from two beats to eighths, from four to whole beats.
 */
function toSteps(secs: number, step: number): number {
  const raw = secs / step
  const unit = raw >= 4 * STEPS_PER_BEAT ? STEPS_PER_BEAT : raw >= 2 * STEPS_PER_BEAT ? 2 : 1
  return Math.max(1, Math.round(raw / unit) * unit)
}

/** What makes two groups the same phrase: the steps between their notes and their attacks. */
function signature(g: Group): string {
  return g.notes.map((n, i) => `${i ? Math.round(n.pitch! - g.notes[i - 1].pitch!) : ''}${n.attack ?? 't'}`).join(',')
}

/** Lengths at each place: the median over the groups. */
const medianIois = (gs: Group[]) => gs[0].iois.map((_, k) => median(gs.map((g) => g.iois[k])))

/**
 * 2) A phrase repeated anywhere in the tune takes the median lengths of all its repeats. A section's
 * last group is an ending (a held last note, a breath before the next section): it keeps its own.
 */
function unifyRepeats(sections: Group[][]): Group[][] {
  const pooled = (g: Group, i: number, gs: Group[]) => g.notes.length > 1 && i < gs.length - 1
  const pools = new Map<string, Group[]>()
  for (const gs of sections) gs.forEach((g, i) => pooled(g, i, gs) && pools.set(signature(g), [...(pools.get(signature(g)) ?? []), g]))
  const shared = new Map([...pools].filter(([, gs]) => gs.length > 1).map(([key, gs]) => [key, medianIois(gs)]))
  return sections.map((gs) =>
    gs.map((g, i) => {
      const iois = pooled(g, i, gs) ? shared.get(signature(g)) : undefined
      return iois ? { ...g, iois } : g
    }),
  )
}

/** 3–5) One section on the grid, its groups of the same size sharing a rhythm and a rest. */
function sectionOnGrid(groups: Group[], step: number): GridGroup[] {
  const last = groups.length - 1
  const own = groups.map((g): GridGroup => {
    const steps = g.iois.map((x) => toSteps(x, step))
    const lastSteps = steps[steps.length - 1] ?? 0
    const rest = g.rest > 0 && lastSteps > 1 ? Math.min(lastSteps - 1, Math.max(1, Math.round((lastSteps * g.rest) / g.iois[g.iois.length - 1]))) : 0
    return { notes: g.notes, steps, rest }
  })
  const bySize = new Map<number, number[]>()
  groups.forEach((g, i) => {
    if (i < last && g.notes.length) bySize.set(g.notes.length, [...(bySize.get(g.notes.length) ?? []), i])
  })
  const out = [...own]
  for (const members of bySize.values()) {
    const gs = members.map((i) => groups[i])
    const pattern = medianIois(gs).map((x) => toSteps(x, step))
    const resting = gs.filter((g) => g.rest > 0)
    // a tie keeps what each group did; a clear majority decides for all
    const verdict = resting.length * 2 > gs.length ? 'rest' : resting.length * 2 < gs.length ? 'none' : 'own'
    // the rest's share of the last note's time, as the resting groups breathe
    const share = resting.length ? median(resting.map((g) => g.rest / g.iois[g.iois.length - 1])) : 0
    for (const i of members) {
      const g = own[i]
      const steps = g.steps.reduce((s, x, k) => s + Math.abs(x - pattern[k]), 0) <= g.notes.length * CLOSE_PER_NOTE ? pattern : g.steps
      const lastSteps = steps[steps.length - 1]
      const shared = lastSteps > 1 ? Math.min(lastSteps - 1, Math.max(1, Math.round(lastSteps * share))) : 0
      out[i] = { ...g, steps, rest: verdict === 'rest' ? shared : verdict === 'none' ? 0 : g.rest }
    }
  }
  return out
}

/** Back to notes: the group's last note gives up the rest's steps. */
function groupPhrase(g: GridGroup): Phrase {
  const notes = g.notes.map((n, i): TuneNote => ({ ...n, beats: g.steps[i] / STEPS_PER_BEAT }))
  if (!g.rest || !notes.length) return notes
  const lastSteps = g.steps[g.steps.length - 1]
  notes[notes.length - 1] = { ...notes[notes.length - 1], beats: (lastSteps - g.rest) / STEPS_PER_BEAT }
  return [...notes, { pitch: null, beats: g.rest / STEPS_PER_BEAT }]
}

/** Measured sections (1 beat = 1 second) → sections in grid lengths at the returned tempo. */
export function quantizeSections(sections: TuneSection[]): Quantized {
  const groups = unifyRepeats(sections.map((s) => s.phrases.map(toGroup)))
  // the tempo counts quarters: two eighths
  const bpm = Math.round(60 / (2 * eighthOf(groups.flat().flatMap((g) => g.iois))))
  const step = 60 / bpm / STEPS_PER_BEAT
  return {
    bpm,
    sections: sections.map((s, si) => ({ ...s, phrases: sectionOnGrid(groups[si], step).map(groupPhrase) })),
  }
}
