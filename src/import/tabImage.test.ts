import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { shepardsFlute } from '../data/tunes/shepardsFlute'
import { thePrayer } from '../data/tunes/thePrayer'
import { sectionNotes } from '../music/tune'
import { whistleLabel } from '../music/whistles'
import { recognizeTab, sectionFromRecognition, withAttack, writesArticulation } from './tabImage'

/** Recognise the reference screenshots and compare with the hand transcription. */
function load(n: number) {
  const png = PNG.sync.read(readFileSync(new URL(`./__fixtures__/shepard-${n}.png`, import.meta.url)))
  return recognizeTab({ width: png.width, height: png.height, data: png.data })
}

describe('tab image recognition', () => {
  it.each([1, 2, 3, 5])('reads screenshot %i', (n) => {
    const r = load(n)
    const got = sectionNotes(sectionFromRecognition(r, 's', 'S'))
    const want = sectionNotes(shepardsFlute.sections[n - 1])
    expect(got.length).toBe(want.length)
    const pc = (p: number | null) => (p == null ? -1 : Math.round(p) % 12)
    const pitchClass = got.filter((g, i) => pc(g.pitch) === pc(want[i].pitch)).length / want.length
    const exact = got.filter((g, i) => Math.round(g.pitch ?? 0) === Math.round(want[i].pitch ?? 0)).length / want.length
    const rings = want.filter((w) => w.ornament?.hole)
    const ringHits = rings.filter((w) => got[want.indexOf(w)].ornament?.hole === w.ornament!.hole).length / Math.max(1, rings.length)
    const phrases = sectionFromRecognition(r, 's', 'S').phrases.map((p) => p.length)
    expect(phrases).toEqual(shepardsFlute.sections[n - 1].phrases.map((p) => p.length))
    expect(pitchClass).toBeGreaterThanOrEqual(0.97)
    expect(exact).toBeGreaterThanOrEqual(0.85)
    expect(ringHits).toBeGreaterThanOrEqual(0.9)
    // articulation letters t / r / - / i under the columns
    const attacks = got.filter((g, i) => (g.attack ?? 'tongue') === (want[i].attack ?? 'tongue') && !!g.stop === !!want[i].stop).length / want.length
    expect(attacks).toBeGreaterThanOrEqual(0.92)
  })

  it('reads dark-theme tabs (light dots on a dark background) like the light originals', () => {
    const png = PNG.sync.read(readFileSync(new URL('./__fixtures__/shepard-1.png', import.meta.url)))
    const dark = new Uint8ClampedArray(png.data)
    for (let p = 0; p < dark.length; p += 4) {
      dark[p] = 255 - dark[p]
      dark[p + 1] = 255 - dark[p + 1]
      dark[p + 2] = 255 - dark[p + 2]
    }
    const light = load(1)
    const inverted = recognizeTab({ width: png.width, height: png.height, data: dark })
    expect(inverted.warnings[0]).toMatch(/Dark background/)
    const pitches = (r: typeof light) => r.systems.flatMap((s) => s.columns.map((c) => c.pitch))
    expect(pitches(inverted)).toEqual(pitches(light))
    expect(inverted.systems.map((s) => s.phraseBreaks)).toEqual(light.systems.map((s) => s.phraseBreaks))
  })

  // plain tabs: salmon paper with near-black maroon dots, dots drawn edge to edge, note names
  // instead of articulation, "+" marks touching the letter below
  it.each([
    [1, 'E E G G B B A | D D D F# F# A A G'],
    [2, "G G B B D' D' E' E' D' | G G B B D' D' E' E' D'"],
    [3, 'G G G G F# G | G F# G A B A | G G G G F# G | G D | G G G G F# G | G F# G A B A | G G G G F# G | A D'],
    [4, "G A B | C B A G A D' | C B G E D | G A B C B A G A D' | B D' E' D' A B A"],
  ])('reads simple tab %i', (n, want) => {
    const png = PNG.sync.read(readFileSync(new URL(`./__fixtures__/simple-${n}.png`, import.meta.url)))
    const section = sectionFromRecognition(recognizeTab({ width: png.width, height: png.height, data: png.data }), 's', 'S')
    const got = section.phrases.map((p) => p.map((note) => (note.pitch == null ? '?' : whistleLabel(note.pitch, 'D'))).join(' ')).join(' | ')
    expect(got).toBe(want)
  })

  it('finds the upper-voice columns in section 4 as extra phrases', () => {
    const r = load(4)
    expect(r.systems).toHaveLength(2)
    expect(r.systems[0].columns.length).toBe(12 + 4)
  })
})

describe('tab panel read from a video (The Prayer, section 2)', () => {
  it('completes a line of high notes whose lowest hole row has no covered hole', () => {
    const png = PNG.sync.read(readFileSync(new URL('./__fixtures__/prayer-2.png', import.meta.url)))
    const r = recognizeTab({ width: png.width, height: png.height, data: png.data })
    expect(r.systems).toHaveLength(2)
    expect(r.systems.reduce((n, s) => n + s.columns.length, 0)).toBe(55)
  })

  it('reads "tu", "du" and "-" written as syllables under the notes', () => {
    const png = PNG.sync.read(readFileSync(new URL('./__fixtures__/prayer-2.png', import.meta.url)))
    const got = sectionNotes(sectionFromRecognition(recognizeTab({ width: png.width, height: png.height, data: png.data }), 's', 'S'))
    const want = sectionNotes(thePrayer.sections[1]).filter((n) => n.pitch != null)
    const attacks = got.filter((g, i) => (g.attack ?? 'tongue') === (want[i].attack ?? 'tongue')).length / want.length
    expect(attacks).toBeGreaterThanOrEqual(0.65)
  })
})

describe('syllables "tu", "du", "ru" in a serif typeface (A Story You Won\'t Believe screenshots)', () => {
  const answers = JSON.parse(readFileSync(new URL('./__fixtures__/story-attacks.json', import.meta.url), 'utf8')) as Record<string, string>
  const code = { tongue: 't', ru: 'r', slur: '-', trru: 'f' } as const
  it.each(Object.keys(answers).filter((k) => k.startsWith('story-')))('reads every attack on %s', (name) => {
    const png = PNG.sync.read(readFileSync(new URL(`./__fixtures__/${name}.png`, import.meta.url)))
    const r = recognizeTab({ width: png.width, height: png.height, data: png.data }, 'C')
    const got = r.systems.flatMap((s) => s.columns.map((c) => (c.attack ? code[c.attack] : '·')))
    const want = answers[name].replace(/[\s/]+/g, '')
    expect(got).toHaveLength(want.length)
    // a page of joined "tu" must not read as "ru"; the wide "trru" is a rolled attack of its own
    expect(got.join('')).toBe(want)
  })
  it.each(Object.keys(answers).filter((k) => k.startsWith('story-')))('groups the notes of %s as the page does', (name) => {
    const png = PNG.sync.read(readFileSync(new URL(`./__fixtures__/${name}.png`, import.meta.url)))
    const s = sectionFromRecognition(recognizeTab({ width: png.width, height: png.height, data: png.data }, 'C'), 's', 'S', 'C')
    // a line of pairs ("tu tu  tu du  …") too: half its gaps are between groups
    const got = s.phrases.map((p, i) => ((s.lineBreaks ?? []).includes(i) ? '/ ' : '') + p.length).join(' ')
    expect(got).toBe(answers[name].split(' ').map((g) => (g === '/' ? '/' : String(g.length))).join(' '))
  })
})

describe('tab panel read from a video (Kaer Morhen, section 2)', () => {
  it('reads "tu" and dashes even with "+" marks right against them, not as note names', () => {
    const png = PNG.sync.read(readFileSync(new URL('./__fixtures__/kaer-morhen-2.png', import.meta.url)))
    const r = recognizeTab({ width: png.width, height: png.height, data: png.data })
    const notes = sectionNotes(sectionFromRecognition(r, 's', 'S'))
    expect(notes).toHaveLength(30)
    expect(r.warnings.join(' ')).not.toMatch(/Note names/)
    expect(notes.filter((n) => n.attack === 'tongue').length).toBe(2)
    expect(notes.filter((n) => n.attack === 'slur').length).toBeGreaterThanOrEqual(24)
  })
})

describe('a tab that writes no articulation', () => {
  const read = (name: string) => {
    const png = PNG.sync.read(readFileSync(new URL(`./__fixtures__/${name}.png`, import.meta.url)))
    return recognizeTab({ width: png.width, height: png.height, data: png.data })
  }

  it.each(['simple-1', 'simple-2', 'simple-3'])('%s writes none (dots only, "+" marks, note names)', (name) => {
    expect(writesArticulation(read(name))).toBe(false)
  })

  it.each(['shepard-1', 'prayer-2', 'story-1', 'story-2'])('%s writes it', (name) => {
    expect(writesArticulation(read(name))).toBe(true)
  })

  it('is tongued throughout, rests left alone', () => {
    const section = withAttack({ id: 's', name: 'S', phrases: [[{ pitch: 74, beats: 1, attack: 'ru' }, { pitch: null, beats: 1 }, { pitch: 76, beats: 1 }]] }, 'tongue')
    expect(section.phrases[0].map((n) => n.attack)).toEqual(['tongue', undefined, 'tongue'])
  })
})
