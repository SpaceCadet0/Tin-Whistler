import { create } from 'zustand'

/** Per-session UI state: once the mic is switched on, following exercises keep it on. */
interface SessionState {
  micWanted: boolean
  setMicWanted: (v: boolean) => void
}

export const useSession = create<SessionState>()((set) => ({
  micWanted: false,
  setMicWanted: (micWanted) => set({ micWanted }),
}))
