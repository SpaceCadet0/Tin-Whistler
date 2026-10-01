import type { ReactNode } from 'react'
import { whistleSynth } from '../../audio/WhistleSynth'
import { useT } from '../../i18n'
import type { LocalizedText } from '../../music/types'
import { noteById } from '../../music/whistles'
import { useSettings } from '../../state/settings'
import { EASE_OUT, motion, SuccessMark } from '../../ui/motion'
import { Button } from '../../ui/primitives'

export function ExerciseHeader({ title, instruction, step }: { title: LocalizedText; instruction?: LocalizedText; step?: string }) {
  const { L } = useT()
  return (
    <div className="mb-6 text-center">
      {step && <p className="mb-2 text-xs font-bold tracking-[0.18em] text-brass uppercase">{step}</p>}
      <h2 className="font-display text-3xl font-semibold text-balance sm:text-4xl">{L(title)}</h2>
      {instruction && <p className="mx-auto mt-2 max-w-md text-lg text-ink-soft">{L(instruction)}</p>}
    </div>
  )
}

export function ListenButton({ note, duration = 1, label }: { note: string; duration?: number; label?: string }) {
  const { t } = useT()
  const whistleId = useSettings((s) => s.whistleId)
  const n = noteById(note, whistleId)
  if (!n) return null
  return (
    <Button variant="secondary" icon="volume" onClick={() => whistleSynth.playNote(n.midi, duration)}>
      {label ?? t('ex.listen')}
    </Button>
  )
}

/** Repetition counter: ● ● ○ ○ ○ */
export function RepDots({ done, total }: { done: number; total: number }) {
  const { t } = useT()
  return (
    <div className="flex items-center gap-2" role="img" aria-label={t('ex.reps', { done, total })}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="relative grid h-4 w-4 place-items-center rounded-full border-2 border-line">
          {i < done && <motion.span className="absolute -inset-[2px] rounded-full bg-good" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} />}
        </span>
      ))}
    </div>
  )
}

export function Celebrate({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center" role="status">
      <SuccessMark />
      <motion.p className="font-display text-3xl font-semibold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT }}>
        {title}
      </motion.p>
      {children}
    </div>
  )
}
