import { Emitter } from './emitter'

export interface Toast {
  id: number
  kind: 'xp' | 'achievement' | 'info' | 'error'
  title: string
  body?: string
  icon?: string
}

let nextId = 1
export const toasts = new Emitter<Toast>()

export function toast(t: Omit<Toast, 'id'>): void {
  toasts.emit({ ...t, id: nextId++ })
}
