import { ornamentSegments } from '../music/ornaments'
import { midiToFrequency } from '../music/pitch'
import type { Attack, Fingering, Ornament } from '../music/types'
import { audioEngine } from './AudioEngine'

/** A note to be rendered by a voice at an absolute AudioContext time. */
export interface VoiceNote {
  time: number
  duration: number
  midi: number | null
  attack?: Attack
  stop?: boolean
  ornament?: Ornament
  fingering?: Fingering
  /** 0…1 loudness multiplier. */
  velocity?: number
  /** Pitch of the following note: a slide glides into it across the note boundary. */
  slideTo?: number | null
}

const HARMONICS = [
  { k: 1, gain: 1 },
  { k: 2, gain: 0.09 },
  { k: 3, gain: 0.035 },
]
const BASE_LEVEL = 0.3
const VIBRATO_CENTS = 11

let noiseBuffer: AudioBuffer | null = null
function getNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuffer.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/**
 * A monophonic whistle voice: a few sine harmonics, band-passed breath noise that follows
 * the pitch, a "chiff" transient on tongued attacks and delayed vibrato. Notes must be
 * scheduled in chronological order (the TunePlayer's look-ahead scheduler guarantees that).
 */
export class WhistleVoice {
  private ctx = audioEngine.context
  private oscs: OscillatorNode[] = []
  private amp: GainNode
  private breathFilter: BiquadFilterNode
  private chiff: GainNode
  private vibrato: GainNode
  private sources: AudioScheduledSourceNode[] = []
  private sounding = false
  private stopped = false
  /** A slide's glide still running into the next note (absolute end time + target pitch). */
  private glide: { until: number; midi: number } | null = null

  private a4: number
  private whistleId: string

  constructor(destination: AudioNode = audioEngine.output, a4 = 440, whistleId = 'D') {
    this.a4 = a4
    this.whistleId = whistleId
    const ctx = this.ctx
    const t = ctx.currentTime
    this.amp = ctx.createGain()
    this.amp.gain.setValueAtTime(0, t)
    this.amp.connect(destination)

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 5.4
    this.vibrato = ctx.createGain()
    this.vibrato.gain.setValueAtTime(0, t)
    lfo.connect(this.vibrato)

    for (const h of HARMONICS) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587 * h.k, t)
      const g = ctx.createGain()
      g.gain.value = h.gain
      osc.connect(g).connect(this.amp)
      this.vibrato.connect(osc.detune)
      this.oscs.push(osc)
    }

    const noise = ctx.createBufferSource()
    noise.buffer = getNoise(ctx)
    noise.loop = true
    this.breathFilter = ctx.createBiquadFilter()
    this.breathFilter.type = 'bandpass'
    this.breathFilter.Q.value = 9
    this.breathFilter.frequency.setValueAtTime(587, t)
    const breathGain = ctx.createGain()
    breathGain.gain.value = 0.55
    noise.connect(this.breathFilter).connect(breathGain).connect(this.amp)

    const chiffFilter = ctx.createBiquadFilter()
    chiffFilter.type = 'highpass'
    chiffFilter.frequency.value = 2500
    this.chiff = ctx.createGain()
    this.chiff.gain.setValueAtTime(0, t)
    noise.connect(chiffFilter).connect(this.chiff).connect(destination)

    this.sources = [lfo, noise, ...this.oscs]
    for (const s of this.sources) s.start(t)
  }

  /** mode: smooth = fast exponential approach, jump = instant, ramp = linear glide ending at `at`. */
  private setPitch(midi: number, at: number, mode: 'smooth' | 'jump' | 'ramp' = 'smooth'): void {
    const f = midiToFrequency(midi, this.a4)
    const params = [...this.oscs.map((o) => o.frequency), this.breathFilter.frequency]
    params.forEach((p, i) => {
      const target = f * (HARMONICS[i]?.k ?? 1)
      if (mode === 'jump') p.setValueAtTime(target, at)
      else if (mode === 'ramp') p.linearRampToValueAtTime(target, at)
      else p.setTargetAtTime(target, at, 0.003)
    })
  }

  private burst(at: number, amount: number): void {
    this.chiff.gain.setTargetAtTime(amount, at, 0.002)
    this.chiff.gain.setTargetAtTime(0, at + 0.014, 0.012)
  }

  schedule(n: VoiceNote): void {
    if (this.stopped) return
    const { time: t, duration } = n
    const amp = this.amp.gain
    if (n.midi == null) {
      amp.setTargetAtTime(0, t, 0.012)
      this.sounding = false
      return
    }
    const level = BASE_LEVEL * (n.velocity ?? 1)
    // the previous note's slide is already carrying the pitch here: keep it legato
    const glidingIn = this.glide != null && this.sounding && t < this.glide.until && Math.abs(this.glide.midi - n.midi) < 0.01
    const glideEnd = this.glide?.until ?? t
    this.glide = null
    const attack = glidingIn ? 'slur' : (n.attack ?? (this.sounding ? 'slur' : 'tongue'))

    this.vibrato.gain.setTargetAtTime(0, t, 0.02)
    if (!this.sounding) {
      amp.setTargetAtTime(level, t, attack === 'slur' ? 0.02 : 0.006)
      if (attack !== 'slur') this.burst(t, 0.06)
    } else if (attack === 'tongue') {
      amp.setTargetAtTime(level * 0.1, Math.max(0, t - 0.02), 0.004)
      amp.setTargetAtTime(level, t, 0.006)
      this.burst(t, 0.05)
    } else if (attack === 'ru') {
      amp.setTargetAtTime(level * 0.45, Math.max(0, t - 0.018), 0.005)
      amp.setTargetAtTime(level, t, 0.008)
      this.burst(t, 0.02)
    } else if (glidingIn) {
      // the level dips while the finger rolls off the hole and recovers as the pitch settles
      amp.setTargetAtTime(level, Math.max(t, glideEnd - 0.06), 0.05)
    } else {
      amp.setTargetAtTime(level, t, 0.01)
    }

    const slideTo = n.ornament?.type === 'slide' && !n.stop ? n.slideTo : undefined
    const segments = ornamentSegments(n.midi, duration, n.ornament, n.fingering, this.whistleId, slideTo)
    segments.forEach((seg, i) => {
      // don't cut short the glide arriving at this pitch
      if (glidingIn && !seg.glide && seg.midi === n.midi && t + seg.at < glideEnd) return
      const mode = seg.glide ? 'ramp' : segments[i + 1]?.glide ? 'jump' : 'smooth'
      this.setPitch(seg.midi, t + seg.at, mode)
    })
    if (n.ornament?.type === 'slide') {
      const from = segments[1].at
      const to = segments[segments.length - 1].at
      amp.setTargetAtTime(level * 0.72, t + from, (to - from) * 0.3)
      if (slideTo != null && to > duration) this.glide = { until: t + to, midi: slideTo }
      else amp.setTargetAtTime(level, t + to, 0.04)
    }

    if (duration > 0.65) this.vibrato.gain.setTargetAtTime(VIBRATO_CENTS, t + 0.35, 0.18)
    if (n.ornament?.type === 'slide') this.vibrato.gain.setTargetAtTime(0, t + segments[1].at - 0.05, 0.03)

    if (n.stop) {
      amp.setTargetAtTime(0, t + duration * 0.82, 0.006)
      this.sounding = false
    } else this.sounding = true
  }

  /** Fade out and free the nodes. */
  stop(at = this.ctx.currentTime): void {
    if (this.stopped) return
    this.stopped = true
    this.amp.gain.cancelScheduledValues(at)
    this.amp.gain.setTargetAtTime(0, at, 0.02)
    this.chiff.gain.cancelScheduledValues(at)
    this.chiff.gain.setValueAtTime(0, at)
    for (const s of this.sources) s.stop(at + 0.25)
  }
}

export interface SynthSettings {
  a4: number
  whistleId: string
}

/** Convenience API for one-shot notes (fingering explorer, ear training, lesson demos). */
class WhistleSynth {
  settings: SynthSettings = { a4: 440, whistleId: 'D' }
  private current: WhistleVoice | null = null

  /** Play a single note now; cuts off any previous one-shot note. */
  playNote(midi: number, duration = 0.9, opts: Partial<VoiceNote> = {}): void {
    void audioEngine.resume()
    this.current?.stop()
    const voice = new WhistleVoice(audioEngine.output, this.settings.a4, this.settings.whistleId)
    const t = audioEngine.now + 0.03
    voice.schedule({ time: t, duration, midi, attack: 'tongue', ...opts })
    voice.stop(t + duration)
    this.current = voice
  }

  /** Play notes back to back (simple sequences / ear-training phrases). Returns total seconds. */
  playSequence(notes: { midi: number | null; duration: number }[], gap = 0.04): number {
    void audioEngine.resume()
    this.current?.stop()
    const voice = new WhistleVoice(audioEngine.output, this.settings.a4, this.settings.whistleId)
    let t = audioEngine.now + 0.05
    const start = t
    for (const n of notes) {
      voice.schedule({ time: t, duration: n.duration - gap, midi: n.midi, attack: 'tongue', stop: true })
      t += n.duration
    }
    voice.stop(t)
    this.current = voice
    return t - start
  }

  /** Sustain a note until stopNote(), for the interactive whistle. */
  startNote(midi: number): void {
    void audioEngine.resume()
    if (!this.current || this.sustainMidi == null) {
      this.current?.stop()
      this.current = new WhistleVoice(audioEngine.output, this.settings.a4, this.settings.whistleId)
      this.current.schedule({ time: audioEngine.now + 0.01, duration: 60, midi, attack: 'tongue' })
    } else {
      this.current.schedule({ time: audioEngine.now + 0.005, duration: 60, midi, attack: 'slur' })
    }
    this.sustainMidi = midi
  }

  private sustainMidi: number | null = null

  stopNote(): void {
    this.current?.stop()
    this.current = null
    this.sustainMidi = null
  }
}

export const whistleSynth = new WhistleSynth()
