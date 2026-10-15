import { noteFingering } from '../../music/ornaments'
import type { TimedNote } from '../../music/types'
import { whistleLabel } from '../../music/whistles'
import { motion } from '../../ui/motion'
import { cn } from '../../ui/primitives'
import { FingeringColumn } from '../../ui/whistle/FingeringColumn'
import { articulationLabel } from '../../ui/whistle/TabView'

/** Height of a fingering column relative to its dot size (six holes, gaps, octave mark). */
const COLUMN_HEIGHT_PER_DOT = 7.3

/**
 * A running strip of tab inside the player's stage: the current column in the middle (ringed),
 * the ones just played dimmed on its left, what comes next on its right. It slides on every note,
 * so the player reads the tab right under the big note instead of looking down the page.
 */
export function StageStrip({ timeline, current, whistle, narrow }: { timeline: TimedNote[]; current: number; whistle: string; narrow: boolean }) {
  const before = narrow ? 3 : 4
  const from = Math.max(0, current - before)
  const items = timeline.slice(from, from + before * 2 + 1)
  const dot = narrow ? 12 : 15
  return (
    <div className="col-span-full flex items-end justify-center gap-1 overflow-hidden rounded-2xl bg-surface-2/70 px-3 py-2" aria-hidden="true">
      {items.map((n) => {
        const fg = n.note.pitch != null ? noteFingering(n.note.pitch, n.note.fingering, whistle) : undefined
        const isCurrent = n.index === current
        return (
          <motion.div
            layout
            key={n.index}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn('flex flex-col items-center rounded-xl px-2 pt-1.5 pb-1.5', isCurrent && 'bg-moss-soft ring-2 ring-moss', n.index < current && 'opacity-35')}
          >
            {fg ? (
              <FingeringColumn fingering={fg.fingering} register={fg.register} dot={dot} state={isCurrent ? 'current' : 'idle'} />
            ) : (
              <span className="grid w-5 place-items-center text-ink-faint" style={{ height: dot * COLUMN_HEIGHT_PER_DOT }}>
                𝄽
              </span>
            )}
            <span className="h-5 text-[14px] leading-5 font-semibold text-bad">{articulationLabel(n.note)}</span>
            <span className={cn('text-[13px] leading-4 font-semibold', isCurrent ? 'text-moss' : 'text-ink-soft')}>
              {n.note.pitch != null ? whistleLabel(n.note.pitch, whistle) : '–'}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
