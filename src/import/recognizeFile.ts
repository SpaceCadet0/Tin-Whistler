import type { NotationImageResult } from './notationImage'
import type { RecognitionResult } from './tabImage'

const MAX_WIDTH = 1800

/** Decode an image file to RGBA pixels (resized into [minWidth, maxWidth]) plus a small preview. */
async function decodeImage(file: File, minWidth: number, maxWidth: number) {
  const bitmap = await createImageBitmap(file)
  const scale = bitmap.width < minWidth ? minWidth / bitmap.width : Math.min(1, maxWidth / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  // transparent PNGs: recognise on white paper
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return { data: ctx.getImageData(0, 0, w, h), preview: canvas.toDataURL('image/jpeg', 0.7) }
}

/** Run `worker` on the pixels once and return its result. */
async function runWorker<T>(worker: Worker, message: Record<string, unknown>, transfer: Transferable[]): Promise<T> {
  try {
    return await new Promise<T>((resolve, reject) => {
      worker.onmessage = (e) => (e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.result))
      worker.onerror = (e) => reject(new Error(e.message))
      worker.postMessage(message, transfer)
    })
  } finally {
    worker.terminate()
  }
}

/** Decode an image file and run tab recognition in a worker. */
export async function recognizeImageFile(file: File, whistleId = 'D'): Promise<{ result: RecognitionResult; preview: string }> {
  const { data, preview } = await decodeImage(file, 0, MAX_WIDTH)
  const worker = new Worker(new URL('./tabImage.worker.ts', import.meta.url), { type: 'module' })
  const result = await runWorker<RecognitionResult>(worker, { id: 1, image: { width: data.width, height: data.height, data: data.data }, whistleId }, [data.data.buffer])
  return { result, preview }
}

/**
 * Decode a JPG/PNG of sheet music and read its notes in a worker. Small images are enlarged first:
 * recognition needs a few pixels between staff lines.
 */
export async function recognizeNotationFile(file: File): Promise<{ result: NotationImageResult; preview: string }> {
  const { data, preview } = await decodeImage(file, 1600, 2400)
  const worker = new Worker(new URL('./notationImage.worker.ts', import.meta.url), { type: 'module' })
  const result = await runWorker<NotationImageResult>(worker, { id: 1, image: { width: data.width, height: data.height, data: data.data } }, [data.data.buffer])
  return { result, preview }
}
