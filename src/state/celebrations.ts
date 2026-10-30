import { create } from 'zustand'

/**
 * Achievements waiting for their moment: they are shown one by one, never while the learner is
 * playing (a lesson, a tune, a trainer or a game), but once they have left it.
 */
interface CelebrationsState {
  /** Achievement ids, oldest first. */
  queue: string[]
  /** A new achievement went to the collection and the Progress page has not been opened since. */
  unseen: boolean
  push: (ids: string[]) => void
  /** The first one has been shown. */
  shift: () => void
  seen: () => void
}

export const useCelebrations = create<CelebrationsState>()((set) => ({
  queue: [],
  unseen: false,
  push: (ids) => set((s) => ({ queue: [...s.queue, ...ids.filter((id) => !s.queue.includes(id))] })),
  shift: () => set((s) => ({ queue: s.queue.slice(1), unseen: true })),
  seen: () => set({ unseen: false }),
}))

/** Screens where the learner is playing: achievements wait until they leave. */
const QUIET = [/^\/welcome/, /^\/learn\/.+/, /^\/practice\/.+/, /^\/daily/, /^\/tunes\/[^/]+\/play/]

export const isQuietRoute = (pathname: string): boolean => QUIET.some((r) => r.test(pathname))
