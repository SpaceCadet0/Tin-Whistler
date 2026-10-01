import { useState } from 'react'
import { usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { useProgress } from '../../state/progress'
import { Button, Card, PageHeader, Segmented, Toggle } from '../../ui/primitives'
import { EarQuiz } from '../exercises/EarQuiz'

const SETS: Record<string, string[]> = {
  easy: ['D', 'G', 'A'],
  medium: ['D', 'E', 'G', 'A'],
  hard: ['D', 'E', 'F#', 'G', 'A', 'B'],
  full: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#', "D'"],
}

export default function EarTraining() {
  const { t } = useT()
  const ear = useProgress((s) => s.ear)
  const [level, setLevel] = useState<keyof typeof SETS>('medium')
  const [playBack, setPlayBack] = useState(false)
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  usePracticeTimer(true)

  return (
    <div>
      <PageHeader back="/practice" title={t('practice.ear')} subtitle={t('practice.earBody')} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label={t('ear.difficulty')}
          value={level}
          onChange={(v) => {
            setLevel(v)
            setRun((r) => r + 1)
            setResult(null)
          }}
          options={[
            { value: 'easy', label: '3' },
            { value: 'medium', label: '4' },
            { value: 'hard', label: '6' },
            { value: 'full', label: '8' },
          ]}
        />
        <div className="w-64">
          <Toggle label={t('ear.playBackToggle')} checked={playBack} onChange={setPlayBack} />
        </div>
        <p className="text-sm text-ink-soft">{t('ear.stats', { best: ear.best, pct: ear.attempts ? Math.round((ear.correct / ear.attempts) * 100) : 0 })}</p>
      </div>
      <Card className="p-6 sm:p-10">
        {result == null ? (
          <EarQuiz key={`${level}-${run}`} choices={SETS[level]} rounds={10} playBack={playBack} onComplete={(r) => setResult(r.score)} />
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-display text-4xl font-semibold">{Math.round(result * 100)}%</p>
            <Button
              icon="repeat"
              onClick={() => {
                setRun((r) => r + 1)
                setResult(null)
              }}
            >
              {t('trainer.again')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
