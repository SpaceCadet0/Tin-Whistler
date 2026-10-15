import type { Attack, OrnamentType, TuneNote } from '../../../music/types'
import { whistleNotes } from '../../../music/whistles'

/**
 * Keyboard entry for the tab editor. Keys are read by physical position (`KeyboardEvent.code`),
 * so the scheme also works with a Russian layout:
 *   D E F G A B C   note (Shift = upper octave), N sharp ↔ natural, Z rest
 *   1–4             length in beats, [ ] half / double, . dotted
 *   T R - I         tongue, "ru", slur, sharp stop
 *   Alt + C B S R T cut, bounce, slide, roll, trill (again = remove); Alt + 1…6 ringed hole, Alt + 0 auto
 */

export type NoteLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export type EditorKey =
  | { kind: 'note'; letter: NoteLetter; upper: boolean }
  | { kind: 'natural' }
  | { kind: 'rest' }
  | { kind: 'beats'; beats: number }
  | { kind: 'halve' }
  | { kind: 'double' }
  | { kind: 'dot' }
  | { kind: 'attack'; attack: Attack }
  | { kind: 'stop' }
  | { kind: 'ornament'; ornament: OrnamentType }
  | { kind: 'ring'; hole: number }

type KeyInfo = Pick<KeyboardEvent, 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>

const ORNAMENT_KEYS: Record<string, OrnamentType> = { KeyC: 'cut', KeyB: 'bounce', KeyS: 'slide', KeyR: 'roll', KeyT: 'trill' }
const ATTACK_KEYS: Record<string, Attack> = { KeyT: 'tongue', KeyR: 'ru', Minus: 'slur' }
const LETTERS = new Set<string>(['A', 'B', 'C', 'D', 'E', 'F', 'G'])

export const MIN_BEATS = 0.0625
export const MAX_BEATS = 8

/** The editor action for a key press, or null when the key isn't part of the scheme. */
export function editorKey(e: KeyInfo): EditorKey | null {
  if (e.ctrlKey || e.metaKey) return null
  const digit = /^Digit(\d)$/.exec(e.code)
  if (e.altKey) {
    if (ORNAMENT_KEYS[e.code]) return { kind: 'ornament', ornament: ORNAMENT_KEYS[e.code] }
    if (digit && Number(digit[1]) <= 6) return { kind: 'ring', hole: Number(digit[1]) }
    return null
  }
  const letter = /^Key([A-Z])$/.exec(e.code)?.[1]
  if (letter && LETTERS.has(letter)) return { kind: 'note', letter: letter as NoteLetter, upper: e.shiftKey }
  if (e.shiftKey) return null
  if (ATTACK_KEYS[e.code]) return { kind: 'attack', attack: ATTACK_KEYS[e.code] }
  if (digit && Number(digit[1]) >= 1 && Number(digit[1]) <= 4) return { kind: 'beats', beats: Number(digit[1]) }
  switch (e.code) {
    case 'KeyN':
      return { kind: 'natural' }
    case 'KeyZ':
      return { kind: 'rest' }
    case 'KeyI':
      return { kind: 'stop' }
    case 'BracketLeft':
      return { kind: 'halve' }
    case 'BracketRight':
      return { kind: 'double' }
    case 'Period':
      return { kind: 'dot' }
    default:
      return null
  }
}

/** MIDI pitch for a note letter on this whistle: the scale note first (F → F# on a D whistle). */
export function pitchForLetter(letter: NoteLetter, upper: boolean, whistleId: string): number | undefined {
  const register = upper ? 2 : 1
  const candidates = whistleNotes(whistleId).filter((n) => n.register === register && n.name[0] === letter)
  return (candidates.find((n) => !n.chromatic) ?? candidates[0])?.midi
}

/** The same letter with the other accidental (C# ↔ C), or the pitch unchanged when there is none. */
export function toggleAccidental(midi: number, whistleId: string): number {
  const notes = whistleNotes(whistleId)
  const cur = notes.find((n) => n.midi === Math.round(midi))
  if (!cur) return midi
  return notes.find((n) => n !== cur && n.register === cur.register && n.name[0] === cur.name[0])?.midi ?? midi
}

const clampBeats = (b: number) => Math.min(MAX_BEATS, Math.max(MIN_BEATS, b))

/** Dotted lengths are 1.5 × a power of two (0.75, 1.5, 3 …): toggle the dot. */
export function toggleDot(beats: number): number {
  const dotted = Number.isInteger(Math.log2(beats / 1.5))
  return clampBeats(dotted ? beats / 1.5 : beats * 1.5)
}

export const halveBeats = (beats: number): number => clampBeats(beats / 2)
export const doubleBeats = (beats: number): number => clampBeats(beats * 2)

/** Set an ornament, or remove it when the note already has this one. */
export function toggleOrnament(note: TuneNote, type: OrnamentType): TuneNote {
  if (note.ornament?.type === type) {
    const rest = { ...note }
    delete rest.ornament
    return rest
  }
  return { ...note, ornament: { ...note.ornament, type } }
}

/** Ring a hole (1–6) for the ornament, 0 = automatic; a ring alone means a cut. */
export function setRing(note: TuneNote, hole: number): TuneNote {
  if (!hole) return note.ornament ? { ...note, ornament: { ...note.ornament, hole: undefined } } : note
  return { ...note, ornament: { type: note.ornament?.type ?? 'cut', ...note.ornament, hole } }
}
