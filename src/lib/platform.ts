import { Capacitor } from '@capacitor/core'

/** Running inside the Android app (Capacitor shell) rather than a browser. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform()

const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

/** Labels for modifier keys as printed on this platform's keyboard. */
export const MOD_KEY = isApple ? '⌘' : 'Ctrl'
export const ALT_KEY = isApple ? '⌥' : 'Alt'

/** A real keyboard and mouse are likely (not a touch-only phone). */
export const hasKeyboard = (): boolean => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
