import { ornamentSegments } from '../music/ornaments'
import { midiToFrequency } from '../music/pitch'
import type { Attack, Fingering, Ornament } from '../music/types'
import { getWhistle } from '../music/whistles'
import { audioEngine } from './AudioEngine'
import { HARMONIC_COUNT, whistleTimbre } from './whistleTimbre'

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

const BASE_LEVEL = 0.3
/** Measured on recordings: about 10 cents at 4.8 Hz (the ramp-in makes the average lower). */
const VIBRATO_CENTS = 15
const VIBRATO_HZ = 4.8
/** Slow wandering of pitch (cents) and loudness (fraction) that keeps a held note alive. */
const DRIFT_CENTS = 4.5
const FLUTTER = 0.17
/**
 * Breath noise: a band around the note plus a soft broad hiss. The recordings' measured noise also
 * holds room reverb and MP3 artefacts, so the hiss sits well below it: at the measured level it
 * sounded like white noise in headphones.
 */
const BREATH_BAND = 0.06
const BREATH_BROAD = 0.004
const BREATH_TOP_HZ = 4500
const REVERB_WET = 0.16
/** Tongued "to" / "ru" puffs: centre of the noise band and their levels. */
const CHIFF_HZ = 1100
const CHIFF_TONGUE = 0.03
const CHIFF_RU = 0.014

/**
 * Buffers every voice needs, built once per context. Generating them takes tens of milliseconds
 * on a cold phone; done inside play() it pushed the first notes into the past, and their attacks
 * snapped on with a click.
 */
interface VoiceBuffers {
  noise: AudioBuffer
  drift: AudioBuffer
  wobble: AudioBuffer
}
const buffers = new WeakMap<BaseAudioContext, VoiceBuffers>()
function voiceBuffers(ctx: BaseAudioContext): VoiceBuffers {
  let b = buffers.get(ctx)
  if (!b) {
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    b = { noise, drift: wanderBuffer(ctx, 7, 2.5), wobble: wanderBuffer(ctx, 5, 6) }
    buffers.set(ctx, b)
  }
  return b
}

/** A smooth random curve (RMS 1) changing a few times a second, looped as a modulation source. */
function wanderBuffer(ctx: BaseAudioContext, seconds: number, pointsPerSecond: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate)
  const d = buf.getChannelData(0)
  const n = Math.round(seconds * pointsPerSecond)
  const pts = Array.from({ length: n }, () => Math.random() * 2 - 1)
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    const x = (i / d.length) * n
    const k = Math.floor(x)
    const f = (1 - Math.cos((x - k) * Math.PI)) / 2
    d[i] = pts[k] * (1 - f) + pts[(k + 1) % n] * f
    sum += d[i] * d[i]
  }
  const rms = Math.sqrt(sum / d.length) || 1
  for (let i = 0; i < d.length; i++) d[i] /= rms
  return buf
}

/** One small room per output, shared by all voices playing into it. */
const reverbs = new WeakMap<AudioNode, AudioNode>()
function reverbSend(destination: AudioNode): AudioNode {
  let send = reverbs.get(destination)
  if (!send) {
    const ctx = destination.context
    // mono and under a second: a long stereo impulse cost the audio thread more than it gave
    const len = Math.round(ctx.sampleRate * 0.9)
    const ir = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = ir.getChannelData(0)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate
      // darker as it decays, like the air absorbing the highs
      const a = Math.min(0.9, 0.25 + t * 1.2)
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a)
      d[i] = lp * Math.exp(-t / 0.28) * (t < 0.012 ? t / 0.012 : 1)
    }
    const conv = ctx.createConvolver()
    conv.buffer = ir
    const wet = ctx.createGain()
    wet.gain.value = REVERB_WET
    conv.connect(wet).connect(destination)
    send = conv
    reverbs.set(destination, send)
  }
  return send
}

/** Build the shared buffers and room ahead of the first note (e.g. when a player page opens). */
export function prepareWhistleVoice(destination: AudioNode = audioEngine.output): void {
  voiceBuffers(destination.context)
  reverbSend(destination)
}

/**
 * A monophonic whistle voice: six harmonics whose balance follows the register (measured from
 * recordings), breath noise in a band around the note plus a broad hiss, a "chiff" transient on
 * tongued attacks, slow pitch/loudness wander, delayed vibrato and a touch of room. Notes must be
 * scheduled in chronological order (the TunePlayer's look-ahead scheduler guarantees that).
 */
export class WhistleVoice {
  /** The destination's context: the live one, or an OfflineAudioContext when rendering to a buffer. */
  private ctx: BaseAudioContext
  private oscs: OscillatorNode[] = []
  private harmGains: GainNode[] = []
  private amp: GainNode
  private breathFilter: BiquadFilterNode
  private broadFilter: BiquadFilterNode
  private breathLevel: GainNode
  private chiff: GainNode
  private vibrato: GainNode
  private sources: AudioScheduledSourceNode[] = []
  private sounding = false
  private stopped = false
  /** A slide's glide still running into the next note (absolute end time + target pitch). */
  private glide: { until: number; midi: number } | null = null

  private a4: number
  private whistleId: string
  private baseMidi: number

  constructor(destination: AudioNode = audioEngine.output, a4 = 440, whistleId = 'D') {
    this.a4 = a4
    this.whistleId = whistleId
    this.baseMidi = getWhistle(whistleId).baseMidi
    const ctx = (this.ctx = destination.context)
    const t = ctx.currentTime
    this.amp = ctx.createGain()
    this.amp.gain.setValueAtTime(0, t)
    // loudness wander rides on a unity gain after the envelope
    const flutter = ctx.createGain()
    flutter.gain.value = 1
    this.amp.connect(flutter)
    flutter.connect(destination)
    flutter.connect(reverbSend(destination))

    const lfo = ctx.createOscillator()
    lfo.frequency.value = VIBRATO_HZ
    this.vibrato = ctx.createGain()
    this.vibrato.gain.setValueAtTime(0, t)
    lfo.connect(this.vibrato)

    const drift = ctx.createBufferSource()
    const { noise: noiseBuf, drift: driftBuf, wobble: wobbleBuf } = voiceBuffers(ctx)
    drift.buffer = driftBuf
    drift.loop = true
    const driftGain = ctx.createGain()
    driftGain.gain.value = DRIFT_CENTS
    drift.connect(driftGain)
    const wobble = ctx.createBufferSource()
    wobble.buffer = wobbleBuf
    wobble.loop = true
    const wobbleGain = ctx.createGain()
    wobbleGain.gain.value = FLUTTER
    wobble.connect(wobbleGain).connect(flutter.gain)

    const initial = whistleTimbre(0)
    for (let k = 1; k <= HARMONIC_COUNT; k++) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587 * k, t)
      const g = ctx.createGain()
      g.gain.value = initial.harmonics[k - 1]
      osc.connect(g).connect(this.amp)
      this.vibrato.connect(osc.detune)
      driftGain.connect(osc.detune)
      this.oscs.push(osc)
      this.harmGains.push(g)
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    this.breathLevel = ctx.createGain()
    this.breathLevel.gain.value = initial.breath
    this.breathLevel.connect(this.amp)
    this.breathFilter = ctx.createBiquadFilter()
    this.breathFilter.type = 'bandpass'
    this.breathFilter.Q.value = 6
    this.breathFilter.frequency.setValueAtTime(587, t)
    const bandGain = ctx.createGain()
    bandGain.gain.value = BREATH_BAND
    noise.connect(this.breathFilter).connect(bandGain).connect(this.breathLevel)
    // the broad hiss starts a little below the note and fades above ~4.5 kHz
    this.broadFilter = ctx.createBiquadFilter()
    this.broadFilter.type = 'highpass'
    this.broadFilter.frequency.setValueAtTime(420, t)
    const broadTop = ctx.createBiquadFilter()
    broadTop.type = 'lowpass'
    broadTop.frequency.value = BREATH_TOP_HZ
    const broadGain = ctx.createGain()
    broadGain.gain.value = BREATH_BROAD
    noise.connect(this.broadFilter).connect(broadTop).connect(broadGain).connect(this.breathLevel)

    // the tongue's puff of air: a low, wide band of noise (a high band sounded like a hi-hat)
    const chiffBand = ctx.createBiquadFilter()
    chiffBand.type = 'bandpass'
    chiffBand.frequency.value = CHIFF_HZ
    chiffBand.Q.value = 0.9
    const chiffTop = ctx.createBiquadFilter()
    chiffTop.type = 'lowpass'
    chiffTop.frequency.value = 3000
    this.chiff = ctx.createGain()
    this.chiff.gain.setValueAtTime(0, t)
    noise.connect(chiffBand).connect(chiffTop).connect(this.chiff).connect(destination)

    this.sources = [lfo, noise, drift, wobble, ...this.oscs]
    for (const s of this.sources) s.start(t)
  }

  /** mode: smooth = fast exponential approach, jump = instant, ramp = linear glide ending at `at`. */
  private setPitch(midi: number, at: number, mode: 'smooth' | 'jump' | 'ramp' = 'smooth'): void {
    const f = midiToFrequency(midi, this.a4)
    const targets: [AudioParam, number][] = [
      ...this.oscs.map((o, i): [AudioParam, number] => [o.frequency, f * (i + 1)]),
      [this.breathFilter.frequency, f],
      [this.broadFilter.frequency, f * 0.85],
    ]
    for (const [p, target] of targets) {
      if (mode === 'jump') p.setValueAtTime(target, at)
      else if (mode === 'ramp') p.linearRampToValueAtTime(target, at)
      else p.setTargetAtTime(target, at, 0.003)
    }
  }

  /** The harmonic balance and breathiness of the note's register. */
  private setTimbre(midi: number, at: number): void {
    const timbre = whistleTimbre(midi - this.baseMidi)
    this.harmGains.forEach((g, i) => g.gain.setTargetAtTime(timbre.harmonics[i], at, 0.01))
    this.breathLevel.gain.setTargetAtTime(timbre.breath, at, 0.01)
  }

  private burst(at: number, amount: number): void {
    // a soft swell and a ~50 ms breathy tail instead of a click
    this.chiff.gain.setTargetAtTime(amount, at, 0.006)
    this.chiff.gain.setTargetAtTime(0, at + 0.02, 0.025)
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
    this.setTimbre(n.midi, t)
    // recordings: tongued notes are separated by a near-silent gap (~12% level) and swell in
    // over ~30 ms; a slur keeps the air going
    if (!this.sounding) {
      amp.setTargetAtTime(level, t, attack === 'slur' ? 0.025 : 0.013)
      if (attack !== 'slur') this.burst(t, CHIFF_TONGUE)
    } else if (attack === 'tongue') {
      amp.setTargetAtTime(level * 0.06, Math.max(0, t - 0.045), 0.007)
      amp.setTargetAtTime(level, t, 0.012)
      this.burst(t, CHIFF_TONGUE)
    } else if (attack === 'ru') {
      amp.setTargetAtTime(level * 0.35, Math.max(0, t - 0.03), 0.007)
      amp.setTargetAtTime(level, t, 0.012)
      this.burst(t, CHIFF_RU)
    } else if (glidingIn) {
      // the level dips while the finger rolls off the hole and recovers as the pitch settles
      amp.setTargetAtTime(level, Math.max(t, glideEnd - 0.06), 0.05)
    } else {
      // a fingered change briefly disturbs the air even when slurred
      amp.setTargetAtTime(level * 0.8, Math.max(0, t - 0.012), 0.005)
      amp.setTargetAtTime(level, t, 0.012)
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

    // no vibrato over a trill: the finger is busy flicking
    if (duration > 0.65 && n.ornament?.type !== 'trill') this.vibrato.gain.setTargetAtTime(VIBRATO_CENTS, t + 0.35, 0.18)
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
