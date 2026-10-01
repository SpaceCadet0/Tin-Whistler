import type { MicStatus } from '../../audio/MicInput'
import { useT } from '../../i18n'
import { Icon } from '../Icon'
import { Button, cn } from '../primitives'
import { LevelMeter } from './Feedback'

/** Compact mic toggle with live level and permission problems explained in place. */
export function MicControl({
  enabled,
  onChange,
  status,
  level = 0,
  className,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  status: MicStatus
  level?: number
  className?: string
}) {
  const { t } = useT()
  if (status === 'denied' || status === 'unsupported' || status === 'error') {
    return (
      <div className={cn('flex items-start gap-3 rounded-2xl bg-bad-soft p-3 text-sm text-bad', className)} role="alert">
        <Icon name="micOff" size={20} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-2">
          <span>{t(status === 'denied' ? 'mic.denied' : status === 'unsupported' ? 'mic.unsupported' : 'mic.error')}</span>
          {status !== 'unsupported' && (
            <Button size="sm" variant="secondary" onClick={() => onChange(true)}>
              {t('mic.retry')}
            </Button>
          )}
        </div>
      </div>
    )
  }
  const on = enabled && status === 'on'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition',
          on ? 'bg-bad-soft text-bad' : 'bg-moss text-on-moss shadow-soft hover:bg-moss-strong',
        )}
      >
        <span className={cn('grid h-6 w-6 place-items-center rounded-full', on && 'animate-pulse-ring')}>
          <Icon name={on ? 'mic' : 'mic'} size={18} />
        </span>
        {status === 'requesting' ? t('mic.requesting') : on ? t('mic.listening') : t('mic.enable')}
      </button>
      {on && <LevelMeter level={level} />}
    </div>
  )
}
