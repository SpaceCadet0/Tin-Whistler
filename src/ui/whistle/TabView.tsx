import { memo, useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { noteFingering } from '../../music/ornaments'
import type { Attack, Tune, TuneNote, TuneSection } from '../../music/types'
import { whistleLabel } from '../../music/whistles'
import { cn } from '../primitives'
import { FingeringColumn, type ColumnState } from './FingeringColumn'

const ATTACK_LABEL: Record<Attack, string> = { tongue: 't', ru: 'r', slur: '-' }
const ORN_LETTER = { cut: 'C', bounce: 'B', slide: 'S', roll: 'R', trill: 'tr' } as const

export function articulationLabel(n: TuneNote): string {
  return (n.attack ? ATTACK_LABEL[n.attack] : '') + (n.stop ? 'i' : '')
}

interface TabViewProps {
  tune: Tune
  section: TuneSection
  /** Index within the section (flattened) of the current note. */
  current?: number | null
  /** Selected note (editor / loop marker). */
  selected?: number | null
  /** Per-note verdicts after a run. */
  verdicts?: Record<number, 'right' | 'wrong'>
  loop?: { from: number; to: number } | null
  /** `extend` = shift-click: grow the selection to this note. */
  onSelect?: (index: number, extend: boolean) => void
  /** Selected columns (editor), highlighted together and dragged together. */
  range?: [number, number] | null
  /** Scroll the page to keep the current note in view when it moves (off while the player's stage is watched). */
  follow?: boolean
  /** Drag and drop of columns: `target` is the gap to drop into (0 … count), `dragged` the grabbed note. */
  onMove?: (target: number, dragged: number) => void
  showNames?: boolean
  showSecondVoice?: boolean
  dot?: number
}

/** Renders a section as whistle tab: phrases, lines, ornaments above, articulation and names below. */
export const TabView = memo(function TabView({
  tune,
  section,
  current,
  selected,
  verdicts,
  loop,
  onSelect,
  range,
  onMove,
  follow = true,
  showNames = true,
  showSecondVoice,
  dot = 15,
}: TabViewProps) {
  const { t } = useT()
  const currentRef = useRef<HTMLButtonElement | null>(null)
  const followRef = useRef(follow)
  useEffect(() => {
    followRef.current = follow
  }, [follow])
  // drag and drop: the grabbed column and the gap under the pointer
  const [dragged, setDragged] = useState<number | null>(null)
  const [dropGap, setDropGap] = useState<number | null>(null)
  const count = section.phrases.reduce((n, p) => n + p.length, 0)
  const endDrag = () => {
    setDragged(null)
    setDropGap(null)
  }

  // follow the playhead, but never jump the page on first render
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const el = currentRef.current
    if (!el || !followRef.current) return
    const r = el.getBoundingClientRect()
    if (r.top >= 0 && r.bottom <= window.innerHeight) return
    const reduce = document.documentElement.dataset.motion === 'reduce'
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    // only when the note moves: turning follow on must not yank the page back to the playhead
  }, [current])

  const lines: number[][] = [[]]
  const breaks = new Set(section.lineBreaks ?? [])
  section.phrases.forEach((_, pi) => {
    if (breaks.has(pi) && lines[lines.length - 1].length) lines.push([])
    lines[lines.length - 1].push(pi)
  })

  let flat = 0
  const phraseStart: number[] = []
  section.phrases.forEach((p, i) => {
    phraseStart[i] = flat
    flat += p.length
  })

  // slide ovals span several notes: carry the ring onto the following columns
  const carriedRing = new Map<number, number>()
  section.phrases.flat().forEach((n, i) => {
    const span = n.ornament?.span ?? 1
    if (n.ornament?.hole && span > 1) for (let k = 1; k < span; k++) carriedRing.set(i + k, n.ornament.hole - 1)
  })

  const renderNote = (n: TuneNote, idx: number) => {
    const fg = n.pitch != null ? noteFingering(n.pitch, n.fingering, tune.whistle) : undefined
    const inLoop = loop && idx >= loop.from && idx <= loop.to
    const isCurrent = current === idx
    const v = verdicts?.[idx]
    const state: ColumnState = v ? v : isCurrent ? 'current' : current != null && idx < current ? 'past' : 'idle'
    const name = n.pitch != null ? whistleLabel(n.pitch, tune.whistle) : t('tab.rest')
    const orn = n.ornament ? ORN_LETTER[n.ornament.type] : ''
    const ring = n.ornament?.hole ? n.ornament.hole - 1 : carriedRing.get(idx)
    const aria = [name, orn && t(`orn.${n.ornament!.type}`), n.attack && t(`art.${n.attack}`), n.stop && t('art.stop')].filter(Boolean).join(', ')
    const Tag = onSelect ? 'button' : 'span'
    return (
      <Tag
        key={idx}
        ref={isCurrent ? (currentRef as React.Ref<HTMLButtonElement>) : undefined}
        type={onSelect ? 'button' : undefined}
        onClick={onSelect ? (e: React.MouseEvent) => onSelect(idx, e.shiftKey) : undefined}
        draggable={onMove ? true : undefined}
        onDragStart={
          onMove
            ? (e: React.DragEvent) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', String(idx))
                setDragged(idx)
              }
            : undefined
        }
        onDragOver={
          onMove && dragged != null
            ? (e: React.DragEvent) => {
                e.preventDefault()
                const r = e.currentTarget.getBoundingClientRect()
                setDropGap(e.clientX < r.left + r.width / 2 ? idx : idx + 1)
              }
            : undefined
        }
        onDrop={
          onMove
            ? (e: React.DragEvent) => {
                e.preventDefault()
                if (dragged != null && dropGap != null) onMove(dropGap, dragged)
                endDrag()
              }
            : undefined
        }
        onDragEnd={onMove ? endDrag : undefined}
        aria-label={onSelect ? aria : undefined}
        aria-current={isCurrent ? 'step' : undefined}
        className={cn(
          'relative flex flex-col items-center rounded-xl px-[3px] pt-1 pb-1.5 transition-colors',
          isCurrent && 'bg-moss-soft',
          !isCurrent && inLoop && 'bg-brass-soft/60',
          selected === idx && 'ring-2 ring-brass',
          range && range[1] > range[0] && idx >= range[0] && idx <= range[1] && 'bg-brass-soft',
          dragged != null && range && idx >= range[0] && idx <= range[1] && 'opacity-50',
          // insertion marker while dragging: a bar on the left of the gap's note (right of the last)
          dropGap === idx && 'shadow-[inset_3px_0_0_var(--c-brass)]',
          dropGap === count && idx === count - 1 && 'shadow-[inset_-3px_0_0_var(--c-brass)]',
          onMove && 'cursor-grab active:cursor-grabbing',
          onSelect && 'hover:bg-surface-2 focus-visible:bg-surface-2',
        )}
      >
        <span className="h-4 text-[13px] leading-4 font-bold text-bad" aria-hidden="true">
          {orn}
        </span>
        {fg ? (
          <FingeringColumn fingering={fg.fingering} register={fg.register} ringHole={ring} dot={dot} state={state} label={onSelect ? undefined : aria} />
        ) : (
          <span className="grid w-5 place-items-center text-ink-faint" style={{ height: dot * 7.3 }} aria-label={t('tab.rest')}>
            𝄽
          </span>
        )}
        <span className="h-4 text-[13px] leading-4 font-semibold text-bad" aria-hidden="true">
          {articulationLabel(n)}
        </span>
        {showNames && (
          <span className={cn('mt-0.5 text-[11px] leading-3 font-semibold', isCurrent ? 'text-moss' : 'text-ink-soft')} aria-hidden="true">
            {name}
          </span>
        )}
      </Tag>
    )
  }

  const voice2 = showSecondVoice ? section.secondVoice : undefined

  return (
    <div className="flex flex-col gap-4">
      {lines.map((line, li) => (
        <div key={li} className="flex flex-wrap items-start gap-x-4 gap-y-3">
          {line.map((pi) => (
            <div key={pi} className="flex items-start" role="group" aria-label={t('tab.phrase', { n: pi + 1 })}>
              {section.phrases[pi].map((n, k) => renderNote(n, phraseStart[pi] + k))}
            </div>
          ))}
        </div>
      ))}
      {voice2 && (
        <div className="rounded-2xl border border-dashed border-line p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {t('tab.secondVoice', { n: voice2.startNote + 1 })}
          </p>
          <div className="flex items-start">
            {voice2.notes.map((n, i) => {
              const fg = n.pitch != null ? noteFingering(n.pitch, n.fingering, tune.whistle) : undefined
              return (
                <span key={i} className="flex flex-col items-center px-1">
                  {fg && <FingeringColumn fingering={fg.fingering} register={fg.register} dot={dot} />}
                  <span className="text-[11px] font-semibold text-ink-soft">{n.pitch != null ? whistleLabel(n.pitch, tune.whistle) : ''}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})
