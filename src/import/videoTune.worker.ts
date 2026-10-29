/// <reference lib="webworker" />
import type { TuneSection } from '../music/types'
import { partCount } from './duetPage'
import { lightPaper } from './palette'
import { sectionFromRecognition, type RGBAImage } from './tabImage'
import { tabRegion, type Rect } from './videoFrames'
import { buildVideoTune, pagePanel, type BuildOptions, type VideoPage } from './videoTune'

/** Video import, off the main thread: where a page's tab is, the clean page, the tune in time. */

export type VideoWorkRequest =
  | { kind: 'region'; frame: RGBAImage }
  | { kind: 'page'; frames: RGBAImage[] }
  | { kind: 'build'; pages: VideoPage[]; samples: Float32Array; sampleRate: number; options: BuildOptions }

export interface VideoPageRead {
  panel: RGBAImage
  section: TuneSection
  warnings: string[]
  twoColours: boolean
}

/** Room round the tab found on one frame: the median of all frames finds its exact edges again. */
const REGION_MARGIN = 0.1

function regionOf(frame: RGBAImage): Rect | null {
  const r = tabRegion(lightPaper(frame))
  if (!r) return null
  const mx = Math.round(r.width * REGION_MARGIN)
  const my = Math.round(r.height * REGION_MARGIN)
  const x = Math.max(0, r.x - mx)
  const y = Math.max(0, r.y - my)
  return { x, y, width: Math.min(frame.width, r.x + r.width + mx) - x, height: Math.min(frame.height, r.y + r.height + my) - y }
}

self.onmessage = (e: MessageEvent<{ id: number; request: VideoWorkRequest }>) => {
  const { id, request } = e.data
  try {
    let result: unknown
    if (request.kind === 'region') result = regionOf(request.frame)
    else if (request.kind === 'page') {
      const page = pagePanel(request.frames)
      result = page && ({ panel: page.panel, section: sectionFromRecognition(page.result, 's', 'S', 'D'), warnings: page.result.warnings, twoColours: partCount(page.panel) > 1 } satisfies VideoPageRead)
    } else result = buildVideoTune(request.pages, request.samples, request.sampleRate, request.options)
    self.postMessage({ id, result })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
