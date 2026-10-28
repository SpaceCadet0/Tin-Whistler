import type { TuneSection } from '../music/types'
import { recognizeImageFile } from './recognizeFile'
import { sectionFromRecognition, type RGBAImage } from './tabImage'
import { cropImage, tabPages, type Rect } from './videoFrames'
import { closeVideo, decodeAudio, frameAt, openVideo, thumbnails } from './videoMedia'
import type { VideoPageRead, VideoWorkRequest } from './videoTune.worker'
import { levelsOf, pageFrameTimes, type VideoTune } from './videoTune'

/**
 * Import a tune from a tab tutorial video (mp4), on the device: the pages found where the tab
 * changes, each cut out clean at full resolution; the user checks them, then the notes are timed
 * against the soundtrack. The heavy work runs in a worker.
 */

export const AUDIO_RATE = 22050
/** Longer videos take too long and too much memory on a phone. */
export const MAX_VIDEO_SECONDS = 600
/** Thumbnails for spotting page turns. */
const THUMB_FPS = 1
const THUMB_W = 192
const THUMB_H = 108

export interface ImportedPage {
  /** When the page was on screen (seconds); screenshots added by hand share a neighbour's time. */
  start: number
  end: number
  /** The clean page as a picture (data URL), for checking. */
  preview: string
  /** Its notes read as a D whistle, one beat each. */
  section: TuneSection
  warnings: string[]
  /** Two dot colours: a duet page, read as one part for now. */
  twoColours: boolean
}

export type VideoStage = 'audio' | 'pages' | 'frames'

/** One worker for a whole import step; each request gets its answer by id. */
class VideoWorker {
  private worker = new Worker(new URL('./videoTune.worker.ts', import.meta.url), { type: 'module' })
  private next = 0
  private waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  constructor() {
    this.worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
      const w = this.waiting.get(e.data.id)
      this.waiting.delete(e.data.id)
      if (e.data.error != null) w?.reject(new Error(e.data.error))
      else w?.resolve(e.data.result)
    }
    this.worker.onerror = (e) => this.waiting.forEach((w) => w.reject(new Error(e.message)))
  }
  run<T>(request: VideoWorkRequest, transfer: Transferable[] = []): Promise<T> {
    const id = this.next++
    return new Promise<T>((resolve, reject) => {
      this.waiting.set(id, { resolve: resolve as (v: unknown) => void, reject })
      this.worker.postMessage({ id, request }, transfer)
    })
  }
  close() {
    this.worker.terminate()
  }
}

/** Two readings are one page when this share of their notes (or more) match, in the same number. */
const SAME_PAGE = 0.9

function samePage(a: TuneSection, b: TuneSection): boolean {
  const x = a.phrases.flat()
  const y = b.phrases.flat()
  return x.length === y.length && x.filter((n, i) => n.pitch === y[i].pitch).length >= x.length * SAME_PAGE
}

function previewOf(img: RGBAImage): string {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  return canvas.toDataURL('image/png')
}

/** The video's pages, cut out clean, and its soundtrack. */
export async function readVideo(file: File, onProgress: (stage: VideoStage, share: number) => void): Promise<{ pages: ImportedPage[]; samples: Float32Array }> {
  const video = await openVideo(file)
  const worker = new VideoWorker()
  try {
    if (video.duration > MAX_VIDEO_SECONDS) throw new Error('video-too-long')
    onProgress('audio', 0)
    const samples = await decodeAudio(file, AUDIO_RATE)
    const levels = levelsOf(samples, AUDIO_RATE)
    const spans = tabPages(await thumbnails(video, THUMB_FPS, THUMB_W, THUMB_H, (s) => onProgress('pages', s)), THUMB_FPS, video.duration)
    const pages: ImportedPage[] = []
    for (const [i, [start, end]] of spans.entries()) {
      onProgress('frames', i / spans.length)
      const times = pageFrameTimes(levels, start, end)
      // where the tab is, from a frame in the page's middle; then every frame cut to it at full resolution
      const probe = await frameAt(video, times[times.length >> 1])
      const region = await worker.run<Rect | null>({ kind: 'region', frame: probe }, [probe.data.buffer])
      if (!region) continue
      const frames: RGBAImage[] = []
      for (const t of times) frames.push(cropImage(await frameAt(video, t), region))
      const page = await worker.run<VideoPageRead | null>({ kind: 'page', frames }, frames.map((f) => f.data.buffer))
      if (!page) continue
      // a page turn seen where there was none (a flicker) gives the same page twice: one page, longer
      const last = pages[pages.length - 1]
      if (last && samePage(last.section, page.section)) last.end = end
      else pages.push({ start, end, preview: previewOf(page.panel), section: page.section, warnings: page.warnings, twoColours: page.twoColours })
    }
    onProgress('frames', 1)
    return { pages, samples }
  } finally {
    worker.close()
    closeVideo(video)
  }
}

/** A page from the user's own screenshot (to replace a page or add a missed one). */
export async function pageFromScreenshot(file: File, start: number, end: number): Promise<ImportedPage | null> {
  const { result, preview } = await recognizeImageFile(file, 'D')
  if (!result.systems.length) return null
  return { start, end, preview, section: sectionFromRecognition(result, 's', 'S', 'D'), warnings: result.warnings, twoColours: false }
}

/** The checked pages timed against the soundtrack, in the key heard (or `whistle`). */
export async function buildFromVideo(pages: ImportedPage[], samples: Float32Array, whistle?: string): Promise<VideoTune> {
  const worker = new VideoWorker()
  try {
    const input = pages.map((p, i) => ({ section: { ...p.section, id: `s${i + 1}` }, start: p.start, end: p.end }))
    // a copy goes to the worker: the samples stay here for building again in another key
    const copy = samples.slice()
    return await worker.run<VideoTune>({ kind: 'build', pages: input, samples: copy, sampleRate: AUDIO_RATE, whistle }, [copy.buffer])
  } finally {
    worker.close()
  }
}
