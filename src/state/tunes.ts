import { create } from 'zustand'
import { BUILTIN_TUNES } from '../data/tunes'
import { KeyValueStore } from '../lib/idb'
import { translate as tr, type MessageKey } from '../i18n'
import { toast } from '../lib/toast'
import type { Tune } from '../music/types'
import { normalizeTune } from '../music/validateTune'
import { useSettings } from './settings'

const translate = (key: MessageKey) => tr(useSettings.getState().language, key)

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
  /** Resolves false (after telling the user) when the browser refused to store the tune. */
  save: (tune: Tune) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
}

const storageError = (key: MessageKey, err: unknown) => {
  console.error(err)
  toast({ kind: 'error', title: translate(key) })
}

export const useTuneLibrary = create<TuneLibraryState>()((set, get) => ({
  userTunes: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const stored: unknown[] = await localTuneRepository.list()
      const tunes = stored.map(normalizeTune).filter((t): t is Tune => t != null)
      if (tunes.length < stored.length) console.warn(`Skipped ${stored.length - tunes.length} unreadable saved tune(s)`)
      set({ userTunes: tunes.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), loaded: true })
    } catch (err) {
      set({ loaded: true })
      storageError('tunes.loadFailed', err)
    }
  },
  save: async (tune) => {
    const t = { ...tune, updatedAt: Date.now(), createdAt: tune.createdAt ?? Date.now() }
    try {
      await localTuneRepository.save(t)
    } catch (err) {
      storageError('tunes.saveFailed', err)
      return false
    }
    set((s) => ({ userTunes: [t, ...s.userTunes.filter((u) => u.id !== t.id)] }))
    return true
  },
  remove: async (id) => {
    try {
      await localTuneRepository.remove(id)
    } catch (err) {
      storageError('tunes.deleteFailed', err)
      return false
    }
    set((s) => ({ userTunes: s.userTunes.filter((u) => u.id !== id) }))
    return true
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
