import { describe, expect, it } from 'vitest'
import { cleanTab, levelsOf, pageFrameTimes, quietWindow } from './videoTune'

const W = 240
const H = 120
/** A light page with a row of navy dots, plus whatever else `draw` paints on it. */
function page(draw: (set: (x: number, y: number, rgb: [number, number, number]) => void) => void) {
  const data = new Uint8Array(W * H * 4).fill(250)
  const set = (x: number, y: number, [r, g, b]: [number, number, number]) => data.set([r, g, b, 255], (y * W + x) * 4)
  const disc = (cx: number, cy: number, r: number) => {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, [30, 40, 90])
  }
  for (let i = 0; i < 14; i++) disc(30 + i * 14, 50, 5)
  draw(set)
  return { width: W, height: H, data }
}
const at = (img: { data: Uint8Array | Uint8ClampedArray }, x: number, y: number) => [...img.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3)]

describe('a clean page out of the video', () => {
  it('keeps the dots and small marks, drops a big dark blob and what reaches the edge', () => {
    const img = page((set) => {
      // a hand that stayed still: a big dark patch
      for (let y = 70; y < 110; y++) for (let x = 150; x < 200; x++) set(x, y, [60, 40, 30])
      // a dash of articulation
      for (let x = 30; x < 37; x++) set(x, 75, [40, 40, 40])
      // a rule from the picture behind, reaching the edge
      for (let x = 0; x < 20; x++) set(x, 100, [20, 20, 20])
    })
    const out = cleanTab(img)
    expect(at(out, 30, 50)).toEqual([30, 40, 90])
    expect(at(out, 33, 75)).toEqual([40, 40, 40])
    expect(at(out, 170, 90)).toEqual([255, 255, 255])
    expect(at(out, 5, 100)).toEqual([255, 255, 255])
  })
})

describe('frames without the note highlight', () => {
  const RATE = 1000
  /** Silence until `from` seconds, then playing. */
  const sound = (from: number, seconds: number) => Float32Array.from({ length: RATE * seconds }, (_, i) => (i >= from * RATE ? Math.sin(i) * 0.5 : 0))

  it('finds the stretch after a page appears and before anyone plays it', () => {
    const w = quietWindow(levelsOf(sound(3, 10), RATE), 1, 10)
    expect(w![0]).toBeCloseTo(1.25, 1)
    expect(w![1]).toBeCloseTo(2.85, 1)
  })

  it('has none when the playing goes straight on', () => {
    expect(quietWindow(levelsOf(sound(0, 10), RATE), 1, 10)).toBeNull()
  })

  it('takes fewer frames from that stretch than from across the page, so a waiting highlight drops out', () => {
    const times = pageFrameTimes(levelsOf(sound(3, 20), RATE), 1, 20)
    const quiet = times.filter((t) => t < 3)
    expect(quiet.length).toBeGreaterThan(0)
    expect(quiet.length * 2).toBeLessThan(times.length)
  })
})
