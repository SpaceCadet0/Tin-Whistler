import { fingeringToString, parseFingering } from './fingerings'
import { midiToName } from './pitch'
import type { Attack, OrnamentType, Phrase, TuneNote, TuneSection } from './types'
import { getWhistle } from './whistles'

/**
 * Compact text notation for whistle tabs, used for built-in tune data and text export.
 *
 *   token   = [art ":"] pitch ["+"] ["!"] ["^" orn [hole] ["~" span]] ["[" fingering "]"] ["*" beats]
 *   art     = "t" (tongue) | "r" ("ru") | "-" (slur) | "f" (rolled "trru", a flutter)
 *   pitch   = "z" (rest) | A-G with optional "#" / "b"
 *   "+"     = second register,  "!" = sharp stop ("i")
 *   orn     = C (cut) | B (bounce) | S (slide) | R (roll) | T (trill)
 *   "|" separates phrases, "/" starts a new display line.
 *
 * Example: `t:D*0.5 -:E^C4*0.25 | t:A+! -:B+*2`
 */

const TOKEN =
  /^(?:([trf-]):)?(z|[A-G](?:#|b)?)(\+)?(!)?(?:\^([CBSRT])(\d)?(?:~(\d+))?)?(?:\[([01h]{6})\])?(?:\*([\d./]+))?(!)?$/

const ATTACKS: Record<string, Attack> = { t: 'tongue', r: 'ru', '-': 'slur', f: 'trru' }
const ATTACK_CODES: Record<Attack, string> = { tongue: 't', ru: 'r', slur: '-', trru: 'f' }
const ORNAMENTS: Record<string, OrnamentType> = { C: 'cut', B: 'bounce', S: 'slide', R: 'roll', T: 'trill' }
const ORNAMENT_CODES: Record<OrnamentType, string> = { cut: 'C', bounce: 'B', slide: 'S', roll: 'R', trill: 'T' }
const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function parseBeats(s: string | undefined): number {
  if (!s) return 1
  if (s.includes('/')) {
    const [a, b] = s.split('/')
    return (a ? Number(a) : 1) / (b ? Number(b) : 2)
  }
  return Number(s)
}

export function pitchFromName(name: string, upper: boolean, whistleId = 'D'): number {
  const base = getWhistle(whistleId).baseMidi
  let pc = PITCH_CLASS[name[0]]
  if (name[1] === '#') pc += 1
  if (name[1] === 'b') pc -= 1
  pc = (pc + 12) % 12
  let midi = base + ((pc - (base % 12) + 12) % 12)
  if (upper) midi += 12
  return midi
}

export function parseTabToken(token: string, whistleId = 'D'): TuneNote {
  const m = TOKEN.exec(token)
  if (!m) throw new Error(`Invalid tab token: "${token}"`)
  const [, art, pitch, plus, stop1, orn, hole, span, fg, beats, stop2] = m
  const note: TuneNote = {
    pitch: pitch === 'z' ? null : pitchFromName(pitch, !!plus, whistleId),
    beats: parseBeats(beats),
  }
  if (art) note.attack = ATTACKS[art]
  if (stop1 || stop2) note.stop = true
  if (orn) {
    note.ornament = { type: ORNAMENTS[orn] }
    if (hole) note.ornament.hole = Number(hole)
    if (span) note.ornament.span = Number(span)
  }
  if (fg) note.fingering = parseFingering(fg) ?? undefined
  return note
}

export interface ParsedTabText {
  phrases: Phrase[]
  lineBreaks: number[]
}

export function parseTabText(text: string, whistleId = 'D'): ParsedTabText {
  const phrases: Phrase[] = []
  const lineBreaks: number[] = []
  let current: Phrase = []
  const flush = () => {
    if (current.length) phrases.push(current)
    current = []
  }
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue
    if (raw === '|') flush()
    else if (raw === '/') {
      flush()
      if (phrases.length) lineBreaks.push(phrases.length)
    } else current.push(parseTabToken(raw, whistleId))
  }
  flush()
  return { phrases, lineBreaks }
}

export function sectionFromTabText(id: string, name: string, text: string, whistleId = 'D'): TuneSection {
  const { phrases, lineBreaks } = parseTabText(text, whistleId)
  return { id, name, phrases, lineBreaks: lineBreaks.length ? lineBreaks : undefined }
}

const trimNum = (n: number) => String(Math.round(n * 10000) / 10000)

export function noteToTabToken(note: TuneNote, whistleId = 'D'): string {
  const base = getWhistle(whistleId).baseMidi
  let s = note.attack ? `${ATTACK_CODES[note.attack]}:` : ''
  if (note.pitch == null) s += 'z'
  else {
    const m = Math.round(note.pitch)
    s += midiToName(m)
    if (m - base >= 12) s += '+'
  }
  if (note.stop) s += '!'
  if (note.ornament) {
    s += `^${ORNAMENT_CODES[note.ornament.type]}${note.ornament.hole ?? ''}`
    if (note.ornament.span && note.ornament.span > 1) s += `~${note.ornament.span}`
  }
  if (note.fingering) s += `[${fingeringToString(note.fingering)}]`
  if (note.beats !== 1) s += `*${trimNum(note.beats)}`
  return s
}

export function sectionToTabText(section: TuneSection, whistleId = 'D'): string {
  const breaks = new Set(section.lineBreaks ?? [])
  return section.phrases
    .map((p, i) => {
      const body = p.map((n) => noteToTabToken(n, whistleId)).join(' ')
      return i === 0 ? body : `${breaks.has(i) ? '/' : '|'} ${body}`
    })
    .join(' ')
}
