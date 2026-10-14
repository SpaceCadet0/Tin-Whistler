import type { TabClip } from '../../../music/editing'

/**
 * Copied tab columns (with their phrase breaks). Lives for the session, so notes copied in one
 * section or tune can be pasted into another.
 */
let copied: TabClip = { notes: [], breaks: [], lines: [] }

export const tabClipboard = {
  get: (): TabClip => structuredClone(copied),
  set: (clip: TabClip): void => {
    copied = structuredClone(clip)
  },
  get size(): number {
    return copied.notes.length
  },
}
