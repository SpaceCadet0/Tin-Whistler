/**
 * Video → built-in tune, with no model in the loop: reads the dot tab shown in a whistle tutorial
 * video and times every note against the recording.
 *
 *   npm run transcribe -- <youtube-url | video.mp4> [--id my-tune] [--title "My Tune"]
 *                         [--whistle D|C|Bb|G|lowD] [--expect builtin-tune-id] [--check builtin-tune-id]
 *                         [--pages page1.png,page2.png,…]
 *
 *  1. download the video (cached in .tmp-video/<id>/), take its chapters as sections, or find
 *     where the tab page changes when there are none;
 *  2. per section: median of frames across it (drops the moving "current note" highlight), cut the
 *     tab out round its grid of dots at full resolution, read it with the app's tab recogniser;
 *  3. find the whistle key from the recording (the tab gives fingerings, the sound gives pitch);
 *  4. align the notes to the pitch track (src/import/align.ts): onsets, rests, octave, tuning;
 *     A rest goes only where the tab leaves a gap between groups, and only where the recording falls
 *     silent there; a silence inside a group stays part of its note;
 *  5. put the lengths on a grid of sixteenths at one tempo (src/import/quantize.ts): lengths that
 *     repeat, groups of the same size sharing a rhythm and a rest after them or none;
 *  6. write <id>.ts (a Tune in the app's tab notation), report.json
 *     and one panel image per section, and print a short summary with the places worth checking.
 *
 * --pages: screenshots of the tab pages, in the order they are played, are read instead of the video
 * frames (one section per page). The video then only gives the sound: use it when the frames lose
 * notes (a highlight over them) or a chapter shows more than one page.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { PNG } from 'pngjs'
import { alignNotes, attackAt, correctTuning, HOP, pitchTrack, timedNotes, type PitchFrame } from '../src/import/align'
import { quantizeSections } from '../src/import/quantize'
import { recognizeTab, sectionFromRecognition, type RGBAImage } from '../src/import/tabImage'
import { lightPaper, toHouseColours } from '../src/import/palette'
import { cropImage, medianFrame, tabPages, tabRegion } from '../src/import/videoFrames'
import { builtinTune } from '../src/data/tunes'
import { sectionToTabText } from '../src/music/tabText'
import { sectionNotes } from '../src/music/tune'
import type { Phrase, TuneNote, TuneSection } from '../src/music/types'
import { fingeringsEqual } from '../src/music/fingerings'
import { fingeringForMidi, getWhistle, WHISTLE_KEYS, whistleLabel } from '../src/music/whistles'
import { audioSamples, download, fetchInfo, frameAt, imageFile, probeSize, thumbnails, type VideoInfo } from './video/media'

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
/** --check lists a note when its length differs from the recording by more than both of these. */
const CHECK_MIN_DIFF = 0.15
const CHECK_SHARE = 0.25
/** Below this attack strength a note with no articulation mark is taken as slurred. */
const SLUR_ATTACK = 0.25
/** Attack strength that clearly means a tongued note. */
const TONGUED = 0.6
/** Below this (level and clarity together) a note starts with no attack at all. */
const SMOOTH = 0.15
/** A rival attack this close in strength, further than RIVAL_GAP seconds away, makes a repeat's split doubtful. */
const RIVAL_SHARE = 0.9
const RIVAL_GAP = 0.1

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { id: { type: 'string' }, title: { type: 'string' }, whistle: { type: 'string' }, expect: { type: 'string' }, check: { type: 'string' }, out: { type: 'string' }, pages: { type: 'string', multiple: true } },
})
const source = positionals[0]
if (!source) {
  console.error('Usage: npm run transcribe -- <youtube-url | video.mp4> [--id id] [--title title] [--whistle D|C|Bb|G|lowD] [--expect tune-id] [--pages page1.png,page2.png,…]')
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
  /** --pages: the screenshot the section was read from. */
  file?: string
}
const videoParts: Part[] = []
for (const [i, page] of pages.entries()) {
  const frames: RGBAImage[] = []
  for (let k = 0; k < FRAMES_PER_SECTION; k++) frames.push(frameAt(video, page.start + (page.end - page.start) * (SAMPLE_FROM + (SAMPLE_SPAN * k) / (FRAMES_PER_SECTION - 1)), size))
  // the median frame drops the moving "current note" highlight; a dark page is flipped to light; the
  // tab is cut out at full resolution round its dots, then redrawn in the recogniser's house colours
  const light = lightPaper(medianFrame(frames))
  const region = tabRegion(light)
  if (!region) {
    console.log(`· ${page.title}: no tab found, skipped`)
    continue
  }
  const panel = toHouseColours(cropImage(light, region))
  const png = new PNG({ width: panel.width, height: panel.height })
  png.data = Buffer.from(panel.data)
  writeFileSync(join(outDir, 'panels', `s${i + 1}.png`), PNG.sync.write(png))
  const r = recognizeTab(panel, 'D')
  if (!r.systems.length) {
    console.log(`· ${page.title}: no tab found, skipped`)
    continue
  }
  videoParts.push({ title: page.title, start: page.start, end: page.end, section: sectionFromRecognition(r, `s${videoParts.length + 1}`, page.title, 'D'), warnings: r.warnings })
}
if (!videoParts.length) {
  console.error('No dot tab found in the video.')
  process.exit(1)
}
// --pages: the notes come from the page screenshots, the video still says when the tab is played
const pageFiles = values.pages?.flatMap((p) => p.split(',').filter(Boolean))
const parts: Part[] = pageFiles
  ? pageFiles.map((file, i) => {
      const r = recognizeTab(imageFile(file), 'D')
      if (!r.systems.length) throw new Error(`No dot tab found in ${file}`)
      const title = `Section ${i + 1}`
      return { title, start: videoParts[0].start, end: videoParts[videoParts.length - 1].end, section: sectionFromRecognition(r, `s${i + 1}`, title, 'D'), warnings: r.warnings, file }
    })
  : videoParts

// 3) whistle key, then timing. The whole performance is aligned at once, from the first section's
// start to the last one's end: a tab page often stays on screen a little before or after it is
// played, so chapter marks are not trusted as note boundaries. The tab gives fingerings (read as a
// D whistle) and the recording gives pitches: each key is tried, the best-fitting alignment wins.
// (Matching pitch classes alone can't tell D from G: their scales share six notes.)
const samples = audioSamples(video, SAMPLE_RATE)
const from = videoParts[0].start
const until = videoParts[videoParts.length - 1].end
const track: PitchFrame[] = pitchTrack(samples.subarray(Math.round(from * SAMPLE_RATE), Math.round(until * SAMPLE_RATE)), SAMPLE_RATE)
if (values.check) checkTune(values.check)
const tabNotes = parts.map((p) => sectionNotes(p.section).filter((n) => n.pitch != null))
const allTab = tabNotes.flat()
const fit = (keyShift: number) => {
  const pitches = allTab.map((n) => n.pitch! + keyShift)
  const tuning = correctTuning(track, pitches, 74 + keyShift + 11.5)
  const al = alignNotes(tuning.frames, pitches)
  return { tuning, al, misfit: al.misfit.reduce((x, y) => x + y, 0) / Math.max(1, pitches.length) }
}
const keyFits = WHISTLE_KEYS.filter((w) => w.id !== 'lowD' && (!values.whistle || w.id === values.whistle || (values.whistle === 'lowD' && w.id === 'D'))).map((w) => ({ id: w.id, ...fit(w.baseMidi - 74) }))
keyFits.sort((x, y) => x.misfit - y.misfit)
const best = keyFits[0]
let whistle = values.whistle ?? best.id
// a low D whistle plays the D whistle's fingerings an octave down
const heard = track.flatMap((f) => (f.midi == null ? [] : [f.midi])).sort((x, y) => x - y)
if (!values.whistle && whistle === 'D' && heard[heard.length >> 1] < 74) whistle = 'lowD'
const shift = getWhistle(whistle).baseMidi - 74
const { tuning, al } = best
const tuningText = `${tuning.low >= 0 ? '+' : ''}${tuning.low}/${tuning.high >= 0 ? '+' : ''}${tuning.high}`

// 4) time each section
interface Flag {
  section: number
  note: number
  token: string
  at: string
  reason: string
  /** "check": worth a look; "fixed": the recording settled it (the octave), listed for the record. */
  kind: 'check' | 'fixed'
}
const flags: Flag[] = []
const tuned: TuneSection[] = []
const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
const loud = [...tuning.frames.map((f) => f.rms)].sort((x, y) => x - y)[Math.floor(tuning.frames.length * 0.9)]
const sounding = allTab.map((n): TuneNote => ({ ...n, pitch: n.pitch! + shift }))
// no articulation read under a note: the recording decides, a smooth change of pitch is a slur
const articulated = sounding.map((n, k): TuneNote => (n.attack || k === 0 || attackAt(tuning.frames, al.onsets[k], loud, true) >= SLUR_ATTACK ? n : { ...n, attack: 'slur' }))
// a rest only after the last note of a group: where the tab leaves a gap
const groupEnds = parts.flatMap((p) => p.section.phrases.flatMap((ph) => ph.filter((n) => n.pitch != null).map((_, k, a) => k === a.length - 1)))
// a fingering kept only because the tab's "+" was misread: the heard octave makes it the standard one
const plain = (n: TuneNote): TuneNote => {
  if (!n.fingering || n.pitch == null) return n
  const std = fingeringForMidi(Math.round(n.pitch), whistle)
  if (!std || !fingeringsEqual(std.fingering, n.fingering)) return n
  const { fingering: _, ...rest } = n
  return rest
}
const timedAll = timedNotes(articulated, tuning.frames, al, BPM, groupEnds).map(plain)
const timedSounding = timedAll.filter((n) => n.pitch != null)
const sectionOf: number[] = tabNotes.flatMap((ns, si) => ns.map(() => si))
const firstOf = tabNotes.map((_, si) => sectionOf.indexOf(si))
const flag = (k: number, reason: string, kind: Flag['kind'] = 'check') => {
  const si = sectionOf[k]
  flags.push({ section: si + 1, note: k - firstOf[si] + 1, token: `#${k - firstOf[si] + 1} ${sounding[k].pitch}`, at: clock(from + al.onsets[k] * HOP), reason, kind })
}
sounding.forEach((n, k) => {
  const len = ((k + 1 < sounding.length ? al.onsets[k + 1] : al.ends[k]) - al.onsets[k]) * HOP
  if (al.misfit[k] > MISFIT) flag(k, 'the recording does not match the tab here')
  if (len < SHORT_NOTE) flag(k, 'very short')
  // a repeated note: is there another place in the two notes that looks just as much like the attack?
  if (k > 0 && sounding[k - 1].pitch === n.pitch) {
    const chosen = attackAt(tuning.frames, al.onsets[k], loud)
    const start = al.onsets[k - 1] + Math.round(SHORT_NOTE / HOP)
    const stop = k + 1 < sounding.length ? al.onsets[k + 1] : al.ends[k]
    let rival = 0
    for (let f = start; f < stop - Math.round(SHORT_NOTE / HOP); f++) if (Math.abs(f - al.onsets[k]) * HOP > RIVAL_GAP) rival = Math.max(rival, attackAt(tuning.frames, f, loud))
    if (chosen < WEAK_REPEAT || rival >= chosen * RIVAL_SHARE) flag(k, 'repeated note: the split between the two may be off')
  }
  // the tab's "+" and the octave heard
  if (timedSounding[k].pitch !== n.pitch) flag(k, `octave taken from the recording (${n.pitch} in the tab, ${timedSounding[k].pitch} heard)`, 'fixed')
  // the tab's articulation against the recording
  const level = attackAt(tuning.frames, al.onsets[k], loud, true)
  if (k > 0 && n.attack === 'slur' && level >= TONGUED) flag(k, 'tab says slur, the recording has an attack')
  if (k > 0 && n.attack && n.attack !== 'slur' && attackAt(tuning.frames, al.onsets[k], loud) < SMOOTH && sounding[k - 1].pitch !== n.pitch) flag(k, `tab says ${n.attack}, the recording sounds slurred`)
})
// back into each section's phrases: every sounding note brings the rest that follows it
let cursor = 0
for (const part of parts) {
  const phrases: Phrase[] = part.section.phrases.map((p) =>
    p.flatMap(() => {
      const note = timedAll[cursor++]
      const rest = timedAll[cursor] && timedAll[cursor].pitch == null ? [timedAll[cursor++]] : []
      return [note, ...rest]
    }),
  )
  tuned.push({ ...part.section, phrases })
}
/** Where each section was actually played. */
const played = parts.map((_, si) => [from + al.onsets[firstOf[si]] * HOP, from + (si + 1 < parts.length ? al.onsets[firstOf[si + 1]] : al.ends[al.ends.length - 1]) * HOP])

// 5) write the tune, the report and the summary
const camel = id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^\d/, '_$&')
const title = values.title ?? info.title
const written = quantizeSections(tuned)
const texts = written.sections.map((s, i) => `const S${i + 1} = \`${sectionToTabText(s, whistle)}\``)
const file = `import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'

/*
 * ${title}${info.url ? `\n * Read from ${info.url}${info.uploader ? ` (${info.uploader})` : ''}` : ''}, played on a ${getWhistle(whistle).label}.
 * Tab read from the video frames, timing measured from the recording (scripts/transcribe-video.ts):
 * Lengths on a grid of sixteenths at ${written.bpm} bpm (src/import/quantize.ts).
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
  bpm: ${written.bpm},
  difficulty: 3,
  sections: [
${written.sections.map((s, i) => `    sectionFromTabText('s${i + 1}', ${JSON.stringify(parts[i].title)}, S${i + 1}, '${whistle}'),`).join('\n')}
  ],
}
`
writeFileSync(join(outDir, `${id}.ts`), file)
const report = {
  video: info.url ?? source,
  title,
  whistle,
  tuning: tuningText,
  keyFits: keyFits.map((k) => ({ id: k.id, misfit: Math.round(k.misfit * 100) / 100 })),
  sections: parts.map((p, i) => ({
    title: p.title,
    shown: [p.start, p.end],
    played: played[i].map((x) => Math.round(x * 10) / 10),
    notes: sectionNotes(p.section).length,
    warnings: p.warnings,
    panel: p.file ?? join(outDir, 'panels', `s${i + 1}.png`),
  })),
  flags,
}
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2))

console.log(`${title}\n${getWhistle(whistle).label} (fit ${keyFits.map((k) => `${k.id} ${k.misfit.toFixed(2)}`).join(', ')}), tuning ${tuningText} st (low/high register)`)
parts.forEach((p, i) => console.log(`· ${p.title}: ${p.file ? p.file.replace(/^.*\//, '') : `shown ${clock(p.start)}–${clock(p.end)}`}, played ${clock(played[i][0])}–${clock(played[i][1])}, ${report.sections[i].notes} notes${p.warnings.length ? `, ${p.warnings.join(' ')}` : ''}`))
const toCheck = flags.filter((f) => f.kind === 'check')
const fixed = flags.length - toCheck.length
console.log(`${toCheck.length ? `${toCheck.length} place(s) to check` : 'Nothing to check'}${fixed ? `; ${fixed} octave(s) taken from the recording` : ''}`)
for (const f of toCheck) console.log(`  S${f.section} ${f.token} at ${f.at}: ${f.reason}`)
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

/**
 * --check <tune-id>: time an existing built-in tune against the video. Its own notes (not the tab
 * read from the frames) are aligned to the recording, one overall tempo is fitted (the video may be
 * played a little faster or slower), and every note whose length differs clearly from the
 * recording is listed. Writes check.json next to the other outputs and exits.
 */
function checkTune(tuneId: string): never {
  const tune = builtinTune(tuneId)
  if (!tune) throw new Error(`No built-in tune "${tuneId}"`)
  const secPerBeat = 60 / tune.bpm
  const notes: { section: number; index: number; pitch: number; at: number }[] = []
  let t = 0
  tune.sections.forEach((s, si) => {
    let index = 0
    for (const n of sectionNotes(s)) {
      if (n.pitch != null) notes.push({ section: si + 1, index: ++index, pitch: n.pitch, at: t })
      t += n.beats * secPerBeat
    }
  })
  const end = t
  // the video may use another whistle: try every transposition, keep the best-fitting alignment
  const tries = Array.from({ length: 12 }, (_, k) => k - 5).map((shift) => {
    const pitches = notes.map((n) => n.pitch + shift)
    const tuning = correctTuning(track, pitches, getWhistle(tune.whistle).baseMidi + shift + 11.5)
    const al = alignNotes(tuning.frames, pitches)
    return { shift, al, misfit: al.misfit.reduce((x, y) => x + y, 0) / pitches.length }
  })
  tries.sort((x, y) => x.misfit - y.misfit)
  const { al, shift } = tries[0]
  const heardAt = notes.map((_, k) => from + al.onsets[k] * HOP)
  const heardEnd = from + al.ends[notes.length - 1] * HOP
  // one overall tempo: heard = a + s · written (least squares)
  const xs = [...notes.map((n) => n.at), end]
  const ys = [...heardAt, heardEnd]
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  const s = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  const rows = notes.map((n, k) => {
    const written = ((k + 1 < notes.length ? notes[k + 1].at : end) - n.at) * s
    const heardLen = (k + 1 < notes.length ? heardAt[k + 1] : heardEnd) - heardAt[k]
    return { section: n.section, note: n.index, name: whistleLabel(n.pitch, tune.whistle), at: clockOf(heardAt[k]), written: round2(written), heard: round2(heardLen), diff: round2(heardLen - written), unsure: al.misfit[k] > MISFIT }
  })
  const off = rows.filter((r) => Math.abs(r.diff) > Math.max(CHECK_MIN_DIFF, Math.abs(r.written) * CHECK_SHARE))
  const absDiff = rows.map((r) => Math.abs(r.diff)).sort((a, b) => a - b)
  writeFileSync(join(outDir, 'check.json'), JSON.stringify({ tune: tuneId, video: info.url ?? source, tempoFactor: round2(s), equivalentBpm: Math.round(tune.bpm / s), transposed: shift, rows }, null, 2))
  console.log(`${tune.title} vs ${info.title}`)
  console.log(`written ${end.toFixed(1)} s at ${tune.bpm} bpm; played ${(heardEnd - heardAt[0]).toFixed(1)} s, i.e. the recording runs at ×${(1 / s).toFixed(2)} (≈ ${Math.round(tune.bpm / s)} bpm)${shift ? `, ${shift > 0 ? '+' : ''}${shift} semitones` : ''}`)
  console.log(`note length difference after matching the tempo: median ${Math.round(absDiff[absDiff.length >> 1] * 1000)} ms, 90% under ${Math.round(absDiff[Math.floor(absDiff.length * 0.9)] * 1000)} ms`)
  console.log(`${off.length} of ${rows.length} notes differ clearly (> ${CHECK_MIN_DIFF * 1000} ms and > ${CHECK_SHARE * 100}% of their length):`)
  for (const r of off) console.log(`  S${r.section} #${r.note} ${r.name} at ${r.at}: tune ${r.written.toFixed(2)} s, video ${r.heard.toFixed(2)} s (${r.diff > 0 ? '+' : ''}${r.diff.toFixed(2)})${r.unsure ? ' — alignment unsure here' : ''}`)
  console.log(`→ ${join(outDir, 'check.json')}`)
  process.exit(0)
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
function clockOf(sec: number): string {
  return `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, '0')}`
}
