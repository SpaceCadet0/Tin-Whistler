import { phrasesFromNotes } from '../music/tune'
import type { Attack, Phrase, Tune, TuneNote, TuneSection, TuneType } from '../music/types'
import { bestFit, transposeNotes } from './fit'

/**
 * ABC notation → Tune. Supports the subset used for folk tunes (thesession.org et al.):
 * headers X T C M L Q K R, notes with accidentals/octaves/lengths, rests, ties, broken rhythm,
 * triplets, chords (top note), grace notes (→ cut), ~ (→ roll), slurs, repeats with 1st/2nd
 * endings (expanded), inline fields. Durations become quarter-note beats.
 */

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F']
/** Semitones from the relative major's tonic up to the modal tonic. */
const MODE_OFFSET: Record<string, number> = { maj: 0, ion: 0, dor: 2, phr: 4, lyd: 5, mix: 7, min: 9, m: 9, aeo: 9, loc: 11 }
const MAJOR_SHARPS: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 }

export interface AbcParseResult {
  tune: Tune
  warnings: string[]
  transposed: number
}

function keySignature(k: string): { acc: Record<string, number>; tonic: string } {
  const m = /^\s*([A-G])([#b]?)\s*([A-Za-z]*)/.exec(k || 'C')
  if (!m || /^none$/i.test(k.trim())) return { acc: {}, tonic: 'C' }
  const tonic = m[1] + m[2]
  const modeRaw = m[3].toLowerCase()
  const mode = modeRaw === '' ? 'maj' : modeRaw.startsWith('min') ? 'min' : modeRaw === 'm' ? 'm' : modeRaw.slice(0, 3)
  const offset = MODE_OFFSET[mode] ?? 0
  // relative major tonic = modal tonic − mode offset (semitones)
  const pc = (LETTER_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12
  const majorPc = (pc - offset + 12) % 12
  const majorName = Object.keys(MAJOR_SHARPS).find((n) => {
    const p = (LETTER_PC[n[0]] + (n[1] === '#' ? 1 : n[1] === 'b' ? -1 : 0) + 12) % 12
    return p === majorPc && Math.abs(MAJOR_SHARPS[n]) <= 6
  })
  const count = majorName ? MAJOR_SHARPS[majorName] : 0
  const acc: Record<string, number> = {}
  if (count > 0) SHARP_ORDER.slice(0, count).forEach((l) => (acc[l] = 1))
  if (count < 0) FLAT_ORDER.slice(0, -count).forEach((l) => (acc[l] = -1))
  // explicit accidentals after the key (e.g. "K:D exp ^c")
  for (const x of k.matchAll(/(\^{1,2}|_{1,2}|=)([A-Ga-g])/g)) acc[x[2].toUpperCase()] = x[1] === '=' ? 0 : x[1][0] === '^' ? x[1].length : -x[1].length
  return { acc, tonic }
}

function parseFraction(s: string): number {
  const [a, b] = s.split('/').map(Number)
  return b ? a / b : a
}

function guessType(meter: string, rhythm: string): TuneType {
  const r = rhythm.toLowerCase()
  const known: TuneType[] = ['reel', 'jig', 'polka', 'march', 'waltz', 'hornpipe', 'slide', 'air']
  const hit = known.find((k) => r.includes(k))
  if (hit) return hit
  if (r.includes('slip')) return 'jig'
  if (meter === '6/8') return 'jig'
  if (meter === '2/4') return 'polka'
  if (meter === '3/4') return 'waltz'
  if (meter === '12/8') return 'slide'
  if (meter === '9/8') return 'jig'
  return 'reel'
}

const DEFAULT_QUARTER_BPM: Record<string, number> = { reel: 190, jig: 165, polka: 140, hornpipe: 150, march: 110, waltz: 140, slide: 180, air: 70, song: 90, exercise: 90 }

interface RawNote extends TuneNote {
  bar: number
  line: number
}

export function parseAbc(text: string, whistleId = 'D'): AbcParseResult {
  const warnings: string[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  const header: Record<string, string> = {}
  let bodyStart = lines.length
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    const m = /^([A-Za-z]):\s*(.*)$/.exec(l)
    if (m) {
      if (!(m[1] in header)) header[m[1]] = m[2].replace(/%.*$/, '').trim()
      if (m[1] === 'K') {
        bodyStart = i + 1
        break
      }
    }
  }
  if (bodyStart >= lines.length && !header.K) throw new Error('No K: (key) line found, is this ABC notation?')

  const meterRaw = header.M || '4/4'
  const meter = meterRaw === 'C' ? '4/4' : meterRaw === 'C|' ? '2/2' : meterRaw
  const meterVal = /^\d+\/\d+$/.test(meter) ? parseFraction(meter) : 1
  let unit = header.L ? parseFraction(header.L) : meterVal < 0.75 ? 1 / 16 : 1 / 8
  let key = keySignature(header.K || 'C')
  const [num, den] = /^\d+\/\d+$/.test(meter) ? meter.split('/').map(Number) : [4, 4]
  const beatsPerBar = (num * 4) / den
  const compound = den === 8 && num % 3 === 0
  const type = guessType(meter, header.R || '')

  let bpm = DEFAULT_QUARTER_BPM[type] ?? 120
  if (header.Q) {
    const q = /(?:(\d+\/\d+)\s*=\s*)?(\d+)/.exec(header.Q)
    if (q) bpm = Math.round(Number(q[2]) * (q[1] ? parseFraction(q[1]) * 4 : unit * 4))
  }

  // ---- body tokenizer ----
  const body = lines
    .slice(bodyStart)
    .map((l) => l.replace(/%.*$/, ''))
    .filter((l) => !/^[A-Za-z]:/.test(l.trim()) || /^K:/.test(l.trim()))
  type Part = { notes: RawNote[]; repeat: boolean; endings: RawNote[][] }
  const parts: Part[] = [{ notes: [], repeat: false, endings: [] }]
  let part = parts[0]
  let target: RawNote[] = part.notes
  let bar = 0
  let barAcc: Record<string, number> = {}
  let pendingGrace = false
  let pendingRoll = false
  let pendingStaccato = false
  let inSlur = 0
  let slurFirst = false
  let tie = false
  let broken: { factor: number } | null = null
  let triplet: { left: number; factor: number } | null = null

  const newPart = (repeat: boolean) => {
    if (part.notes.length === 0 && part.endings.length === 0) {
      part.repeat = part.repeat || repeat
      return
    }
    part = { notes: [], repeat, endings: [] }
    parts.push(part)
    target = part.notes
  }

  body.forEach((rawLine, lineNo) => {
    const s = rawLine
    let i = 0
    while (i < s.length) {
      const c = s[i]
      // inline field [K:..] [L:..] [M:..]
      if (c === '[' && /^\[[A-Za-z]:/.test(s.slice(i))) {
        const end = s.indexOf(']', i)
        const f = s.slice(i + 1, end)
        if (f[0] === 'K') key = keySignature(f.slice(2))
        if (f[0] === 'L') unit = parseFraction(f.slice(2))
        i = end + 1
        continue
      }
      if (c === '"') {
        i = s.indexOf('"', i + 1) + 1 || s.length
        continue
      }
      if (c === '!' || c === '+') {
        const end = s.indexOf(c, i + 1)
        if (end > i) {
          const deco = s.slice(i + 1, end)
          if (deco === 'roll' || deco === 'turn') pendingRoll = true
          if (deco === 'staccato') pendingStaccato = true
          i = end + 1
          continue
        }
      }
      if (c === '{') {
        const end = s.indexOf('}', i)
        pendingGrace = true
        i = end + 1
        continue
      }
      if (c === '~') {
        pendingRoll = true
        i++
        continue
      }
      if (c === '.') {
        pendingStaccato = true
        i++
        continue
      }
      if (c === '(') {
        const tm = /^\((\d)(?::(\d)?)?(?::(\d))?/.exec(s.slice(i))
        if (tm) {
          const p = Number(tm[1])
          const q = tm[2] ? Number(tm[2]) : p === 3 ? 2 : p === 2 ? 3 : p === 4 ? 3 : compound ? 3 : 2
          triplet = { left: tm[3] ? Number(tm[3]) : p, factor: q / p }
          i += tm[0].length
        } else {
          inSlur++
          slurFirst = true
          i++
        }
        continue
      }
      if (c === ')') {
        inSlur = Math.max(0, inSlur - 1)
        i++
        continue
      }
      if (c === '-') {
        tie = true
        i++
        continue
      }
      if (c === '>' || c === '<') {
        let n = 0
        while (s[i] === c) {
          n++
          i++
        }
        const prev = target[target.length - 1]
        const shift = 1 - Math.pow(0.5, n)
        if (prev) {
          const base = prev.beats
          prev.beats = c === '>' ? base * (1 + shift) : base * (1 - shift)
          broken = { factor: c === '>' ? 1 - shift : 1 + shift }
        }
        continue
      }
      // bar lines & repeats
      const barM = /^(:*\|+\]?:*|:+|\[\|:*|\|\]|::)(\[?\d(?:[,-]\d)*)?/.exec(s.slice(i))
      if (barM && (c === '|' || c === ':' || (c === '[' && s[i + 1] === '|'))) {
        const tok = barM[1]
        const ending = barM[2]
        bar++
        barAcc = {}
        const closesRepeat = tok.startsWith(':')
        const opensRepeat = tok.endsWith(':')
        if (closesRepeat) {
          part.repeat = true
          target = part.notes
          if (!ending) newPart(opensRepeat)
        } else if (tok === '||' || tok === '|]') {
          target = part.notes
          newPart(false)
        } else if (opensRepeat) newPart(true)
        if (ending) {
          const e: RawNote[] = []
          part.endings.push(e)
          target = e
        }
        i += barM[0].length
        continue
      }
      if (c === '[' && /^\[\d/.test(s.slice(i))) {
        const m = /^\[(\d)/.exec(s.slice(i))!
        const e: RawNote[] = []
        part.endings.push(e)
        target = e
        i += m[0].length
        continue
      }
      // note / rest / chord
      const chord = c === '['
      let j = i + (chord ? 1 : 0)
      const nm = /^(\^{1,2}|_{1,2}|=)?([A-Ga-gzxZ])([',]*)(\d*\/*\d*)/.exec(s.slice(j))
      if (!nm) {
        i++
        continue
      }
      let pitch: number | null = null
      let lengthStr = nm[4]
      if (chord) {
        // take the highest note of the chord
        const end = s.indexOf(']', i)
        const inner = s.slice(i + 1, end)
        let top: number | null = null
        for (const cm of inner.matchAll(/(\^{1,2}|_{1,2}|=)?([A-Ga-g])([',]*)/g)) {
          const p = notePitch(cm[1], cm[2], cm[3], key.acc, barAcc)
          if (top == null || p > top) top = p
        }
        pitch = top
        const after = /^(\d*\/*\d*)/.exec(s.slice(end + 1))
        lengthStr = after?.[1] || /(\d*\/*\d*)$/.exec(inner)?.[1] || ''
        j = end + 1 + (after?.[1].length ?? 0)
      } else {
        const letter = nm[2]
        if (letter !== 'z' && letter !== 'x' && letter !== 'Z') {
          pitch = notePitch(nm[1], letter, nm[3], key.acc, barAcc)
          if (nm[1]) barAcc[letter.toUpperCase() + (letter === letter.toLowerCase() ? "'" : '')] = accValue(nm[1])
        }
        j += nm[0].length
      }
      if (nm[2] === 'x') {
        i = j
        continue
      }
      let beats = nm[2] === 'Z' ? lengthOf(lengthStr) * beatsPerBar : lengthOf(lengthStr) * unit * 4
      if (broken) {
        beats *= broken.factor
        broken = null
      }
      if (triplet) {
        beats *= triplet.factor
        if (--triplet.left <= 0) triplet = null
      }
      const prev = target[target.length - 1]
      if (tie && prev && prev.pitch === pitch) {
        prev.beats += beats
        tie = false
        i = j
        continue
      }
      tie = false
      const note: RawNote = { pitch, beats, bar, line: lineNo }
      if (pitch != null) {
        let attack: Attack = 'tongue'
        if (inSlur && !slurFirst) attack = 'slur'
        slurFirst = false
        note.attack = attack
        if (pendingGrace) note.ornament = { type: 'cut' }
        if (pendingRoll) note.ornament = { type: 'roll' }
        if (pendingStaccato) note.stop = true
      }
      pendingGrace = pendingRoll = pendingStaccato = false
      target.push(note)
      i = j
    }
  })

  // ---- expand endings, build sections ----
  const letters = 'ABCDEFGHIJ'
  const sectionsRaw: { name: string; notes: RawNote[]; repeat: number }[] = []
  parts
    .filter((p) => p.notes.length || p.endings.length)
    .forEach((p, idx) => {
      const name = `${letters[idx] ?? idx + 1} part`
      if (p.endings.length >= 2) sectionsRaw.push({ name, notes: [...p.notes, ...p.endings[0], ...p.notes, ...p.endings[1]], repeat: 1 })
      else sectionsRaw.push({ name, notes: [...p.notes, ...(p.endings[0] ?? [])], repeat: p.repeat ? 2 : 1 })
    })
  if (!sectionsRaw.length) throw new Error('No notes found in the ABC body.')

  const allPitches = sectionsRaw.flatMap((s) => s.notes.map((n) => n.pitch).filter((p): p is number => p != null))
  const fit = bestFit(allPitches, whistleId)
  if (fit.outOfRange) warnings.push(`${fit.outOfRange} note(s) were outside the whistle range and were moved by an octave.`)

  const sections: TuneSection[] = sectionsRaw.map((s, i) => {
    const notes = transposeNotes(s.notes.map(({ bar: _b, line: _l, ...n }) => n), fit.shift, whistleId)
    const phrases: Phrase[] = phrasesByBars(notes, s.notes.map((n) => n.bar), 2)
    return {
      id: `s${i + 1}`,
      name: s.name,
      phrases,
      lineBreaks: phrases.map((_, k) => k).filter((k) => k > 0 && k % 2 === 0),
      repeat: s.repeat > 1 ? s.repeat : undefined,
    }
  })

  const title = header.T || 'Untitled tune'
  return {
    tune: {
      id: `user-${Date.now().toString(36)}`,
      title,
      composer: header.C || undefined,
      origin: 'user',
      source: 'abc',
      type,
      whistle: whistleId,
      key: (header.K || 'C').split(/\s/)[0],
      meter,
      bpm,
      pulse: compound ? 1.5 : 1,
      beatsPerBar,
      difficulty: estimateDifficulty(sections),
      sections,
      createdAt: Date.now(),
    },
    warnings,
    transposed: fit.shift,
  }
}

function accValue(a: string): number {
  return a === '=' ? 0 : a[0] === '^' ? a.length : -a.length
}

function notePitch(acc: string | undefined, letter: string, octaves: string, keyAcc: Record<string, number>, barAcc: Record<string, number>): number {
  const upper = letter.toUpperCase()
  let midi = 60 + LETTER_PC[upper] + (letter === letter.toLowerCase() ? 12 : 0)
  for (const o of octaves) midi += o === "'" ? 12 : -12
  const barKey = upper + (letter === letter.toLowerCase() ? "'" : '')
  if (acc) midi += accValue(acc)
  else if (barKey in barAcc) midi += barAcc[barKey]
  else midi += keyAcc[upper] ?? 0
  return midi
}

function lengthOf(s: string): number {
  if (!s) return 1
  const m = /^(\d*)(\/*)(\d*)$/.exec(s)
  if (!m) return 1
  const num = m[1] ? Number(m[1]) : 1
  if (!m[2]) return num
  const den = m[3] ? Number(m[3]) : Math.pow(2, m[2].length)
  return num / den
}

/** Group notes into phrases of `barsPerPhrase` bars. */
function phrasesByBars(notes: TuneNote[], bars: number[], barsPerPhrase: number): Phrase[] {
  if (!notes.length) return []
  const phrases: Phrase[] = []
  let cur: TuneNote[] = []
  let startBar = bars[0]
  notes.forEach((n, i) => {
    if (bars[i] - startBar >= barsPerPhrase && cur.length) {
      phrases.push(cur)
      cur = []
      startBar = bars[i]
    }
    cur.push(n)
  })
  if (cur.length) phrases.push(cur)
  return phrases.length > 1 ? phrases : phrasesFromNotes(notes)
}

export function estimateDifficulty(sections: TuneSection[]): number {
  const notes = sections.flatMap((s) => s.phrases.flat()).filter((n) => n.pitch != null)
  if (!notes.length) return 1
  const range = Math.max(...notes.map((n) => n.pitch!)) - Math.min(...notes.map((n) => n.pitch!))
  const fast = notes.filter((n) => n.beats <= 0.5).length / notes.length
  const orn = notes.filter((n) => n.ornament).length / notes.length
  const high = notes.some((n) => n.pitch! >= 86)
  const score = 1 + (range > 7 ? 1 : 0) + (high ? 1 : 0) + (fast > 0.5 ? 1 : 0) + (orn > 0.1 ? 1 : 0) + (notes.length > 120 ? 0.5 : 0)
  return Math.max(1, Math.min(5, Math.round(score)))
}
