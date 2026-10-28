import { describe, expect, it } from 'vitest'
import { cleanTab, holesOf } from './tabClean'
import { levelsOf, pageFrameTimes, quietWindow } from './videoTune'

const W = 240
const H = 160
type RGB = [number, number, number]
const NAVY: RGB = [30, 40, 90]
/** A dark picture behind the lower part of the page (a forest, a town). */
const PICTURE: RGB = [60, 90, 60]
const PICTURE_FROM = 68
const PICTURE_TO = 140
/** Hole `k` (of 6) in column `i`: covered or open, alternately. */
const holeAt = (i: number, k: number) => [30 + i * 16, 30 + k * 14]
const covered = (i: number, k: number) => (i + k) % 2 === 0

/** A light page with a tab of eight columns of six holes, its lower half over a picture, plus whatever `draw` paints. */
function page(draw: (set: (x: number, y: number, rgb: RGB) => void) => void) {
  const data = new Uint8Array(W * H * 4).fill(250)
  const set = (x: number, y: number, [r, g, b]: RGB) => data.set([r, g, b, 255], (y * W + x) * 4)
  for (let y = PICTURE_FROM; y < PICTURE_TO; y++) for (let x = 0; x < W; x++) set(x, y, PICTURE)
  for (let i = 0; i < 8; i++) {
    for (let k = 0; k < 6; k++) {
      const [cx, cy] = holeAt(i, k)
      for (let y = cy - 5; y <= cy + 5; y++) {
        for (let x = cx - 5; x <= cx + 5; x++) {
          const r = Math.hypot(x - cx, y - cy)
          if (r <= 5) set(x, y, covered(i, k) || r > 3.6 ? NAVY : [250, 250, 250])
        }
      }
    }
  }
  draw(set)
  return { width: W, height: H, data }
}
const at = (img: { data: Uint8Array | Uint8ClampedArray }, x: number, y: number) => [...img.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3)]

describe('a clean page out of the video', () => {
  const img = page((set) => {
    // a hand that stayed still: a big dark patch
    for (let y = 20; y < 60; y++) for (let x = 170; x < 220; x++) set(x, y, [60, 40, 30])
    // a dash of articulation on the paper
    for (let x = 30; x < 37; x++) for (let y = 150; y < 152; y++) set(x, y, [40, 40, 40])
    // a rule from the picture behind, reaching the edge
    for (let x = 0; x < 20; x++) set(x, 154, [20, 20, 20])
    // a light "t" over the picture
    for (let y = 115; y < 125; y++) for (let x = 70; x < 72; x++) set(x, y, [240, 240, 240])
    for (let x = 67; x < 75; x++) set(x, 117, [240, 240, 240])
  })
  const out = cleanTab(img)

  it('keeps the holes, covered and open, over the paper and over the picture', () => {
    expect(at(out, ...(holeAt(0, 0) as [number, number]))).toEqual(NAVY)
    expect(at(out, ...(holeAt(1, 0) as [number, number]))).toEqual([250, 250, 250])
    expect(at(out, ...(holeAt(0, 4) as [number, number]))).toEqual(NAVY)
    // an open hole over the picture: its light centre and its ring both stay
    const [x, y] = holeAt(1, 4)
    expect(at(out, x, y)).toEqual([250, 250, 250])
    expect(at(out, x + 5, y)).toEqual(NAVY)
  })

  it('keeps a covered hole that a ring cuts into: it stands where its row crosses its column', () => {
    const cut = page((set) => {
      // a ring round the hole above cuts a red band through this one
      const [x, y] = holeAt(2, 2)
      for (let xx = x - 6; xx <= x + 6; xx++) for (let yy = y - 1; yy <= y + 1; yy++) set(xx, yy, [170, 30, 40])
    })
    const [x, y] = holeAt(2, 2)
    expect(holesOf(cut)!.centres.some(([u, v]) => Math.abs(u - x) < 2 && Math.abs(v - y) < 2)).toBe(true)
    expect(at(cleanTab(cut), x, y + 3)).toEqual(NAVY)
  })

  it('turns the picture between the holes to paper', () => {
    const [x, y] = holeAt(1, 4)
    expect(at(out, x + 8, y)).toEqual([255, 255, 255])
    expect(at(out, 200, 100)).toEqual([255, 255, 255])
  })

  it('keeps small marks and draws light text over the picture dark', () => {
    expect(at(out, 33, 150)).toEqual([40, 40, 40])
    expect(at(out, 70, 120)[0]).toBeLessThan(100)
  })

  it('drops a big dark blob and what reaches the edge', () => {
    expect(at(out, 190, 40)).toEqual([255, 255, 255])
    expect(at(out, 5, 154)).toEqual([255, 255, 255])
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
