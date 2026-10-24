/**
 * Owns the single AudioContext and master bus. Everything audio goes through here so that
 * UI code never creates contexts or nodes directly.
 */
class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private volume = 0.8

  get context(): AudioContext {
    if (!this.ctx) {
      // 'interactive' gave phones the smallest buffer, and early underruns crackled at note starts
      // until the browser grew it; scoring already compensates for the output latency
      this.ctx = new AudioContext({ latencyHint: 'balanced' })
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 3
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(comp).connect(this.ctx.destination)
    }
    return this.ctx
  }

  get output(): GainNode {
    void this.context
    return this.master!
  }

  get now(): number {
    return this.context.currentTime
  }

  /** Must be called from a user gesture before the first sound on iOS/Safari. */
  async resume(): Promise<void> {
    const ctx = this.context
    if (ctx.state !== 'running') await ctx.resume()
  }

  setVolume(v: number): void {
    this.volume = v
    if (this.master) this.master.gain.setTargetAtTime(v, this.context.currentTime, 0.02)
  }

  /** Output latency estimate, used to align what the user hears with what we analyse. */
  get outputLatency(): number {
    const ctx = this.context
    return (ctx.outputLatency || 0) + (ctx.baseLatency || 0)
  }
}

export const audioEngine = new AudioEngine()
