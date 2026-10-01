/**
 * AudioWorklet that slices the microphone stream into overlapping analysis frames and
 * posts them to the pitch worker through a MessagePort. Kept as a source string so it can
 * be loaded from a Blob URL without extra bundler configuration.
 */
export const CAPTURE_WORKLET_SOURCE = /* js */ `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const o = options.processorOptions || {}
    this.size = o.frameSize || 2048
    this.hop = o.hop || 512
    this.buf = new Float32Array(this.size)
    this.filled = 0
    this.sinceHop = 0
    this.target = null
    this.port.onmessage = (e) => { if (e.data && e.data.port) this.target = e.data.port }
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    const n = ch.length
    if (this.filled + n > this.size) {
      const shift = this.filled + n - this.size
      this.buf.copyWithin(0, shift, this.filled)
      this.filled -= shift
    }
    this.buf.set(ch, this.filled)
    this.filled += n
    this.sinceHop += n
    if (this.filled === this.size && this.sinceHop >= this.hop && this.target) {
      this.sinceHop = 0
      const copy = this.buf.slice()
      this.target.postMessage({ time: currentTime, samples: copy }, [copy.buffer])
    }
    return true
  }
}
registerProcessor('tw-capture', CaptureProcessor)
`
