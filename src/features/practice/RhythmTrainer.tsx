import { useState } from 'react'
import { usePracticeTimer } from '../../hooks/audio'
import { useT, type MessageKey } from '../../i18n'
import { FIRST_OCTAVE } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { Card, cn, PageHeader, Slider } from '../../ui/primitives'
import { Select } from '../../ui/Select'
import { RhythmRun } from '../exercises/RhythmRun'

const PATTERNS: { id: string; label: MessageKey; pattern: (number | null)[] }[] = [
  { id: 'quarters', label: 'rhythm.pQuarters', pattern: [1, 1, 1, 1] },
  { id: 'long', label: 'rhythm.pLong', pattern: [1, 1, 2] },
  { id: 'rest', label: 'rhythm.pRest', pattern: [1, null, 1, null] },
  { id: 'eighths', label: 'rhythm.pEighths', pattern: [0.5, 0.5, 0.5, 0.5, 1, 1] },
  { id: 'polka', label: 'rhythm.pPolka', pattern: [0.5, 0.5, 1, 0.5, 0.5, 1] },
  { id: 'jig', label: 'rhythm.pJig', pattern: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5] },
]

export default function RhythmTrainer() {
  const { t } = useT()
  const logSession = useProgress((s) => s.logSession)
  const addXp = useProgress((s) => s.addXp)
  const [pattern, setPattern] = useState(PATTERNS[0])
  const [note, setNote] = useState('A')
  const [bpm, setBpm] = useState(70)
  usePracticeTimer(true)

  return (
    <div>
      <PageHeader back="/practice" title={t('practice.rhythm')} subtitle={t('rhythm.subtitle')} />
      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2">
          <p className="mb-3 text-sm font-semibold text-ink-soft">{t('rhythm.pattern')}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('rhythm.pattern')}>
            {PATTERNS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={pattern.id === p.id}
                onClick={() => setPattern(p)}
                className={cn('min-h-10 rounded-2xl px-4 py-2 text-sm font-semibold transition', pattern.id === p.id ? 'bg-moss text-on-moss' : 'bg-surface-2 text-ink-soft')}
              >
                {t(p.label)}
              </button>
            ))}
          </div>
        </Card>
        <Card className="flex flex-col gap-4">
          <Slider label={t('rhythm.tempo')} value={bpm} min={50} max={140} step={2} onChange={setBpm} format={(v) => `${v} BPM`} />
          <label className="flex items-center justify-between gap-3 text-sm font-semibold text-ink-soft">
            {t('rhythm.note')}
            <Select size="sm" className="w-24" value={note} onChange={setNote} options={FIRST_OCTAVE.map((n) => ({ value: n, label: n }))} />
          </label>
        </Card>
      </div>
      <Card className="p-6 sm:p-10">
        <RhythmRun
          key={`${pattern.id}-${note}-${bpm}`}
          note={note}
          bpm={bpm}
          pattern={pattern.pattern}
          bars={2}
          onFinish={(r) => {
            logSession({ kind: 'rhythm', label: t(pattern.label), score: r.timing })
            if (r.timing >= 0.6) addXp(10)
          }}
        />
      </Card>
    </div>
  )
}
