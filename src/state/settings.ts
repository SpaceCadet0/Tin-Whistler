import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'

export type Language = 'en' | 'ru'
export type PlayerLevel = 'beginner' | 'some' | 'returning'
export type ThemePref = 'system' | 'light' | 'dark'
export type MotionPref = 'system' | 'reduce' | 'full'

export interface SettingsState {
  language: Language
  onboarded: boolean
  level: PlayerLevel
  dailyGoalMin: number
  whistleId: string
  a4: number
  /** Measured tuning offset of the user's whistle, cents. */
  offsetCents: number
  /** Mic sensitivity 0…1. */
  sensitivity: number
  /** Extra delay (ms) between what we play and what the mic hears, used when scoring. */
  latencyMs: number
  theme: ThemePref
  motion: MotionPref
  volume: number
  set: (patch: Partial<Omit<SettingsState, 'set' | 'reset'>>) => void
  reset: () => void
}

const browserLanguage = (): Language => (navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en')

const DEFAULTS = {
  language: browserLanguage(),
  onboarded: false,
  level: 'beginner' as PlayerLevel,
  dailyGoalMin: 10,
  whistleId: 'D',
  a4: 440,
  offsetCents: 0,
  sensitivity: 0.5,
  latencyMs: 60,
  theme: 'system' as ThemePref,
  motion: 'system' as MotionPref,
  volume: 0.8,
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'tw.settings', storage: appStorage, version: 1 },
  ),
)
