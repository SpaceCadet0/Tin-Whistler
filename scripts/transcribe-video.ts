/**
 * Video → built-in tune, with no model in the loop: reads the dot tab shown in a whistle tutorial
 * video and times every note against the recording.
 *
 *   npm run transcribe -- <youtube-url | video.mp4> [--id my-tune] [--title "My Tune"]
 *                         [--whistle D|C|Bb|G|lowD] [--expect builtin-tune-id]
 *
 *  1. download the video (cached in .tmp-video/<id>/), take its chapters as sections, or find
 *     where the tab page changes when there are none;
 *  2. per section: median of frames across it (drops the moving "current note" highlight), keep
 *     the still pixels, crop to the light page, read it with the app's tab recogniser;
 *  3. find the whistle key from the recording (the tab gives fingerings, the sound gives pitch);
 *  4. align the notes to the pitch track (src/import/align.ts): onsets, rests, octave, tuning;
 *  5. write <id>.ts (a Tune in the app's tab notation, 1 beat = 1 second at 60 bpm), report.json
 *     and one panel image per section, and print a short summary with the places worth checking.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { PNG } from 'pngjs'
import { alignNotes, attackAt, bestTuning, correctTuning, HOP, pitchTrack, timedNotes, type PitchFrame } from '../src/import/align'
import { recognizeTab, sectionFromRecognition, type RGBAImage } from '../src/import/tabImage'
import { cropImage, keepStill, medianFrame, paperPanel, stillMask, tabPages } from '../src/import/videoFrames'
import { builtinTune } from '../src/data/tunes'
import { sectionToTabText } from '../src/music/tabText'
import { sectionNotes } from '../src/music/tune'
import type { Phrase, TuneNote, TuneSection } from '../src/music/types'
import { getWhistle, WHISTLE_KEYS } from '../src/music/whistles'
import { audioSamples, download, fetchInfo, frameAt, probeSize, thumbnails, type VideoInfo } from './video/media'

const SAMPLE_RATE = 22050
const FRAMES_PER_SECTION = 15
/** Part of a section the frames are taken from: away from page turns and fades. */
const SAMPLE_FROM = 0.15
const SAMPLE_SPAN = 0.7
const BPM = 60
// flags in the report
const MISFIT = 1
const WEAK_REPEAT = 0.3
const SHORT_NOTE = 0.08
/** Below this attack strength a note with no articulation mark is taken as slurred. */
const SLUR_ATTACK = 0.25

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { id: { type: 'string' }, title: { type: 'string' }, whistle: { type: 'string' }, expect: { type: 'string' }, out: { type: 'string' } },
})
const source = positionals[0]
if (!source) {
  console.error('Usage: npm run transcribe -- <youtube-url | video.mp4> [--id id] [--title title] [--whistle D|C|Bb|G|lowD] [--expect tune-id]')
  process.exit(1)
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'tune'

// 1) video and sections
const isUrl = /^https?:\/\//.test(source)
const info: VideoInfo = isUrl ? fetchInfo(source) : { title: values.title ?? source.replace(/^.*\/|\.\w+$/g, ''), duration: 0, chapters: [] }
const id = values.id ?? slug(values.title ?? info.title)
const outDir = values.out ?? join('.tmp-video', id)
mkdirSync(join(outDir, 'panels'), { recursive: true })
const video = isUrl ? join(outDir, 'video.mp4') : source
if (isUrl && !existsSync(video)) download(source, video)
const size = probeSize(video)
const duration = info.duration || size.duration
const pages: { start: number; end: number; title: string }[] = info.chapters.length
  ? info.chapters
  : tabPages(thumbnails(video, 2, 96, 54), 2, duration).map(([start, end], i) => ({ start, end, title: `Section ${i + 1}` }))

// 2) read the tab of each section
interface Part {
  title: string
  start: number
  end: number
  section: TuneSection
  warnings: string[]
}
const parts: Part[] = []
for (const [i, page] of pages.entries()) {
  const frames: RGBAImage[] = []
  for (let k = 0; k < FRAMES_PER_SECTION; k++) frames.push(frameAt(video, page.start + (page.end - page.start) * (SAMPLE_FROM + (SAMPLE_SPAN * k) / (FRAMES_PER_SECTION - 1)), size))
  const median = medianFrame(frames)
  const panel = cropImage(keepStill(median, stillMask(frames)), paperPanel(median))
  const png = new PNG({ width: panel.width, height: panel.height })
  png.data = Buffer.from(panel.data)
  writeFileSync(join(outDir, 'panels', `s${i + 1}.png`), PNG.sync.write(png))
  const r = recognizeTab(panel, 'D')
  if (!r.systems.length) {
    console.log(`· ${page.title}: no tab found, skipped`)
    continue
  }
  parts.push({ title: page.title, start: page.start, end: page.end, section: sectionFromRecognition(r, `s${parts.length + 1}`, page.title, 'D'), warnings: r.warnings })
}
if (!parts.length) {
  console.error('No dot tab found in the video.')
  process.exit(1)
}

// 3) whistle key: shift the D-read fingerings to each key and keep the one the recording fits best
const samples = audioSamples(video, SAMPLE_RATE)
const tracks: PitchFrame[][] = parts.map((p) => pitchTrack(samples.subarray(Math.round(p.start * SAMPLE_RATE), Math.round(p.end * SAMPLE_RATE)), SAMPLE_RATE))
const tabPitches = parts.flatMap((p) => sectionNotes(p.section).flatMap((n) => (n.pitch == null ? [] : [n.pitch])))
const heard = tracks.flat().flatMap((f) => (f.midi == null ? [] : [f.midi]))
const keyFits = WHISTLE_KEYS.filter((w) => w.id !== 'lowD').map((w) => ({ id: w.id, ...bestTuning(heard, tabPitches.map((p) => p + w.baseMidi - 74)) }))
keyFits.sort((a, b) => a.misfit - b.misfit)
let whistle = values.whistle ?? keyFits[0].id
// a low D whistle plays the D whistle's fingerings an octave down
const heardMedian = [...heard].sort((a, b) => a - b)[heard.length >> 1]
if (!values.whistle && whistle === 'D' && heardMedian < 74) whistle = 'lowD'
const shift = getWhistle(whistle).baseMidi - 74

// 4) align and time each section
interface Flag {
  section: number
  note: number
  token: string
  at: string
  reason: string
}
const flags: Flag[] = []
const tuned: TuneSection[] = []
const tunings: string[] = []
const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
parts.forEach((part, si) => {
  const notes = sectionNotes(part.section).map((n): TuneNote => (n.pitch == null ? n : { ...n, pitch: n.pitch + shift }))
  const sounding = notes.filter((n) => n.pitch != null)
  const split = getWhistle(whistle).baseMidi + 11.5
  const tuning = correctTuning(tracks[si], sounding.map((n) => n.pitch!), split)
  tunings.push(`${tuning.low >= 0 ? '+' : ''}${tuning.low}/${tuning.high >= 0 ? '+' : ''}${tuning.high}`)
  const al = alignNotes(tuning.frames, sounding.map((n) => n.pitch!))
  const loud = [...tuning.frames.map((f) => f.rms)].sort((a, b) => a - b)[Math.floor(tuning.frames.length * 0.9)]
  // no articulation read under a note: the recording decides, a smooth change of pitch is a slur
  const articulated = sounding.map((n, k): TuneNote => (n.attack || k === 0 || attackAt(tuning.frames, al.onsets[k], loud, true) >= SLUR_ATTACK ? n : { ...n, attack: 'slur' }))
  const timed = timedNotes(articulated, tuning.frames, al, BPM)
  sounding.forEach((n, k) => {
    const at = clock(part.start + al.onsets[k] * HOP)
    const token = `#${k + 1} ${n.pitch}`
    const len = ((k + 1 < sounding.length ? al.onsets[k + 1] : al.ends[k]) - al.onsets[k]) * HOP
    if (al.misfit[k] > MISFIT) flags.push({ section: si + 1, note: k + 1, token, at, reason: 'the recording does not match the tab here' })
    if (k > 0 && sounding[k - 1].pitch === n.pitch && attackAt(tuning.frames, al.onsets[k], loud) < WEAK_REPEAT)
      flags.push({ section: si + 1, note: k + 1, token, at, reason: 'repeated note with a soft attack: the split may be off' })
    if (len < SHORT_NOTE) flags.push({ section: si + 1, note: k + 1, token, at, reason: 'very short' })
  })
  // back into the tab's phrases: each sounding note brings the rest that follows it
  let cursor = 0
  const phrases: Phrase[] = part.section.phrases.map((p) =>
    p.flatMap(() => {
      const note = timed[cursor++]
      const rest = timed[cursor] && timed[cursor].pitch == null ? [timed[cursor++]] : []
      return [note, ...rest]
    }),
  )
  tuned.push({ ...part.section, phrases })
})

// 5) write the tune, the report and the summary
const camel = id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^\d/, '_$&')
const title = values.title ?? info.title
const texts = tuned.map((s, i) => `const S${i + 1} = \`${sectionToTabText(s, whistle)}\``)
const file = `import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'

/*
 * ${title}${info.url ? `\n * Read from ${info.url}${info.uploader ? ` (${info.uploader})` : ''}` : ''}, played on a ${getWhistle(whistle).label}.
 * Tab read from the video frames, timing measured from the recording (scripts/transcribe-video.ts):
 * 1 beat = 1 second of the performance at ${BPM} bpm.
 */
${texts.join('\n\n')}

export const ${camel}: Tune = {
  id: '${id}',
  title: ${JSON.stringify(title)},
  description: { en: '', ru: '' },
  origin: 'builtin',
  type: 'air',
  whistle: '${whistle}',
  key: '',
  bpm: ${BPM},
  difficulty: 3,
  sections: [
${tuned.map((s, i) => `    sectionFromTabText('s${i + 1}', ${JSON.stringify(parts[i].title)}, S${i + 1}, '${whistle}'),`).join('\n')}
  ],
}
`
writeFileSync(join(outDir, `${id}.ts`), file)
const report = {
  video: info.url ?? source,
  title,
  whistle,
  keyFits,
  sections: parts.map((p, i) => ({
    title: p.title,
    start: p.start,
    end: p.end,
    notes: sectionNotes(p.section).length,
    tuning: tunings[i],
    warnings: p.warnings,
    panel: join(outDir, 'panels', `s${i + 1}.png`),
  })),
  flags,
}
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2))

console.log(`${title}\n${getWhistle(whistle).label} (fit ${keyFits.map((k) => `${k.id} ${k.misfit.toFixed(2)}`).join(', ')})`)
parts.forEach((p, i) => console.log(`· ${p.title} ${clock(p.start)}–${clock(p.end)}: ${report.sections[i].notes} notes, tuning ${tunings[i]} st${p.warnings.length ? `, ${p.warnings.join(' ')}` : ''}`))
console.log(flags.length ? `${flags.length} place(s) to check:` : 'Nothing flagged.')
for (const f of flags) console.log(`  S${f.section} ${f.token} at ${f.at}: ${f.reason}`)
console.log(`→ ${join(outDir, `${id}.ts`)}`)

// optional: compare with a built-in tune (regression check against a hand-made transcription)
if (values.expect) {
  const want = builtinTune(values.expect)
  if (!want) throw new Error(`No built-in tune "${values.expect}"`)
  /** Onset of every sounding note, beats from the section start. */
  const onsets = (s: TuneSection) => {
    let t = 0
    const out: number[] = []
    for (const n of sectionNotes(s)) {
      if (n.pitch != null) out.push(t)
      t += n.beats
    }
    return out
  }
  want.sections.forEach((ws, i) => {
    const w = sectionNotes(ws).filter((n) => n.pitch != null)
    const g = tuned[i] ? sectionNotes(tuned[i]).filter((n) => n.pitch != null) : []
    if (g.length !== w.length) {
      console.log(`  vs ${values.expect} S${i + 1}: ${g.length}/${w.length} notes`)
      return
    }
    const pitch = g.filter((n, k) => Math.round(n.pitch!) === Math.round(w[k].pitch!)).length / w.length
    const go = onsets(tuned[i])
    const wo = onsets(ws)
    // relative timing: take away the section's overall offset (the median difference)
    const diff = go.map((x, k) => x - wo[k])
    const offset = [...diff].sort((a, b) => a - b)[diff.length >> 1]
    const err = diff.map((d) => Math.abs(d - offset)).sort((a, b) => a - b)
    const attack = g.filter((n, k) => (n.attack ?? 'tongue') === (w[k].attack ?? 'tongue')).length / w.length
    const orn = g.filter((n, k) => n.ornament?.type === w[k].ornament?.type && n.ornament?.hole === w[k].ornament?.hole).length / w.length
    console.log(`  vs ${values.expect} S${i + 1}: ${g.length}/${w.length} notes, pitch ${Math.round(pitch * 100)}%, attack ${Math.round(attack * 100)}%, ornaments ${Math.round(orn * 100)}%, onset error median ${Math.round(err[err.length >> 1] * 1000)} ms, p90 ${Math.round(err[Math.floor(err.length * 0.9)] * 1000)} ms`)
  })
}
