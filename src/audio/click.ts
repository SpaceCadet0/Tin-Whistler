import { audioEngine } from './AudioEngine'

/** A short wood-block-like click. Accented clicks are higher and louder. */
export function scheduleClick(time: number, accent = false, volume = 1): void {
  const ctx = audioEngine.context
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(accent ? 1760 : 1180, time)
  osc.frequency.exponentialRampToValueAtTime(accent ? 900 : 600, time + 0.04)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime((accent ? 0.5 : 0.3) * volume, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
  osc.connect(gain).connect(audioEngine.output)
  osc.start(time)
  osc.stop(time + 0.08)
}
