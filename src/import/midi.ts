import { Midi } from '@tonejs/midi'
import { autoSection, phrasesFromNotes } from '../music/tune'
import type { Tune, TuneNote } from '../music/types'
import { estimateDifficulty } from './abc'
import { bestFit, transposeNotes } from './fit'

export interface MidiTrackInfo {
  index: number
  name: string
  notes: number
  instrument: string
}

export interface MidiImport {
  tracks: MidiTrackInfo[]
  /** Build a tune from one track. */
  build: (trackIndex: number, opts?: { title?: string; grid?: number; sectionBeats?: number }) => { tune: Tune; warnings: string[] }
}

/**
 * MIDI → Tune: pick a track, reduce it to a single melodic line (highest note wins), quantise to
 * a grid, move it into the whistle's range and split it into learnable sections.
 */
export function readMidi(buffer: ArrayBuffer, fileName = 'MIDI tune', whistleId = 'D'): MidiImport {
  const midi = new Midi(buffer)
  const ppq = midi.header.ppq
  const bpm = Math.round(midi.header.tempos[0]?.bpm ?? 120)
  const ts = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4]
  const beatsPerBar = (ts[0] * 4) / ts[1]
  const tracks = midi.tracks
    .map((t, index) => ({ index, name: t.name || `Track ${index + 1}`, notes: t.notes.length, instrument: t.instrument?.name ?? '', drums: t.channel === 9 }))
    .filter((t) => t.notes > 0 && !t.drums)
    .sort((a, b) => b.notes - a.notes)

  const build: MidiImport['build'] = (trackIndex, opts = {}) => {
    const warnings: string[] = []
    const grid = opts.grid ?? 0.25
    const src = [...midi.tracks[trackIndex].notes].sort((a, b) => a.ticks - b.ticks || b.midi - a.midi)
    // skyline: at each onset keep the highest note, cut the previous one at the next onset
    const line: { start: number; end: number; midi: number }[] = []
    for (const n of src) {
      const start = Math.round(n.ticks / ppq / grid) * grid
      const end = Math.max(start + grid, Math.round((n.ticks + n.durationTicks) / ppq / grid) * grid)
      const last = line[line.length - 1]
      if (last && Math.abs(last.start - start) < 1e-6) {
        if (n.midi > last.midi) last.midi = n.midi
        continue
      }
      if (last && last.end > start) last.end = start
      line.push({ start, end, midi: n.midi })
    }
    if (src.length > line.length * 1.3) warnings.push('Chords were reduced to their top note.')

    const notes: TuneNote[] = []
    let t = line[0]?.start ?? 0
    for (const n of line) {
      if (n.start - t >= grid) notes.push({ pitch: null, beats: n.start - t })
      const beats = Math.max(grid, n.end - n.start)
      const prev = notes[notes.length - 1]
      notes.push({ pitch: n.midi, beats, attack: prev && prev.pitch != null && Math.abs(t - n.start) < 1e-6 ? 'slur' : 'tongue' })
      t = n.start + beats
    }
    const fit = bestFit(notes.filter((n) => n.pitch != null).map((n) => n.pitch!), whistleId)
    if (fit.outOfRange) warnings.push(`${fit.outOfRange} note(s) were outside the whistle range and were moved by an octave.`)
    if (fit.shift % 12 !== 0) warnings.push(`Transposed by ${fit.shift > 0 ? '+' : ''}${fit.shift} semitones to suit the whistle.`)
    const fitted = transposeNotes(notes, fit.shift, whistleId)
    const phrases = phrasesFromNotes(fitted, beatsPerBar, beatsPerBar * 2)
    const sections = autoSection(phrases, opts.sectionBeats ?? beatsPerBar * 8, 'Part').map((s) => ({
      ...s,
      lineBreaks: s.phrases.map((_, k) => k).filter((k) => k > 0 && k % 2 === 0),
    }))
    return {
      tune: {
        id: `user-${Date.now().toString(36)}`,
        title: opts.title || midi.name || fileName.replace(/\.midi?$/i, ''),
        origin: 'user',
        source: 'midi',
        type: 'song',
        whistle: whistleId,
        key: 'D',
        meter: `${ts[0]}/${ts[1]}`,
        bpm,
        beatsPerBar,
        pulse: ts[1] === 8 && ts[0] % 3 === 0 ? 1.5 : 1,
        difficulty: estimateDifficulty(sections),
        sections,
        createdAt: Date.now(),
      },
      warnings,
    }
  }

  return { tracks: tracks.map(({ drums: _d, ...t }) => t), build }
}
