import { useEffect, useState } from 'react'
import { audioEngine } from '../../audio/AudioEngine'
import { TunePlayer } from '../../audio/TunePlayer'
import { useRaf } from '../../hooks/audio'
import { Emitter } from '../../lib/emitter'
import { leadingPart, tuneForPart } from '../../music/duet'
import type { TimedNote, Tune } from '../../music/types'
import { useSettings } from '../../state/settings'

/**
 * Quick listen from the tune list: one shared player, so starting a preview stops the previous
 * one. Plays the opening of the first section at full tempo, at most PREVIEW_SEC long.
 */
const PREVIEW_SEC = 20

const player = new TunePlayer()
const changed = new Emitter<string | null>()
let current: { id: string; duration: number } | null = null

player.stateChange.on((state) => {
  if (state === 'stopped' && current) {
    current = null
    changed.emit(null)
  }
})

/** Last timeline index of the preview: within the first section, starting before PREVIEW_SEC. */
export function previewEnd(timeline: TimedNote[]): number {
  let to = 0
  for (let i = 0; i < timeline.length; i++) {
    const n = timeline[i]
    if (n.sectionIndex !== timeline[0].sectionIndex || n.start - timeline[0].start >= PREVIEW_SEC) break
    to = i
  }
  return to
}

/** Start the preview of `tune` (its opening, or with `whole` all of it), or stop it if it is the one playing. */
export function togglePreview(tune: Tune, whole = false): void {
  if (current?.id === tune.id) {
    player.stop()
    return
  }
  player.stop()
  // a duet is heard from the part that opens it, with the other playing along
  player.load(tuneForPart(tune, leadingPart(tune)))
  player.options.a4 = useSettings.getState().a4
  const timeline = player.timeline
  if (!timeline.length) return
  const to = whole ? timeline.length - 1 : previewEnd(timeline)
  current = { id: tune.id, duration: timeline[to].start + timeline[to].duration - timeline[0].start }
  player.play(0, to, false)
  changed.emit(tune.id)
}

export function stopPreview(): void {
  player.stop()
}

/** The note sounding in the preview: its section (index in the tune) and place in that section. */
export interface PreviewNote {
  section: number
  note: number
}

/** Whether `id` is the tune being previewed, how far through (0…1), and which note sounds. */
export function usePreview(id: string): { playing: boolean; progress: number; at: PreviewNote | null } {
  const [playing, setPlaying] = useState(() => current?.id === id)
  const [progress, setProgress] = useState(0)
  const [at, setAt] = useState<PreviewNote | null>(null)
  useEffect(
    () =>
      changed.on((playingId) => {
        // a new run starts from the beginning, not where the last one stopped
        setProgress(0)
        setAt(null)
        setPlaying(playingId === id)
      }),
    [id],
  )
  useRaf(() => {
    if (!current) return
    const { passTime, index, countdown } = player.positionAt(audioEngine.now)
    setProgress(Math.min(1, Math.max(0, passTime / current.duration)))
    const n = player.timeline[index]
    // same note as the last frame: keep the object, so the tab doesn't re-render 60 times a second
    const next = n && countdown <= 0 ? { section: n.sectionIndex, note: n.noteInSection } : null
    setAt((was) => (was?.section === next?.section && was?.note === next?.note ? was : next))
  }, playing)
  return { playing, progress: playing ? progress : 0, at: playing ? at : null }
}
