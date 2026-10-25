import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { sectionNotes } from '../music/tune'
import { findPalette, toHouseColours } from './palette'
import { recognizeTab, sectionFromRecognition, type RGBAImage } from './tabImage'

const png = PNG.sync.read(readFileSync(new URL('./__fixtures__/shepard-1.png', import.meta.url)))
const original: RGBAImage = { width: png.width, height: png.height, data: png.data }

/** The same tab drawn in other colours. */
function recolour(img: RGBAImage, f: (r: number, g: number, b: number) => [number, number, number]): RGBAImage {
  const data = new Uint8Array(img.data.length)
  for (let p = 0; p < data.length; p += 4) {
    const [r, g, b] = f(img.data[p], img.data[p + 1], img.data[p + 2])
    data[p] = r
    data[p + 1] = g
    data[p + 2] = b
    data[p + 3] = 255
  }
  return { width: img.width, height: img.height, data }
}

const read = (img: RGBAImage) =>
  sectionNotes(sectionFromRecognition(recognizeTab(img), 's', 'S')).map((n) => `${Math.round(n.pitch ?? 0)}${n.ornament?.type ?? ''}${n.ornament?.hole ?? ''}`)

describe('tabs in any colours', () => {
  const reference = read(toHouseColours(original))

  it('finds the paper, the dot ink and the ornament accent of a page', () => {
    const p = findPalette(original)
    expect(p.paper.every((c) => c > 200)).toBe(true)
    expect(p.accent).not.toBeNull()
    expect(p.accent![0]).toBeGreaterThan(p.accent![2])
  })

  it('reads the same tab with blue ornaments instead of red', () => {
    const blue = recolour(original, (r, g, b) => [b, g, r])
    const got = read(toHouseColours(blue))
    expect(got).toHaveLength(reference.length)
    expect(got.filter((x, i) => x === reference[i]).length / reference.length).toBeGreaterThanOrEqual(0.95)
  })

  it('reads the same tab drawn as a dark theme (light marks on a dark page)', () => {
    const dark = recolour(original, (r, g, b) => [255 - r, 255 - g, 255 - b])
    const got = read(toHouseColours(dark))
    expect(got).toHaveLength(reference.length)
    expect(got.filter((x, i) => x === reference[i]).length / reference.length).toBeGreaterThanOrEqual(0.95)
  })
})
