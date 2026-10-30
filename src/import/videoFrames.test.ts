import { describe, expect, it } from 'vitest'
import type { RGBAImage } from './tabImage'
import { keepStill, medianFrame, paperPanel, stillMask, tabPages, tabRegion } from './videoFrames'

/** A 40×20 frame: light page on the left (x < 24), dark "player" on the right, an optional marker. */
function frame(markerX: number | null, playerShade = 40): RGBAImage {
  const W = 40
  const H = 20
  const data = new Uint8Array(W * H * 4)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const v = x < 24 ? 245 : playerShade
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
      // the "current note" highlight: a pale blue column on the page
      if (markerX != null && x === markerX) {
        data[i] = 200
        data[i + 1] = 225
      }
    }
  return { width: W, height: H, data }
}

describe('reading the tab panel out of video frames', () => {
  it('drops the moving highlight with the per-pixel median', () => {
    const med = medianFrame([frame(3), frame(8), frame(13), frame(18), frame(null)])
    for (const x of [3, 8, 13, 18]) expect(med.data[(5 * 40 + x) * 4]).toBe(245)
  })

  it('whitens what moves and finds the light page', () => {
    const frames = [frame(null, 20), frame(null, 120), frame(null, 60), frame(null, 160)]
    const clean = keepStill(medianFrame(frames), stillMask(frames))
    expect(clean.data[(5 * 40 + 30) * 4]).toBe(255)
    expect(paperPanel(frame(null))).toEqual({ x: 0, y: 0, width: 24, height: 20 })
  })

  it('cuts a video without chapters where the tab page turns', () => {
    const page = (v: number) => new Uint8Array(64).fill(v)
    const thumbs = [...Array(12).fill(page(200)), ...Array(14).fill(page(90))]
    expect(tabPages(thumbs, 1, 26)).toEqual([
      [0, 12],
      [12, 26],
    ])
  })

  it('sees a turn that changes only a few dots, held still before and after', () => {
    // 2 of 100 pixels step once and stay (the next page shares most of the tab)
    const page = (turned: boolean) => Uint8Array.from({ length: 100 }, (_, p) => (turned && p < 2 ? 90 : 200))
    const thumbs = [...Array(10).fill(page(false)), ...Array(4).fill(page(true))]
    expect(tabPages(thumbs, 1, 14)).toEqual([
      [0, 10],
      [10, 14],
    ])
  })

  it('does not cut where a few pixels flicker and come back', () => {
    const still = new Uint8Array(100).fill(200)
    const flicker = Uint8Array.from({ length: 100 }, (_, p) => (p < 2 ? 90 : 200))
    const thumbs = [...Array(8).fill(still), flicker, ...Array(8).fill(still)]
    expect(tabPages(thumbs, 1, 17)).toEqual([[0, 17]])
  })
})

describe('finding the tab in a frame', () => {
  it('boxes the grid of equal dots, not the rest of the picture', () => {
    const W = 200
    const H = 120
    const data = new Uint8Array(W * H * 4).fill(250)
    const disc = (cx: number, cy: number, r: number, v: number) => {
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) data.fill(v, (y * W + x) * 4, (y * W + x) * 4 + 3)
    }
    // a 6 × 5 grid of dots at x 40…88, y 40…80, and a big dark blob (a hand) on the right
    for (let c = 0; c < 5; c++) for (let r = 0; r < 6; r++) disc(40 + c * 12, 40 + r * 8, 3, 30)
    disc(170, 60, 25, 20)
    const box = tabRegion({ width: W, height: H, data })!
    expect(box.x).toBeLessThan(37)
    expect(box.x + box.width).toBeGreaterThan(91)
    expect(box.x + box.width).toBeLessThan(140)
    expect(box.y).toBeLessThan(37)
  })

  it('finds a short tab cut out tight round its big dots', () => {
    // 4 columns of 6 dots 14 px wide on a 100 × 160 crop: each dot is more than a twentieth of it
    const W = 100
    const H = 160
    const data = new Uint8Array(W * H * 4).fill(250)
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 6; r++)
        for (let y = -7; y <= 7; y++)
          for (let x = -7; x <= 7; x++) if (x * x + y * y <= 49) data.fill(40, ((40 + r * 18 + y) * W + 20 + c * 20 + x) * 4, ((40 + r * 18 + y) * W + 20 + c * 20 + x) * 4 + 3)
    expect(tabRegion({ width: W, height: H, data })).not.toBeNull()
  })
})
