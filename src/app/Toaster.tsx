import { useEffect, useState } from 'react'
import { toasts, type Toast } from '../lib/toast'
import { Icon } from '../ui/Icon'
import { AnimatePresence, motion } from '../ui/motion'
import { cn } from '../ui/primitives'

/** Quiet, non-blocking notifications (XP, achievements). */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(
    () =>
      toasts.on((t) => {
        setItems((xs) => [...xs.slice(-2), t])
        window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.kind === 'achievement' ? 5000 : 2600)
      }),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+var(--safe-top))] z-50 flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
      {items.map((t) => (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className={cn(
            'pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift',
            t.kind === 'achievement' && 'border-brass/50',
          )}
        >
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', t.kind === 'achievement' ? 'bg-brass-soft text-brass' : t.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-moss-soft text-moss')}>
            <Icon name={t.icon ?? (t.kind === 'xp' ? 'sparkles' : t.kind === 'achievement' ? 'trophy' : 'info')} size={20} />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">{t.title}</span>
            {t.body && <span className="text-sm text-ink-soft">{t.body}</span>}
          </span>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  )
}
