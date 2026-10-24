import { describe, expect, it } from 'vitest'
import { parseAbc } from './abc'

const ABC = (body: string) => `X:1\nT:Test\nM:4/4\nL:1/8\nK:D\n${body}`

describe('ABC whistle extras', () => {
  it('reads slide, tap, trill and "ru" decorations', () => {
    const notes = parseAbc(ABC('!slide!F2 !tap!A2 !trill!B2 !ru!d2|')).tune.sections[0].phrases.flat()
    expect(notes.map((n) => n.ornament?.type)).toEqual(['slide', 'bounce', 'trill', undefined])
    expect(notes[3].attack).toBe('ru')
  })

  it('reads the one-letter decorations T, P and M', () => {
    const notes = parseAbc(ABC('TF2 PA2 MB2 d2|')).tune.sections[0].phrases.flat()
    expect(notes.map((n) => n.ornament?.type)).toEqual(['trill', 'cut', 'bounce', undefined])
  })

  it('keeps a pickup before the first repeat in the first part', () => {
    const { sections } = parseAbc(ABC('E|:D2 E2 F2 G2|A8:|\n|:B8|d8:|')).tune
    expect(sections).toHaveLength(2)
    expect(sections[0].phrases.flat()).toHaveLength(6)
    expect(sections[0].repeat).toBe(2)
  })

  it('cuts phrases at breath marks and keeps the ABC line layout', () => {
    const section = parseAbc(ABC('D2 E2 F2 G2|A4 !breath!B4|\nA2 F2 !breath!E2 D2|D8|')).tune.sections[0]
    expect(section.phrases.map((p) => p.length)).toEqual([5, 3, 3])
    expect(section.lineBreaks).toEqual([2])
  })

  it('names the key it moved the melody to', () => {
    expect(parseAbc('X:1\nT:T\nM:4/4\nL:1/8\nK:FMin\nCFG|AF3- F CFG|AF3- F z2|', 'C').tune.key).toBe('AMin')
  })

  it('keeps the written key when asked, choosing only the octave', () => {
    const abc = 'X:1\nT:T\nM:4/4\nL:1/8\nK:Dmin\nA,2DA, FA,DA,|B,2DB, FB,DB,|'
    expect(parseAbc(abc, 'D').tune.key).not.toBe('Dmin')
    const kept = parseAbc(abc, 'G', 0)
    expect(kept.tune.key).toBe('Dmin')
    expect(kept.transposed % 12).toBe(0)
  })

  it('still groups two bars per phrase without breath marks', () => {
    const section = parseAbc(ABC('D2 E2 F2 G2|A8|B8|d8|')).tune.sections[0]
    expect(section.phrases).toHaveLength(2)
  })
})
