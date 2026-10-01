/// <reference lib="webworker" />
import { yin, type YinOptions } from './yin'

/**
 * Pitch detection worker. Audio frames arrive straight from the capture worklet through a
 * MessagePort (so the main thread never touches raw samples); results are posted back to the page.
 */

interface ConfigMessage {
  type: 'config'
  sampleRate: number
  options: YinOptions
}
interface PortMessage {
  type: 'port'
  port: MessagePort
}
interface FrameMessage {
  /** AudioContext time at the end of the frame. */
  time: number
  samples: Float32Array
}

let sampleRate = 48000
let options: YinOptions = { minFreq: 400, maxFreq: 2600, threshold: 0.15 }

const onFrame = (e: MessageEvent<FrameMessage>) => {
  const { time, samples } = e.data
  const est = yin(samples, sampleRate, options)
  self.postMessage({ time, ...est })
}

self.onmessage = (e: MessageEvent<ConfigMessage | PortMessage>) => {
  const msg = e.data
  if (msg.type === 'config') {
    sampleRate = msg.sampleRate
    options = msg.options
  } else if (msg.type === 'port') {
    msg.port.onmessage = onFrame
  }
}
