import type { PerformanceReport } from '../../engine/scoring/performance'
import { sectionName, useT } from '../../i18n'
import type { TimedNote, Tune } from '../../music/types'
import { whistleLabel } from '../../music/whistles'
import { AnimatedNumber } from '../../ui/motion'
import { Button, Card, Chip, cn, ProgressRing } from '../../ui/primitives'

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <ProgressRing value={value} size={76} stroke={7} graded label={`${label} ${Math.round(value * 100)}%`}>
        <AnimatedNumber className="tabular text-lg font-bold" value={value * 100} format={(n) => `${Math.round(n)}%`} />
      </ProgressRing>
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
    </div>
  )
}

/** Detailed but plain-language results after playing along. */
export function PerformanceReportView({
  report,
  tune,
  timeline,
  onPracticePhrase,
  onClose,
}: {
  report: PerformanceReport
  tune: Tune
  timeline: TimedNote[]
  onPracticePhrase: (from: number, to: number) => void
  onClose: () => void
}) {
  const { t, lang } = useT()
  const wrong = report.results.filter((r) => r.credit < 1).slice(0, 12)
  const timingIssues = report.results.filter((r) => r.timing === 'early' || r.timing === 'late')
  const early = timingIssues.filter((r) => r.timing === 'early').length
  const late = timingIssues.length - early
  const headline = report.overall >= 0.9 ? t('perf.excellent') : report.overall >= 0.75 ? t('perf.good') : report.overall >= 0.5 ? t('perf.okay') : t('perf.keepGoing')
  const secName = (i: number) => sectionName(tune.sections[i]?.name ?? '', lang)

  return (
    <Card className="animate-fade-up">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brass uppercase">{t('perf.title')}</p>
          <h3 className="font-display text-2xl font-semibold">{headline}</h3>
        </div>
        <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label={t('common.close')} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Score label={t('perf.notes')} value={report.notes} />
        <Score label={t('perf.rhythm')} value={report.rhythm} />
        <Score label={t('perf.timing')} value={report.timing} />
        <Score label={t('perf.overall')} value={report.overall} />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="mb-2 font-semibold">{t('perf.wrongNotes')}</h4>
          {wrong.length === 0 ? (
            <p className="text-ink-soft">{t('perf.noWrong')}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {wrong.map((r) => (
                <li key={r.index}>
                  <Chip tone={r.credit > 0 ? 'warn' : 'bad'}>
                    #{r.index + 1}: {whistleLabel(r.expected, tune.whistle)} →{' '}
                    {r.played == null ? t('perf.silence') : whistleLabel(r.played, tune.whistle)}
                    {r.credit === 0.5 && ` (${t('perf.octave')})`}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
          {report.lostAt != null && (
            <p className="mt-3 text-warn">{t('perf.lostAt', { n: report.lostAt + 1, section: secName(timeline[report.lostAt]?.sectionIndex ?? 0) })}</p>
          )}
        </div>
        <div>
          <h4 className="mb-2 font-semibold">{t('perf.rhythmNotes')}</h4>
          <p className="text-ink-soft">
            {timingIssues.length === 0 ? t('perf.rhythmFine') : t('perf.rhythmIssues', { early, late })}
          </p>
          {report.weakPhrases.length > 0 && (
            <>
              <h4 className="mt-4 mb-2 font-semibold">{t('perf.repeatThese')}</h4>
              <ul className="flex flex-col gap-2">
                {report.weakPhrases.slice(0, 3).map((p) => (
                  <li key={`${p.sectionIndex}:${p.phraseIndex}`} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2">
                    <span className="text-sm">
                      {secName(p.sectionIndex)} · {t('tab.phrase', { n: p.phraseIndex + 1 })}{' '}
                      <span className={cn('font-semibold', p.score < 0.5 ? 'text-bad' : 'text-warn')}>{Math.round(p.score * 100)}%</span>
                    </span>
                    <Button size="sm" variant="secondary" icon="loop" onClick={() => onPracticePhrase(p.firstIndex, p.lastIndex)}>
                      {t('perf.loopIt')}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
