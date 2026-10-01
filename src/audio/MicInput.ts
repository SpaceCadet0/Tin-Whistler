import { Emitter } from '../lib/emitter'
import { audioEngine } from './AudioEngine'
import { CAPTURE_WORKLET_SOURCE } from './pitch/captureWorklet'
import type { PitchEstimate, YinOptions } from './pitch/yin'

export type MicStatus = 'off' | 'requesting' | 'on' | 'denied' | 'unsupported' | 'error'

export interface RawPitch extends PitchEstimate {
  /** AudioContext time at the end of the analysed frame. */
  time: number
}

export const FRAME_SIZE = 2048
export const HOP = 512

/** Whistle range with headroom; the tuner uses a wider window. */
export const WHISTLE_DETECTION: YinOptions = { minFreq: 380, maxFreq: 2700, threshold: 0.15 }
export const CHROMATIC_DETECTION: YinOptions = { minFreq: 70, maxFreq: 2700, threshold: 0.15 }

/**
 * Microphone capture → band-limiting filters → AudioWorklet frame slicer → pitch Web Worker.
 * Emits raw per-frame pitch estimates; PitchTracker turns them into musical information.
 */
class MicInput {
  readonly status = new Emitter<MicStatus>()
  readonly frames = new Emitter<RawPitch>()
  private _status: MicStatus = 'off'
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private highpass: BiquadFilterNode | null = null
  private node: AudioWorkletNode | null = null
  private worker: Worker | null = null
  private workletLoaded = false
  private detection: YinOptions = WHISTLE_DETECTION
  private users = 0

  get current(): MicStatus {
    return this._status
  }

  get mediaStream(): MediaStream | null {
    return this.stream
  }

  private setStatus(s: MicStatus): void {
    this._status = s
    this.status.emit(s)
  }

  /** Ask for permission without keeping the mic open (used by onboarding). */
  async requestPermission(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setStatus('unsupported')
      return false
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.getTracks().forEach((t) => t.stop())
      if (this._status !== 'on') this.setStatus('off')
      return true
    } catch {
      this.setStatus('denied')
      return false
    }
  }

  /** Reference-counted start: every acquire() needs a matching release(). */
  async acquire(): Promise<boolean> {
    this.users++
    if (this._status === 'on') return true
    return this.start()
  }

  release(): void {
    this.users = Math.max(0, this.users - 1)
    if (this.users === 0) this.stop()
  }

  setDetection(opts: YinOptions): void {
    this.detection = opts
    this.worker?.postMessage({ type: 'config', sampleRate: audioEngine.context.sampleRate, options: opts })
    if (this.highpass) this.highpass.frequency.value = Math.max(50, opts.minFreq * 0.7)
  }

  private async start(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
      this.setStatus('unsupported')
      return false
    }
    this.setStatus('requesting')
    try {
      await audioEngine.resume()
      const ctx = audioEngine.context
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      if (!this.workletLoaded) {
        const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET_SOURCE], { type: 'application/javascript' }))
        await ctx.audioWorklet.addModule(url)
        URL.revokeObjectURL(url)
        this.workletLoaded = true
      }
      this.worker = new Worker(new URL('./pitch/pitch.worker.ts', import.meta.url), { type: 'module' })
      // Report the time at the centre of the analysis window, not its end.
      const halfWindow = FRAME_SIZE / 2 / ctx.sampleRate
      this.worker.onmessage = (e: MessageEvent<RawPitch>) => this.frames.emit({ ...e.data, time: e.data.time - halfWindow })

      this.source = ctx.createMediaStreamSource(this.stream)
      this.highpass = ctx.createBiquadFilter()
      this.highpass.type = 'highpass'
      this.highpass.Q.value = 0.7
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 5000
      this.node = new AudioWorkletNode(ctx, 'tw-capture', {
        processorOptions: { frameSize: FRAME_SIZE, hop: HOP },
        numberOfOutputs: 1,
      })
      const channel = new MessageChannel()
      this.node.port.postMessage({ port: channel.port1 }, [channel.port1])
      this.worker.postMessage({ type: 'port', port: channel.port2 }, [channel.port2])
      this.setDetection(this.detection)

      const mute = ctx.createGain()
      mute.gain.value = 0
      this.source.connect(this.highpass).connect(lowpass).connect(this.node).connect(mute).connect(ctx.destination)
      this.setStatus('on')
      return true
    } catch (err) {
      this.cleanup()
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      this.setStatus(denied ? 'denied' : 'error')
      return false
    }
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.source?.disconnect()
    this.node?.disconnect()
    this.worker?.terminate()
    this.stream = null
    this.source = null
    this.node = null
    this.worker = null
    this.highpass = null
  }

  stop(): void {
    this.users = 0
    this.cleanup()
    if (this._status === 'on' || this._status === 'requesting') this.setStatus('off')
  }
}

export const micInput = new MicInput()
