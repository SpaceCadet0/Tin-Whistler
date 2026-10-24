/** Hole state on the whistle: 1 = covered, 0 = open, 0.5 = half-holed. */
export type HoleState = 0 | 0.5 | 1

/** Six finger holes, index 0 = top (left index finger) … 5 = bottom (right ring finger). */
export type Fingering = readonly [HoleState, HoleState, HoleState, HoleState, HoleState, HoleState]

/** Whistle register: 1 = low (normal breath), 2 = high (overblown). */
export type Register = 1 | 2

export interface LocalizedText {
  en: string
  ru: string
}

/** A playable note on a specific whistle. */
export interface WhistleNote {
  /** Stable id, e.g. "D", "F#", "D'" (apostrophe = second register). */
  id: string
  /** Letter name as shown to learners ("F#", "C"). */
  name: string
  register: Register
  midi: number
  /** Reference frequency at A4 = 440 Hz. */
  frequency: number
  fingering: Fingering
  alternateFingerings?: Fingering[]
  /** True for notes that need half-holing or cross-fingering. */
  chromatic?: boolean
  /** Key used by the synth / audio reference. */
  audioRef: string
}

export interface WhistleKey {
  id: string
  label: string
  /** MIDI number of the lowest note (all holes covered). D whistle = D5 = 74. */
  baseMidi: number
}

/** How a note starts (tab articulation). */
export type Attack = 'tongue' | 'ru' | 'slur'

export type OrnamentType = 'cut' | 'bounce' | 'slide' | 'roll' | 'trill'

export interface Ornament {
  type: OrnamentType
  /** Hole (1-6) marked with a ring in the tab, the finger that performs the ornament. */
  hole?: number
  /** Number of notes covered by a slide oval (default 1). */
  span?: number
}

export interface TuneNote {
  /** MIDI pitch (may be fractional for microtonal half-holes); null = rest. */
  pitch: number | null
  /** Duration in beats. */
  beats: number
  attack?: Attack
  /** "i", sharply break the sound at the end of the note. */
  stop?: boolean
  ornament?: Ornament
  /** Explicit fingering (cross-fingering / half-hole); otherwise the standard one is used. */
  fingering?: Fingering
}

/** A phrase = visually grouped notes (a group of columns in the tab). */
export type Phrase = TuneNote[]

export interface SecondVoice {
  /** Index (within the section, flattened) of the main-voice note where voice 2 enters. */
  startNote: number
  notes: TuneNote[]
}

export interface TuneSection {
  id: string
  name: string
  phrases: Phrase[]
  /** Phrase indexes that start a new display line. */
  lineBreaks?: number[]
  secondVoice?: SecondVoice
  /** Play the section this many times in full playback (default 1). */
  repeat?: number
}

/** Kinds of tunes, in the order the library offers them: dance tunes, then songs and airs, then the rest. */
export const TUNE_TYPES = [
  'reel',
  'jig',
  'slip-jig',
  'hornpipe',
  'polka',
  'slide',
  'march',
  'waltz',
  'air',
  'song',
  'shanty',
  'hymn',
  'carol',
  'children',
  'anthem',
  'classical',
  'soundtrack',
  'exercise',
] as const
export type TuneType = (typeof TUNE_TYPES)[number]

export type TuneOrigin = 'builtin' | 'user'

export interface Tune {
  id: string
  title: string
  composer?: string
  description?: LocalizedText
  origin: TuneOrigin
  /** Import format when origin = user. */
  source?: 'abc' | 'midi' | 'image' | 'notation' | 'editor'
  type: TuneType
  whistle: string
  key: string
  meter?: string
  /** Tempo in beats per minute at 100%. */
  bpm: number
  /** Beats per metronome click (e.g. 3 for jigs written in eighths). Default 1. */
  pulse?: number
  /** Beats per bar, for accenting the metronome. */
  beatsPerBar?: number
  /** 1 (very easy) … 5 (advanced). */
  difficulty: number
  sections: TuneSection[]
  tags?: string[]
  createdAt?: number
  updatedAt?: number
}

/** A note placed in time (seconds from start), produced by flattening a tune. */
export interface TimedNote {
  index: number
  sectionIndex: number
  phraseIndex: number
  /** Index of the note within its section (flattened). */
  noteInSection: number
  note: TuneNote
  start: number
  duration: number
  startBeat: number
}
