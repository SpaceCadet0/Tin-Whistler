import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { nextSequenceLength } from '../../engine/adaptive/smartPractice'
import { learnedNotes } from '../../engine/lesson/course'
import { usePracticeTimer } from '../../hooks/audio'
import { useT } from '../../i18n'
import { scaleNotes } from '../../music/scales'
import { FIRST_OCTAVE, noteById } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'
import { Button, Card, PageHeader } from '../../ui/primitives'
import { SequenceRun, type SequenceOutcome } from '../exercises/SequenceRun'
import { Celebrate } from '../exercises/shared'

/** Random stepwise sequences that grow when you succeed and shrink when you struggle. */
function randomSequence(pool: string[], length: number): string[] {
  const sorted = [...pool].sort((a, b) => noteById(a)!.midi - noteById(b)!.midi)
  let i = Math.floor(Math.random() * sorted.length)
  const out = [sorted[i]]
  while (out.length < length) {
    const step = Math.random() < 0.75 ? (Math.random() < 0.5 ? -1 : 1) : Math.random() < 0.5 ? -2 : 2
    i = Math.max(0, Math.min(sorted.length - 1, i + step))
    if (sorted[i] !== out[out.length - 1]) out.push(sorted[i])
  }
  return out
}

export default function SequenceTrainer() {
  const { t } = useT()
  const [params] = useSearchParams()
  const fixed = params.get('notes')?.split(',').filter((n) => noteById(n))
  const completed = useProgress((s) => s.completedLessons)
  const addXp = useProgress((s) => s.addXp)
  const level = useSettings((s) => s.level)
  const known = learnedNotes(completed, level).filter((n) => FIRST_OCTAVE.includes(n))
  // before any lessons: the first five notes of the whistle's home scale
  const pool = known.length >= 3 ? known : scaleNotes('major', 'D').slice(0, 5)
  const [length, setLength] = useState(4)
  const [seq, setSeq] = useState<string[]>(() => fixed ?? randomSequence(pool, 4))
  const [outcome, setOutcome] = useState<SequenceOutcome | null>(null)
  const [round, setRound] = useState(0)
  usePracticeTimer(true)

  const next = () => {
    const ok = !!outcome && outcome.correct === outcome.total
    const len = fixed ? length : nextSequenceLength(length, ok)
    setLength(len)
    setSeq(fixed ?? randomSequence(pool, len))
    setOutcome(null)
    setRound((r) => r + 1)
  }

  return (
    <div>
      <PageHeader back="/practice" title={t('practice.sequence')} subtitle={fixed ? t('seq.focus') : t('seq.subtitle', { n: length })} />
      <Card className="p-6 sm:p-10">
        {outcome ? (
          <Celebrate title={t('seq.result', { correct: outcome.correct, total: outcome.total })}>
            <p className="text-ink-soft">{outcome.correct === outcome.total ? t('seq.longer') : t('seq.keep')}</p>
            <Button size="lg" iconRight="next" onClick={next} autoFocus>
              {t('ex.next')}
            </Button>
          </Celebrate>
        ) : (
          <SequenceRun
            key={round}
            notes={seq}
            onFinish={(o) => {
              setOutcome(o)
              if (o.correct === o.total) addXp(5)
            }}
          />
        )}
      </Card>
    </div>
  )
}
