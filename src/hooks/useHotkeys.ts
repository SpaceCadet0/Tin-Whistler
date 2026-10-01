import { useEffect, useRef } from 'react'

type Handler = (e: KeyboardEvent) => void

/**
 * Global keyboard shortcuts, e.g. `{ ' ': restart, ArrowLeft: prev }`. Ignored while typing
 * in inputs; Enter still activates focused buttons.
 */
export function useHotkeys(map: Record<string, Handler>, enabled = true): void {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const handler = ref.current[e.key] ?? ref.current[e.code]
      if (!handler) return
      if (e.key === 'Enter' && (tag === 'BUTTON' || tag === 'A' || el?.getAttribute('role') === 'button')) return
      e.preventDefault()
      // Space is the "again from the marker" key on play screens: keep a focused button from also clicking
      if (e.key === ' ' && tag === 'BUTTON') el?.blur()
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
