/// <reference lib="webworker" />
import { recognizeTab, type RGBAImage } from './tabImage'

/** Runs tab recognition off the main thread. */
self.onmessage = (e: MessageEvent<{ id: number; image: RGBAImage; whistleId: string }>) => {
  const { id, image, whistleId } = e.data
  try {
    self.postMessage({ id, result: recognizeTab(image, whistleId) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
