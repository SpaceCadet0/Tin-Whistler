import { useEffect, useRef, useState } from 'react'

/** px the pointer may travel before a press on the row becomes a drag (and its click is dropped) */
const DRAG_THRESHOLD = 5

/**
 * A horizontally scrolling row (tabs, chips) usable without a touch screen: the mouse wheel and a
 * drag scroll it sideways, the selected item is kept in view, and `edges` says which sides hide
 * more items so the row can fade there.
 */
export function useScrollRow<T extends HTMLElement>(selectedKey: unknown) {
  const ref = useRef<T>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 })
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    let drag: { x: number; left: number; moved: boolean } | null = null
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, left: el.scrollLeft, moved: false }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (Math.abs(dx) > DRAG_THRESHOLD) drag.moved = true
      if (drag.moved) el.scrollLeft = drag.left - dx
    }
    const onUp = () => {
      const moved = drag?.moved
      drag = null
      if (!moved) return
      // the press ended a drag, not a tap: swallow the click it fires on the tab under it
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation()
        ev.preventDefault()
      }
      el.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    const sel = el?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!el || !sel) return
    // scroll only the row, never the page
    const left = sel.offsetLeft - el.offsetLeft
    if (left < el.scrollLeft) el.scrollTo({ left, behavior: 'smooth' })
    else if (left + sel.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: left + sel.offsetWidth - el.clientWidth, behavior: 'smooth' })
  }, [selectedKey])

  return { ref, edges }
}

/** CSS mask fading a scroll row on the sides that hide more items */
export function scrollRowMask({ start, end }: { start: boolean; end: boolean }): string | undefined {
  if (!start && !end) return undefined
  return `linear-gradient(to right, ${start ? 'transparent, black 2rem' : 'black'}, ${end ? 'black calc(100% - 2rem), transparent' : 'black'})`
}
