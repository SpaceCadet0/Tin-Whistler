import { describe, expect, it } from 'vitest'
import { recognizeNotation, tuneFromNotationImages } from './notationImage'

/** A tiny rasteriser for synthetic sheet music (black on white RGBA). */
function canvas(W: number, H: number) {
  const data = new Uint8ClampedArray(W * H * 4).fill(255)
  const dot = (x: number, y: number) => {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const p = (y * W + x) * 4
    data[p] = data[p + 1] = data[p + 2] = 0
  }
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) dot(x, y)
  }
  const ellipse = (cx: number, cy: number, rx: number, ry: number, hollow = false) => {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        const d = (x / rx) ** 2 + (y / ry) ** 2
        const inner = (x / (rx - 2.5)) ** 2 + (y / (ry - 2.5)) ** 2
        if (d <= 1 && (!hollow || inner > 1)) dot(cx + x, cy + y)
      }
    }
  }
  return { data, rect, ellipse, image: { width: W, height: H, data } }
}

describe('sheet music from images', () => {
  const sp = 14
  const top = 100
  const bottom = top + 4 * sp
  const yOf = (step: number) => bottom - (step * sp) / 2 // step 0 = E4 (bottom line)

  const c = canvas(900, 260)
  for (let i = 0; i < 5; i++) c.rect(30, top + i * sp, 870, top + i * sp + 1)
  // key signature: two sharps (F on the top line, C in the third space)
  const sharp = (x: number, cy: number) => {
    c.rect(x, cy - 18, x + 1, cy + 18)
    c.rect(x + 8, cy - 20, x + 9, cy + 16)
    for (let k = 0; k < 14; k++) {
      c.rect(x - 2 + k, cy - 6 - k * 0.3, x - 2 + k, cy - 3 - k * 0.3)
      c.rect(x - 2 + k, cy + 4 - k * 0.3, x - 2 + k, cy + 7 - k * 0.3)
    }
  }
  sharp(72, yOf(8))
  sharp(92, yOf(5))
  const head = (x: number, step: number, opts: { hollow?: boolean; stem?: boolean; whole?: boolean } = {}) => {
    const y = yOf(step)
    if (opts.whole) c.ellipse(x, y, 11, 6, true)
    else c.ellipse(x, y, 8, 6, opts.hollow)
    if (opts.stem !== false && !opts.whole) c.rect(x + 7, y - 49, x + 8, y)
  }
  const bar = (x: number) => c.rect(x, top, x + 1, bottom + 1)
  const natural = (x: number, cy: number) => {
    c.rect(x - 14, cy - 20, x - 13, cy + 7)
    c.rect(x - 6, cy - 7, x - 5, cy + 20)
    c.rect(x - 14, cy - 6, x - 5, cy - 4)
    c.rect(x - 14, cy + 4, x - 5, cy + 6)
  }

  // bar 1: G A B C(#) D
  ;[2, 3, 4, 5, 6].forEach((s, i) => head(150 + i * 50, s))
  bar(375)
  // bar 2: E F(#) and a hollow half note G
  head(400, 7)
  head(450, 8)
  head(500, 9, { hollow: true })
  bar(530)
  // bar 3: whole note A on a ledger line, a chord (top note B), natural F, F again (still natural)
  c.rect(545, top - sp, 575, top - sp + 1)
  head(560, 10, { whole: true })
  head(610, 2)
  head(610, 4)
  natural(660 - 8, yOf(8))
  head(660, 8)
  head(710, 8)
  bar(740)
  // bar 4: F again → back to the key's F#
  head(780, 8)

  const r = recognizeNotation(c.image)

  it('finds the staff, the key signature and the bars', () => {
    expect(r.staves).toHaveLength(1)
    expect(Math.round(r.staves[0].spacing)).toBe(sp)
    expect(r.key).toBe(2)
    expect(r.staves[0].bars).toBe(3)
  })

  it('reads every pitch with key, accidentals and chords', () => {
    const notes = r.staves[0].notes
    expect(notes.map((n) => n.pitch)).toEqual([67, 69, 71, 73, 74, 76, 78, 79, 81, 71, 77, 77, 78])
    expect(notes.map((n) => n.measure)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 3])
  })

  it('builds a tune with equal note lengths, fitted to the whistle', () => {
    const { tune, stats } = tuneFromNotationImages([r], 'Test', 'D')
    const notes = tune.sections.flatMap((s) => s.phrases.flat())
    expect(stats.notes).toBe(13)
    expect(notes.every((n) => n.beats === 1 && n.attack === 'tongue')).toBe(true)
    expect(Math.min(...notes.map((n) => n.pitch!))).toBeGreaterThanOrEqual(74)
    expect(tune.sections[0].phrases).toHaveLength(4) // one phrase per bar
  })

  it('reports images without staves', () => {
    const blank = canvas(300, 200)
    blank.ellipse(150, 100, 30, 20)
    const res = recognizeNotation(blank.image)
    expect(res.staves).toHaveLength(0)
    expect(res.warnings[0]).toMatch(/No staves/)
  })
})
