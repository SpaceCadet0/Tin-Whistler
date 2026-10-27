/**
 * Duet video → built-in duet tune: a tutorial that teaches two whistles' parts, one page per chapter
 * ("Section 1"…), each part drawn in its own dot colour, the parts played one after the other.
 *
 *   npm run transcribe-duet -- <youtube-url> --pages p1.png,p2.png,… --parts D=brown,lowD=green
 *                              [--id my-tune] [--title "My Tune"]
 *
 *  1. each page (a screenshot, in chapter order) is split into its lines, each read with its own
 *     colour (src/import/duetPage.ts); lines of different colours one above the other sound together;
 *  2. in each chapter's sound both parts are aligned one after the other, in the order that fits
 *     the recording better; each note gets its onset, its octave and (where the tab shows no
 *     articulation) a tongued or slurred start;
 *  3. the part that leads the page is written in musical lengths (src/import/quantize.ts); the other
 *     is laid onto its beats through the columns they share, in between by its own timing
 *     (src/import/duetTiming.ts);
 *  4. writes <id>.ts (a duet Tune in the app's tab notation) and report.json into .tmp-video/<id>/.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { alignNotes, attackAt, correctTuning, pitchTrack, timedNotes, type Alignment } from '../src/import/align'
import { readDuetPage } from '../src/import/duetPage'
import { columnSpacing, dropStrays, mergeCutSlide, partnerOnsets, partPhrases, splitRests, type PlacedNote } from '../src/import/duetTiming'
import { quantizeSections } from '../src/import/quantize'
import { sectionFromRecognition } from '../src/import/tabImage'
import { sectionToTabText } from '../src/music/tabText'
import type { Phrase, TuneNote, TuneSection } from '../src/music/types'
import { getWhistle } from '../src/music/whistles'
import { audioSamples, download, fetchInfo, imageFile } from './video/media'

const SAMPLE_RATE = 22050
/** Below this attack strength a note with no articulation mark is taken as slurred. */
const SLUR_ATTACK = 0.25
/** MIDI note splitting the two registers when the player's tuning is undone. */
const REGISTER_SPLIT = 80
/** The D whistle the recogniser reads fingerings for. */
const READ_AS = getWhistle('D').baseMidi

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { id: { type: 'string' }, title: { type: 'string' }, pages: { type: 'string' }, parts: { type: 'string' } },
})
const url = positionals[0]
if (!url || !values.pages || !values.parts) {
  console.error('Usage: npm run transcribe-duet -- <youtube-url> --pages p1.png,p2.png,… --parts D=brown,lowD=green [--id id] [--title title]')
  process.exit(1)
}

/** A colour's everyday name from its hue: how the parts are named on the command line. */
const colourName = (hue: number) => (hue < 50 || hue >= 330 ? 'brown' : hue < 75 ? 'yellow' : hue < 180 ? 'green' : hue < 260 ? 'blue' : 'purple')

const info = fetchInfo(url)
const id = values.id ?? info.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const outDir = join('.tmp-video', id)
mkdirSync(outDir, { recursive: true })
const video = join(outDir, 'video.mp4')
if (!existsSync(video)) download(url, video)
const pages = values.pages.split(',').filter(Boolean)
const chapters = info.chapters.filter((c) => /section/i.test(c.title))
if (chapters.length !== pages.length) throw new Error(`${pages.length} pages for ${chapters.length} "Section" chapters`)
const parts = values.parts.split(',').map((p) => {
  const [whistle, colour] = p.split('=')
  return { whistle, colour, shift: getWhistle(whistle).baseMidi - READ_AS }
})
const samples = audioSamples(video, SAMPLE_RATE)

/** A page's notes of one part: where they stand and how they end their group. */
type PageNote = { note: TuneNote; row: number; x: number; groupEnd: boolean }

interface SectionHeard {
  /** Per part: its notes on the page and as heard (empty when the part is silent in the section). */
  placed: PlacedNote[][]
  /** Mean alignment cost of the notes: high = the recording doesn't match the page. */
  misfit: number
  /** The parts in the order they were played. */
  order: number[]
}

/** 1) A page's lines → each part's notes with their row, column x and group ends. */
function readPage(file: string): PageNote[][] {
  const lines = readDuetPage(imageFile(file))
    .map(dropStrays)
    .filter((l) => l.columns.length)
  const notes: PageNote[][] = parts.map(() => [])
  let row = -1
  const inRow = new Set<number>()
  for (const line of lines) {
    const part = parts.findIndex((p) => p.colour === colourName(line.hue))
    if (part < 0) throw new Error(`${file}: a line in ${colourName(line.hue)} (hue ${Math.round(line.hue)}), not one of the parts`)
    // a part already on this row starts the next row; another part's line stands under it
    if (row < 0 || inRow.has(part)) {
      row++
      inRow.clear()
    }
    inRow.add(part)
    const section = sectionFromRecognition({ systems: [line], dotSize: 0, warnings: [] }, 's', 'S', 'D')
    const flat = mergeCutSlide(section.phrases.flat())
    let k = 0
    for (const phrase of section.phrases) {
      phrase.forEach((_, j) => {
        const n = flat[k]
        notes[part].push({ note: { ...n, pitch: n.pitch! + parts[part].shift }, row, x: line.columns[k].x, groupEnd: j === phrase.length - 1 })
        k++
      })
    }
  }
  return notes
}

/** 2) Both parts in one chapter's sound, in the order that fits better. */
function hearSection(notes: PageNote[][], from: number, to: number): SectionHeard {
  const frames = pitchTrack(samples.subarray(Math.round(from * SAMPLE_RATE), Math.round(to * SAMPLE_RATE)), SAMPLE_RATE)
  const present = parts.map((_, p) => p).filter((p) => notes[p].length)
  const orders = present.length > 1 ? [present, [...present].reverse()] : [present]
  const tries = orders.map((order) => {
    const pitches = order.flatMap((p) => notes[p].map((n) => n.note.pitch!))
    const tuning = correctTuning(frames, pitches, REGISTER_SPLIT)
    const al = alignNotes(tuning.frames, pitches)
    return { order, tuning, al, misfit: al.misfit.reduce((a, b) => a + b, 0) / pitches.length }
  })
  tries.sort((a, b) => a.misfit - b.misfit)
  const { order, tuning, al, misfit } = tries[0]
  const loud = tuning.frames.map((f) => f.rms).sort((a, b) => a - b)[Math.floor(tuning.frames.length * 0.9)]
  const placed: PlacedNote[][] = parts.map(() => [])
  let offset = 0
  for (const p of order) {
    const ns = notes[p]
    const sub: Alignment = { onsets: al.onsets.slice(offset, offset + ns.length), ends: al.ends.slice(offset, offset + ns.length), misfit: al.misfit.slice(offset, offset + ns.length) }
    offset += ns.length
    // no articulation under a note: the recording decides, a smooth change of pitch is a slur
    const articulated = ns.map((n, k): TuneNote => (n.note.attack ? n.note : { ...n.note, attack: k === 0 || attackAt(tuning.frames, sub.onsets[k], loud, true) >= SLUR_ATTACK ? 'tongue' : 'slur' }))
    const timed = timedNotes(articulated, tuning.frames, sub, 60, ns.map((n) => n.groupEnd))
    let t = 0
    for (let i = 0; i < timed.length; i++) {
      const n = timed[i]
      if (n.pitch == null) continue
      const rest = timed[i + 1]?.pitch == null ? (timed[i + 1]?.beats ?? 0) : 0
      const k = placed[p].length
      placed[p].push({ note: { ...n, beats: 1 }, row: ns[k].row, x: ns[k].x, at: t, sounded: n.beats, rest, groupEnd: ns[k].groupEnd })
      t += n.beats + rest
    }
  }
  return { placed, misfit, order }
}

/** Phrases of a part's measured notes (1 beat = 1 second), rows becoming display lines. */
function measured(placed: PlacedNote[], name: string, i: number): TuneSection {
  const phrases: Phrase[] = []
  const lineBreaks: number[] = []
  let group: TuneNote[] = []
  placed.forEach((n, k) => {
    if (!group.length && k > 0 && n.row !== placed[k - 1].row) lineBreaks.push(phrases.length)
    group.push({ ...n.note, beats: n.sounded })
    if (n.rest > 0) group.push({ pitch: null, beats: n.rest })
    if (n.groupEnd) {
      phrases.push(group)
      group = []
    }
  })
  if (group.length) phrases.push(group)
  return { id: `s${i + 1}`, name, phrases, lineBreaks }
}

const beatsOf = (ps: Phrase[]) => ps.reduce((s, p) => s + p.reduce((a, n) => a + n.beats, 0), 0)
/** Beat where each phrase starts. */
const phraseStarts = (ps: Phrase[]) => ps.map((_, i) => beatsOf(ps.slice(0, i)))
/** Display lines: a phrase starts a new line where the leading part's row changes. */
const linesAt = (ps: Phrase[], rowStarts: number[]) => {
  const starts = phraseStarts(ps)
  return rowStarts
    .slice(1)
    .map((r) => starts.findIndex((s) => s >= r - 1e-6))
    .filter((i, k, a) => i > 0 && a.indexOf(i) === k)
}

const heard = pages.map((file, i) => {
  const notes = readPage(file)
  const r = hearSection(notes, chapters[i].start, chapters[i].end)
  console.log(`· Section ${i + 1}: ${parts.map((p, k) => `${p.whistle} ${notes[k].length}`).join(', ')} notes; played ${r.order.map((p) => parts[p].whistle).join(' then ')}; misfit ${r.misfit.toFixed(2)}`)
  return r
})

// 3) the part leading each page sets the beats: the one whose line starts further left, or the longer
const leads = heard.map(({ placed }) => {
  const present = placed.map((ns, p) => ({ p, ns })).filter((x) => x.ns.length)
  const spacing = columnSpacing(present[0].ns.map((n) => n.x))
  present.sort((a, b) => a.ns[0].row - b.ns[0].row || (Math.abs(a.ns[0].x - b.ns[0].x) > spacing * 0.5 ? a.ns[0].x - b.ns[0].x : b.ns.length - a.ns.length))
  return present[0].p
})
const written = quantizeSections(heard.map((h, i) => measured(h.placed[leads[i]], `Section ${i + 1}`, i)))
const bpm = written.bpm
const sections = heard.map((h, i) => {
  const lead = leads[i]
  const leadPhrases = written.sections[i].phrases
  const leadOnsets: number[] = []
  let end = 0
  for (const n of leadPhrases.flat()) {
    if (n.pitch != null) leadOnsets.push(end)
    end += n.beats
  }
  const rowStarts = [...new Set(h.placed[lead].map((n) => n.row))].map((r) => leadOnsets[h.placed[lead].findIndex((n) => n.row === r)])
  const own = parts.map((_, p): Phrase[] => {
    if (p === lead) return leadPhrases
    const ns = h.placed[p]
    return ns.length ? partPhrases(ns, partnerOnsets(ns, h.placed[lead], leadOnsets, bpm), end, bpm) : [[{ pitch: null, beats: end }]]
  })
  // both parts last as long; long rests are cut where the other part's groups begin
  const total = Math.max(...own.map(beatsOf))
  return parts.map((part, p) => {
    const length = beatsOf(own[p])
    const padded: Phrase[] = length < total ? [...own[p], [{ pitch: null, beats: total - length }]] : own[p]
    const cuts = own.filter((_, q) => q !== p).flatMap(phraseStarts)
    const phrases = splitRests(padded, cuts)
    return sectionToTabText({ id: 's', name: 'S', phrases, lineBreaks: linesAt(phrases, rowStarts) }, part.whistle)
  })
})

// 4) write the tune
const title = values.title ?? info.title
const camel = id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^\d/, '_$&')
const constName = (i: number, p: number) => `S${i + 1}_${parts[p].whistle.toUpperCase()}`
const consts = sections.map((texts, i) => texts.map((t, p) => `const ${constName(i, p)} = \`${t}\``).join('\n')).join('\n\n')
const file = `import { duetSection } from '../../music/duet'
import type { DuetPart, Tune } from '../../music/types'

/*
 * ${title}
 * Read from ${info.url ?? url}${info.uploader ? ` (${info.uploader})` : ''}: a duet for ${parts.map((p) => getWhistle(p.whistle).label).join(' and ')}.
 * Parts from the tab pages, timing from the recording (scripts/transcribe-duet.ts), lengths on a grid
 * of sixteenths at ${bpm} bpm.
 */
const PARTS: DuetPart[] = [${parts.map((p) => `{ id: '${p.whistle}', whistle: '${p.whistle}' }`).join(', ')}]

${consts}

export const ${camel}: Tune = {
  id: '${id}',
  title: ${JSON.stringify(title)},
  description: { en: '', ru: '' },
  origin: 'builtin',
  type: 'soundtrack',
  whistle: '${parts[0].whistle}',
  key: '',
  bpm: ${bpm},
  difficulty: 3,
  duet: { parts: PARTS },
  sections: [
${sections.map((_, i) => `    duetSection('s${i + 1}', 'Section ${i + 1}', [${parts.map((_, p) => constName(i, p)).join(', ')}], PARTS),`).join('\n')}
  ],
}
`
writeFileSync(join(outDir, `${id}.ts`), file)
writeFileSync(
  join(outDir, 'report.json'),
  JSON.stringify({ video: info.url ?? url, title, bpm, parts, sections: heard.map((h, i) => ({ page: pages[i], order: h.order.map((p) => parts[p].whistle), misfit: Math.round(h.misfit * 100) / 100, lead: parts[leads[i]].whistle })) }, null, 2),
)
console.log(`${title}: ${bpm} bpm → ${join(outDir, `${id}.ts`)}`)
