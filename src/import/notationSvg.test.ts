import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sectionNotes } from '../music/tune'
import { parseNotationSvg } from './notationSvg'
import { pathGlyphs } from './svgPath'

const svg = readFileSync(new URL('./__fixtures__/shepherds-flute-score.svg', import.meta.url), 'utf8')

describe('SVG path glyphs', () => {
  it('splits glyphs on absolute moves and counts holes', () => {
    const g = pathGlyphs('M10 10h5v5h-5zm1 1h3v3h-3zM30 10l4 2v3')
    expect(g).toHaveLength(2)
    expect(g[0]).toMatchObject({ x0: 10, x1: 15, subpaths: 2 })
    expect(g[1]).toMatchObject({ x0: 30, x1: 34, y1: 15 })
  })

  it('reads packed arc flags and numbers', () => {
    const [g] = pathGlyphs('M0 0a2.848 2.848 0 00-1.14-.25l.5.5')
    expect(g.x0).toBeCloseTo(-1.14)
    expect(g.y0).toBeCloseTo(-0.25)
  })
})

describe('sheet music (MuseScore SVG) import', () => {
  const r = parseNotationSvg(svg, "Shepherd's Flute")
  const notes = r.tune.sections.flatMap(sectionNotes)

  it('finds staves, bars and the metre', () => {
    expect(r.stats.staves).toBe(7)
    expect(r.stats.measures).toBe(38)
    expect(r.tune.meter).toBe('6/4')
    expect(r.warnings.some((w) => w.includes("don't add up"))).toBe(false)
  })

  it('reads pitches and rhythms of the opening bars', () => {
    // bar 1: d8 e2 d8 e2.  (whistle D5 = 74)
    expect(notes.slice(0, 4).map((n) => [n.pitch, n.beats])).toEqual([
      [74, 0.5],
      [76, 2],
      [74, 0.5],
      [76, 3],
    ])
    expect(notes[1].attack).toBe('slur')
  })

  it('handles sharps, triplets, grace notes, bends and high notes', () => {
    expect(notes.some((n) => n.pitch === 78)).toBe(true) // F#
    expect(notes.some((n) => Math.abs(n.beats - 1 / 3) < 1e-3)).toBe(true) // eighth-note triplet
    expect(notes.some((n) => n.ornament?.type === 'cut')).toBe(true)
    expect(notes.some((n) => n.ornament?.type === 'slide')).toBe(true)
    expect(Math.max(...notes.map((n) => n.pitch ?? 0))).toBeGreaterThanOrEqual(93)
  })

  it('splits the long tune into sections with system line breaks', () => {
    expect(r.tune.sections.length).toBeGreaterThanOrEqual(4)
    expect(r.tune.sections.some((s) => s.lineBreaks?.length)).toBe(true)
  })
})
