import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/**
 * Key/value persistence used by the stores. Today it is localStorage; swapping this adapter
 * for a synced backend (accounts) doesn't touch any store or component.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      /* quota / private mode, progress stays in memory */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

export const appStorage = createJSONStorage(() => safeLocalStorage)

export const todayKey = (d = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const dayKeyOffset = (offset: number, from = new Date()): string => {
  const d = new Date(from)
  d.setDate(d.getDate() + offset)
  return todayKey(d)
}
