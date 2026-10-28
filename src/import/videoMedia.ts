import type { RGBAImage } from './tabImage'

/**
 * Reading a video file in the browser with its own decoders (no ffmpeg): frames through a <video>
 * element drawn on a canvas, the soundtrack through WebAudio. Works offline; the browser must know
 * the codec (H.264 / AAC in mp4 everywhere).
 */

export async function openVideo(file: File): Promise<HTMLVideoElement> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = URL.createObjectURL(file)
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve()
    video.onerror = () => reject(new Error('unsupported-video'))
  })
  return video
}

export function closeVideo(video: HTMLVideoElement): void {
  URL.revokeObjectURL(video.src)
  video.removeAttribute('src')
  video.load()
}

async function seek(video: HTMLVideoElement, t: number): Promise<void> {
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve()
    video.currentTime = Math.max(0, Math.min(t, video.duration - 0.05))
  })
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas.getContext('2d', { willReadFrequently: true })!
}

/** The frame at `t` seconds at the video's full resolution. */
export async function frameAt(video: HTMLVideoElement, t: number): Promise<RGBAImage> {
  await seek(video, t)
  const { videoWidth: width, videoHeight: height } = video
  const ctx = canvasOf(width, height)
  ctx.drawImage(video, 0, 0, width, height)
  return { width, height, data: ctx.getImageData(0, 0, width, height).data }
}

/** Small greyscale frames, `fps` per second, for spotting when the tab page changes. */
export async function thumbnails(video: HTMLVideoElement, fps: number, width: number, height: number, onProgress?: (share: number) => void): Promise<Uint8Array[]> {
  const ctx = canvasOf(width, height)
  const count = Math.floor(video.duration * fps)
  const out: Uint8Array[] = []
  for (let k = 0; k < count; k++) {
    await seek(video, k / fps)
    ctx.drawImage(video, 0, 0, width, height)
    const rgba = ctx.getImageData(0, 0, width, height).data
    const grey = new Uint8Array(width * height)
    for (let p = 0; p < grey.length; p++) grey[p] = (rgba[p * 4] * 299 + rgba[p * 4 + 1] * 587 + rgba[p * 4 + 2] * 114) / 1000
    out.push(grey)
    onProgress?.((k + 1) / count)
  }
  return out
}

/** The soundtrack as mono samples at `sampleRate` (the browser decodes and resamples it). */
export async function decodeAudio(file: File, sampleRate: number): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, 1, sampleRate)
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  const mono = new Float32Array(buffer.length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c)
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / buffer.numberOfChannels
  }
  return mono
}
