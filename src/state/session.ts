import { create } from 'zustand'

/** Per-session UI state: once the mic is switched on, following exercises keep it on. */
interface SessionState {
  micWanted: boolean
  setMicWanted: (v: boolean) => void
  /** Counts "try again" presses: the mic is already wanted, so only this can restart it. */
  micAttempt: number
  retryMic: () => void
}

export const useSession = create<SessionState>()((set) => ({
  micWanted: false,
  setMicWanted: (micWanted) => set({ micWanted }),
  micAttempt: 0,
  retryMic: () => set((s) => ({ micWanted: true, micAttempt: s.micAttempt + 1 })),
}))
