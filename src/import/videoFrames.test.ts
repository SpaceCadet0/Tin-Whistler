import { describe, expect, it } from 'vitest'
import type { RGBAImage } from './tabImage'
import { keepStill, medianFrame, paperPanel, stillMask, tabPages } from './videoFrames'

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
})
