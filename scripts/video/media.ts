import { execFileSync } from 'node:child_process'
import type { RGBAImage } from '../../src/import/tabImage'

/** ffmpeg / yt-dlp wrappers: everything that touches files or the network lives here. */

const MAX_BUFFER = 1 << 30

export interface VideoInfo {
  title: string
  duration: number
  uploader?: string
  chapters: { start: number; end: number; title: string }[]
  url?: string
}

/** Metadata (title, chapters) of a YouTube video, without downloading it. */
export function fetchInfo(url: string): VideoInfo {
  const raw = JSON.parse(execFileSync('yt-dlp', ['-J', '--no-warnings', url], { maxBuffer: MAX_BUFFER }).toString())
  const chapters = (raw.chapters ?? []).map((c: { start_time: number; end_time: number; title: string }) => ({ start: c.start_time, end: c.end_time, title: c.title }))
  return { title: raw.title, duration: raw.duration, uploader: raw.uploader, chapters, url }
}

/** Download the video (≤1080p mp4, enough for reading tabs) to `out`. */
export function download(url: string, out: string): void {
  execFileSync('yt-dlp', ['-q', '--no-warnings', '-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b', '--merge-output-format', 'mp4', '-o', out, url], { stdio: 'inherit' })
}

export function probeSize(video: string): { width: number; height: number; duration: number } {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', video]).toString()
  const j = JSON.parse(out)
  return { width: j.streams[0].width, height: j.streams[0].height, duration: Number(j.format.duration) }
}

/** One video frame at `time` seconds as RGBA pixels. */
export function frameAt(video: string, time: number, size: { width: number; height: number }): RGBAImage {
  const data = execFileSync('ffmpeg', ['-v', 'error', '-ss', time.toFixed(3), '-i', video, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: MAX_BUFFER })
  return { width: size.width, height: size.height, data: new Uint8Array(data.buffer, data.byteOffset, size.width * size.height * 4) }
}

/** The soundtrack as mono float samples. */
export function audioSamples(video: string, sampleRate: number): Float32Array {
  const data = execFileSync('ffmpeg', ['-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-'], { maxBuffer: MAX_BUFFER })
  return new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
}

/** Small greyscale frames, `fps` per second, for spotting when the tab page changes. */
export function thumbnails(video: string, fps: number, width: number, height: number): Uint8Array[] {
  const data = execFileSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=${fps},scale=${width}:${height},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: MAX_BUFFER })
  const size = width * height
  const out: Uint8Array[] = []
  for (let k = 0; k + size <= data.length; k += size) out.push(new Uint8Array(data.buffer, data.byteOffset + k, size))
  return out
}
