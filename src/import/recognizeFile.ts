import type { RecognitionResult } from './tabImage'

const MAX_WIDTH = 1800

/** Decode an image file and run tab recognition in a worker. */
export async function recognizeImageFile(file: File, whistleId = 'D'): Promise<{ result: RecognitionResult; preview: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const preview = canvas.toDataURL('image/jpeg', 0.7)
  const worker = new Worker(new URL('./tabImage.worker.ts', import.meta.url), { type: 'module' })
  try {
    const result = await new Promise<RecognitionResult>((resolve, reject) => {
      worker.onmessage = (e) => (e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.result))
      worker.onerror = (e) => reject(new Error(e.message))
      worker.postMessage({ id: 1, image: { width: w, height: h, data: data.data }, whistleId }, [data.data.buffer])
    })
    return { result, preview }
  } finally {
    worker.terminate()
  }
}
