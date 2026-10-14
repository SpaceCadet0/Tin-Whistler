import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { shepardsFlute } from '../data/tunes/shepardsFlute'
import { sectionNotes } from '../music/tune'
import { recognizeTab, sectionFromRecognition } from './tabImage'

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

  it('finds the upper-voice columns in section 4 as extra phrases', () => {
    const r = load(4)
    expect(r.systems).toHaveLength(2)
    expect(r.systems[0].columns.length).toBe(12 + 4)
  })
})
