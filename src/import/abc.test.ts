import { describe, expect, it } from 'vitest'
import { parseAbc } from './abc'

const ABC = (body: string) => `X:1\nT:Test\nM:4/4\nL:1/8\nK:D\n${body}`

describe('ABC whistle extras', () => {
  it('reads slide, tap, trill and "ru" decorations', () => {
    const notes = parseAbc(ABC('!slide!F2 !tap!A2 !trill!B2 !ru!d2|')).tune.sections[0].phrases.flat()
    expect(notes.map((n) => n.ornament?.type)).toEqual(['slide', 'bounce', 'trill', undefined])
    expect(notes[3].attack).toBe('ru')
  })

  it('cuts phrases at breath marks and keeps the ABC line layout', () => {
    const section = parseAbc(ABC('D2 E2 F2 G2|A4 !breath!B4|\nA2 F2 !breath!E2 D2|D8|')).tune.sections[0]
    expect(section.phrases.map((p) => p.length)).toEqual([5, 3, 3])
    expect(section.lineBreaks).toEqual([2])
  })

  it('still groups two bars per phrase without breath marks', () => {
    const section = parseAbc(ABC('D2 E2 F2 G2|A8|B8|d8|')).tune.sections[0]
    expect(section.phrases).toHaveLength(2)
  })
})
