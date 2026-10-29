import { memo, useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { partnerUnder } from '../../music/duet'
import { noteFingering } from '../../music/ornaments'
import type { Attack, Tune, TuneNote, TuneSection } from '../../music/types'
import { whistleLabel } from '../../music/whistles'
import { cn } from '../primitives'
import { FingeringColumn, type ColumnState } from './FingeringColumn'

const ATTACK_LABEL: Record<Attack, string> = { tongue: 't', ru: 'r', slur: '-', trru: 'trr' }
const ORN_LETTER = { cut: 'C', bounce: 'B', slide: 'S', roll: 'R', trill: 'tr' } as const

export function articulationLabel(n: TuneNote): string {
  return (n.attack ? ATTACK_LABEL[n.attack] : '') + (n.stop ? 'i' : '')
}

/** Shadow dots: small enough that six of them stay well below the ornament letters. */
const SHADOW_DOT = 4
const SHADOW_GAP = 1.5
/** Height of the shadow strip: six dots, their gaps and the gap between the hands. */
const SHADOW_HEIGHT = SHADOW_DOT * 6 + SHADOW_GAP * 4 + SHADOW_DOT

/** The duet partner's notes over one of mine: tiny faint fingerings, nothing else. */
function PartnerShadow({ notes, whistle }: { notes: TuneNote[]; whistle: string }) {
  return (
    <span className="mb-1 flex items-end gap-[3px] text-ink-faint" style={{ height: SHADOW_HEIGHT }} aria-hidden="true">
      {notes.map((n, i) => {
        const fg = noteFingering(n.pitch!, n.fingering, whistle)
        if (!fg) return null
        return (
          <span key={i} className="flex flex-col" style={{ gap: SHADOW_GAP }}>
            {fg.fingering.map((h, k) => (
              <span
                key={k}
                className={cn('rounded-full border border-current', h === 1 && 'bg-current', h === 0.5 && 'bg-gradient-to-r from-current to-transparent')}
                style={{ width: SHADOW_DOT, height: SHADOW_DOT, marginTop: k === 3 ? SHADOW_DOT - SHADOW_GAP : 0 }}
              />
            ))}
          </span>
        )
      })}
    </span>
  )
}

/** The nearest ancestor that scrolls up and down on its own, rather than with the page. */
function scrollBoxOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
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
    // in view of the window and of the box it scrolls in (the import preview), if any
    const box = scrollBoxOf(el)?.getBoundingClientRect()
    const top = Math.max(0, box?.top ?? 0)
    const bottom = Math.min(window.innerHeight, box?.bottom ?? Infinity)
    if (r.top >= top && r.bottom <= bottom) return
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

  // duets: the partner's notes over each of mine, small and faint
  const partner = section.partner
  const shadow = partner ? partnerUnder(section.phrases.flat(), partner.notes) : null

  const renderNote = (n: TuneNote, idx: number) => {
    const fg = n.pitch != null ? noteFingering(n.pitch, n.fingering, tune.whistle) : undefined
    const inLoop = loop && idx >= loop.from && idx <= loop.to
    const isCurrent = current === idx
    const v = verdicts?.[idx]
    const state: ColumnState = v ? v : isCurrent ? 'current' : current != null && idx < current ? 'past' : 'idle'
    const name = n.pitch != null ? whistleLabel(n.pitch, tune.whistle) : t('tab.rest')
    const orn = n.ornament ? (n.ornament.cut && n.ornament.type !== 'cut' ? 'C+' : '') + ORN_LETTER[n.ornament.type] : ''
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
          // when the page follows the playhead, leave room for the pinned transport at the bottom
          isCurrent && 'scroll-mb-32 bg-moss-soft',
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
        {shadow && partner && <PartnerShadow notes={shadow[idx]} whistle={partner.whistle} />}
        <span className="h-4 text-[13px] leading-4 font-bold text-bad" aria-hidden="true">
          {orn}
        </span>
        {fg ? (
          <FingeringColumn fingering={fg.fingering} register={fg.register} ringHole={ring} cutHole={n.ornament?.cut ? n.ornament.cut - 1 : undefined} dot={dot} state={state} label={onSelect ? undefined : aria} />
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
            // a phrase wider than the screen wraps its own notes onto the next row
            <div key={pi} className="flex max-w-full flex-wrap items-start gap-y-3" role="group" aria-label={t('tab.phrase', { n: pi + 1 })}>
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
