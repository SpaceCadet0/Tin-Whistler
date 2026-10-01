/// <reference lib="webworker" />
import { recognizeNotation } from './notationImage'
import type { RGBAImage } from './tabImage'

/** Runs sheet-music recognition off the main thread. */
self.onmessage = (e: MessageEvent<{ id: number; image: RGBAImage }>) => {
  const { id, image } = e.data
  try {
    self.postMessage({ id, result: recognizeNotation(image) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
