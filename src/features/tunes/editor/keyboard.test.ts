import { describe, expect, it } from 'vitest'
import { editorKey, halveBeats, pitchForLetter, setRing, toggleAccidental, toggleDot, toggleOrnament } from './keyboard'

const key = (code: string, mods: { shift?: boolean; alt?: boolean; meta?: boolean } = {}) =>
  editorKey({ code, shiftKey: !!mods.shift, altKey: !!mods.alt, ctrlKey: false, metaKey: !!mods.meta })

describe('editor keyboard scheme', () => {
  it('maps physical keys to actions without overlaps', () => {
    expect(key('KeyG')).toEqual({ kind: 'note', letter: 'G', upper: false })
    expect(key('KeyG', { shift: true })).toEqual({ kind: 'note', letter: 'G', upper: true })
    expect(key('KeyC', { alt: true })).toEqual({ kind: 'ornament', ornament: 'cut' })
    expect(key('KeyT')).toEqual({ kind: 'attack', attack: 'tongue' })
    expect(key('KeyT', { alt: true })).toEqual({ kind: 'ornament', ornament: 'trill' })
    expect(key('Minus')).toEqual({ kind: 'attack', attack: 'slur' })
    expect(key('Digit3')).toEqual({ kind: 'beats', beats: 3 })
    expect(key('Digit3', { alt: true })).toEqual({ kind: 'ring', hole: 3 })
    expect(key('KeyZ')).toEqual({ kind: 'rest' })
    expect(key('KeyN')).toEqual({ kind: 'natural' })
    // Cmd/Ctrl shortcuts (copy, undo…) are left to the editor's own handler
    expect(key('KeyC', { meta: true })).toBeNull()
    expect(key('KeyQ')).toBeNull()
  })

  it('finds notes on the whistle and toggles sharp ↔ natural', () => {
    expect(pitchForLetter('F', false, 'D')).toBe(78) // F# on a D whistle
    expect(pitchForLetter('D', true, 'D')).toBe(86)
    expect(pitchForLetter('C', false, 'D')).toBe(85) // C#
    expect(toggleAccidental(85, 'D')).toBe(84)
    expect(toggleAccidental(84, 'D')).toBe(85)
    expect(toggleAccidental(74, 'D')).toBe(75) // D ↔ D#
    expect(toggleAccidental(76, 'D')).toBe(76) // E has no sharp on the whistle
  })

  it('edits lengths and ornaments', () => {
    expect(toggleDot(1)).toBe(1.5)
    expect(toggleDot(1.5)).toBe(1)
    expect(toggleDot(0.5)).toBe(0.75)
    expect(halveBeats(0.0625)).toBe(0.0625)
    const note = { pitch: 74, beats: 1 }
    const cut = toggleOrnament(note, 'cut')
    expect(cut.ornament).toEqual({ type: 'cut' })
    expect(toggleOrnament(cut, 'cut').ornament).toBeUndefined()
    expect(toggleOrnament(cut, 'roll').ornament).toEqual({ type: 'roll' })
    expect(setRing(note, 4).ornament).toEqual({ type: 'cut', hole: 4 })
    expect(setRing(toggleOrnament(note, 'trill'), 2).ornament).toEqual({ type: 'trill', hole: 2 })
  })
})
