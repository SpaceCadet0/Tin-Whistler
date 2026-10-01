import { Triquetra } from '../../ui/ornaments'
import { Link } from 'react-router-dom'
import { smartSuggestion, weakNotes } from '../../engine/adaptive/smartPractice'
import { useT, type MessageKey } from '../../i18n'
import { useProgress } from '../../state/progress'
import { Icon } from '../../ui/Icon'
import { ButtonLink, Card, Chip, PageHeader } from '../../ui/primitives'
import { Stagger } from '../../ui/motion'

const MODES: { to: string; icon: string; title: MessageKey; body: MessageKey; tone: string }[] = [
  { to: '/practice/notes', icon: 'target', title: 'practice.notes', body: 'practice.notesBody', tone: 'bg-moss-soft text-moss' },
  { to: '/practice/tuner', icon: 'tuner', title: 'practice.tuner', body: 'practice.tunerBody', tone: 'bg-brass-soft text-brass' },
  { to: '/practice/sequence', icon: 'ladder', title: 'practice.sequence', body: 'practice.sequenceBody', tone: 'bg-moss-soft text-moss' },
  { to: '/practice/ear', icon: 'ear', title: 'practice.ear', body: 'practice.earBody', tone: 'bg-brass-soft text-brass' },
  { to: '/practice/rhythm', icon: 'metronome', title: 'practice.rhythm', body: 'practice.rhythmBody', tone: 'bg-moss-soft text-moss' },
  { to: '/practice/game', icon: 'gamepad', title: 'practice.game', body: 'practice.gameBody', tone: 'bg-bad-soft text-bad' },
  { to: '/practice/free', icon: 'record', title: 'practice.free', body: 'practice.freeBody', tone: 'bg-brass-soft text-brass' },
  { to: '/practice/whistle', icon: 'whistle', title: 'practice.whistle', body: 'practice.whistleBody', tone: 'bg-moss-soft text-moss' },
]

export default function PracticeHub() {
  const { t } = useT()
  const stats = useProgress((s) => s.noteStats)
  const transitions = useProgress((s) => s.transitions)
  const suggestion = smartSuggestion(stats, transitions)
  const weak = weakNotes(stats).slice(0, 5)

  return (
    <div>
      <PageHeader title={t('practice.title')} subtitle={t('practice.subtitle')} />
      <Card className="relative mb-6 flex flex-wrap items-center gap-5 overflow-hidden bg-moss p-6 text-on-moss">
        <Triquetra className="pointer-events-none absolute -top-12 -right-12 h-56 w-56 opacity-[0.12]" weight={2.5} />
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15">
          <Icon name="calendar" size={28} />
        </span>
        <div className="min-w-0 flex-1 basis-52">
          <p className="font-display text-2xl leading-tight font-semibold">{t('daily.title')}</p>
          <p className="opacity-85">{t('daily.subtitle')}</p>
        </div>
        <ButtonLink to="/daily" variant="secondary" size="lg" icon="play" className="w-full border-0 bg-surface text-moss sm:w-auto">
          {t('daily.start')}
        </ButtonLink>
      </Card>

      {suggestion && (
        <Card className="mb-6 border-brass/40">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brass text-white">
              <Icon name="wand" />
            </span>
            <div className="min-w-0 flex-1 basis-52">
              <p className="font-semibold">{t('smart.title')}</p>
              <p className="text-ink-soft">
                {suggestion.kind === 'note' ? t('smart.note', { note: suggestion.note }) : t('smart.transition', { from: suggestion.from, to: suggestion.to })}
              </p>
              {weak.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {weak.map((w) => (
                    <Chip key={w.note} tone="warn">
                      {w.note} · {Math.round(w.mastery * 100)}%
                    </Chip>
                  ))}
                </div>
              )}
            </div>
            <ButtonLink
              to={suggestion.kind === 'note' ? `/practice/notes?focus=${encodeURIComponent(suggestion.note)}&seconds=60` : `/practice/sequence?notes=${encodeURIComponent(`${suggestion.from},${suggestion.to},${suggestion.from},${suggestion.to}`)}`}
              variant="brass"
              iconRight="next"
            >
              {t('smart.go')}
            </ButtonLink>
          </div>
        </Card>
      )}

      <Stagger as="div" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MODES.map((m) => (
          <Link key={m.to} to={m.to} className="group flex flex-col gap-3 rounded-[var(--radius-card)] border border-line/70 bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${m.tone}`}>
              <Icon name={m.icon} />
            </span>
            <span className="font-display text-xl leading-tight font-semibold hyphens-auto">{t(m.title)}</span>
            <span className="text-sm text-ink-soft">{t(m.body)}</span>
          </Link>
        ))}
      </Stagger>
    </div>
  )
}
