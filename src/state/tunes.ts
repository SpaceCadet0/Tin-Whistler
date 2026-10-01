import { create } from 'zustand'
import { BUILTIN_TUNES } from '../data/tunes'
import { KeyValueStore } from '../lib/idb'
import type { Tune } from '../music/types'

/** Repository boundary for user tunes, IndexedDB today, an API later. */
export interface TuneRepository {
  list(): Promise<Tune[]>
  save(tune: Tune): Promise<void>
  remove(id: string): Promise<void>
}

const idb = new KeyValueStore<Tune>('tin-whistler', 'tunes')

export const localTuneRepository: TuneRepository = {
  list: () => idb.values(),
  save: async (t) => {
    await idb.set(t.id, t)
  },
  remove: async (id) => {
    await idb.delete(id)
  },
}

interface TuneLibraryState {
  userTunes: Tune[]
  loaded: boolean
  load: () => Promise<void>
  save: (tune: Tune) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useTuneLibrary = create<TuneLibraryState>()((set, get) => ({
  userTunes: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const tunes = await localTuneRepository.list()
      set({ userTunes: tunes.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), loaded: true })
    } catch {
      set({ loaded: true })
    }
  },
  save: async (tune) => {
    const t = { ...tune, updatedAt: Date.now(), createdAt: tune.createdAt ?? Date.now() }
    await localTuneRepository.save(t)
    set((s) => ({ userTunes: [t, ...s.userTunes.filter((u) => u.id !== t.id)] }))
  },
  remove: async (id) => {
    await localTuneRepository.remove(id)
    set((s) => ({ userTunes: s.userTunes.filter((u) => u.id !== id) }))
  },
}))

export function useAllTunes(): Tune[] {
  const user = useTuneLibrary((s) => s.userTunes)
  return [...BUILTIN_TUNES, ...user]
}

export function useTune(id: string | undefined): Tune | undefined {
  const user = useTuneLibrary((s) => s.userTunes)
  if (!id) return undefined
  return BUILTIN_TUNES.find((t) => t.id === id) ?? user.find((t) => t.id === id)
}
