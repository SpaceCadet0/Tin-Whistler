import { useEffect, useState } from 'react'
import { whistleSynth } from '../../audio/WhistleSynth'
import { useT } from '../../i18n'
import { fingeringOffset, tapHole } from '../../music/fingerings'
import type { Fingering, Register } from '../../music/types'
import { getWhistle, whistleLabel, whistleNotes } from '../../music/whistles'
import { useSettings } from '../../state/settings'
import { Card, cn, PageHeader, Segmented } from '../../ui/primitives'
import { FingeringColumn } from '../../ui/whistle/FingeringColumn'
import { WhistleView } from '../../ui/whistle/WhistleView'

/** Tap holes, hear the result. Hold "Blow" to sustain and change fingers live. */
export default function WhistleExplorer() {
  const { t } = useT()
  const whistleId = useSettings((s) => s.whistleId)
  const [fg, setFg] = useState<Fingering>([1, 1, 1, 0, 0, 0])
  const [register, setRegister] = useState<Register>(1)
  const [blowing, setBlowing] = useState(false)
  const midi = getWhistle(whistleId).baseMidi + fingeringOffset(fg, register)
  const exact = Math.abs(midi - Math.round(midi)) < 0.01
  const notes = whistleNotes(whistleId)

  useEffect(() => {
    if (blowing) whistleSynth.startNote(midi)
  }, [blowing, midi])
  useEffect(() => () => whistleSynth.stopNote(), [])

  const toggle = (i: number) => {
    const f = tapHole(fg, i, true)
    setFg(f)
    if (!blowing) whistleSynth.playNote(getWhistle(whistleId).baseMidi + fingeringOffset(f, register), 0.8)
  }

  const start = () => setBlowing(true)
  const stop = () => {
    setBlowing(false)
    whistleSynth.stopNote()
  }

  return (
    <div>
      <PageHeader back="/practice" title={t('practice.whistle')} subtitle={t('explorer.subtitle')} />
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center gap-5 px-8">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-ink-soft uppercase">{t('ex.note')}</p>
            <p className="font-display text-7xl font-semibold">
              {exact ? '' : '≈'}
              {whistleLabel(midi, whistleId)}
            </p>
            {!exact && <p className="text-sm text-ink-soft">{t('explorer.between')}</p>}
          </div>
          <WhistleView fingering={fg} interactive onToggle={toggle} height={460} label={t('whistle.tapToCover')} />
          <Segmented
            label={t('explorer.breath')}
            value={register}
            onChange={setRegister}
            options={[
              { value: 1, label: t('explorer.soft') },
              { value: 2, label: t('explorer.strong') },
            ]}
          />
          <button
            type="button"
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={() => blowing && stop()}
            onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !blowing && start()}
            onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
            className={cn('h-16 w-full touch-none rounded-3xl text-lg font-semibold transition select-none', blowing ? 'bg-brass text-white' : 'bg-moss text-on-moss')}
          >
            {blowing ? t('explorer.blowing') : t('explorer.hold')}
          </button>
          <p className="max-w-xs text-center text-sm text-ink-soft">{t('explorer.hint')}</p>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-xl font-semibold">{t('explorer.chart')}</h2>
          <div className="flex flex-wrap gap-x-2 gap-y-5">
            {notes.map((n) => (
              <button
                key={n.id + n.register}
                type="button"
                onClick={() => {
                  setFg(n.fingering)
                  setRegister(n.register)
                  whistleSynth.playNote(n.midi, 0.8)
                }}
                className={cn('flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition hover:bg-surface-2', n.chromatic && 'opacity-70')}
                aria-label={`${n.id}${n.chromatic ? ` (${t('explorer.chromatic')})` : ''}`}
              >
                <FingeringColumn fingering={n.fingering} register={n.register} dot={13} />
                <span className="font-display text-lg font-semibold">{n.id}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-soft">{t('explorer.chartHint')}</p>
        </Card>
      </div>
    </div>
  )
}
