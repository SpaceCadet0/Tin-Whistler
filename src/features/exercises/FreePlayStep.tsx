import { useEffect, useState } from 'react'
import { whistleSynth, WhistleVoice } from '../../audio/WhistleSynth'
import type { ExerciseResult, FreePlayExercise } from '../../engine/lesson/types'
import { usePitch } from '../../hooks/audio'
import { useT } from '../../i18n'
import { noteById } from '../../music/whistles'
import { useSession } from '../../state/session'
import { MicControl } from '../../ui/feedback/MicControl'
import { PitchTrace } from '../../ui/feedback/PitchTrace'
import { Button, cn } from '../../ui/primitives'
import { ExerciseHeader } from './shared'
import { StepActions } from './StepActions'
import { useStepFooter } from './stepFooter'
import { audioEngine } from '../../audio/AudioEngine'

/** Play a short demo with (and without) an ornament so the learner can hear the difference. */
function playDemo(notes: string[], ornament?: 'cut' | 'bounce' | 'slide') {
  void audioEngine.resume()
  const voice = new WhistleVoice(audioEngine.output, whistleSynth.settings.a4)
  let t = audioEngine.now + 0.05
  notes.forEach((id, i) => {
    const n = noteById(id)!
    const next = notes[i + 1] ? noteById(notes[i + 1])!.midi : undefined
    // a slide glides into the following note; cuts and bounces use the conventional grace intervals
    const orn = ornament === 'slide' ? (next != null ? ornament : undefined) : ornament
    voice.schedule({ time: t, duration: 0.8, midi: n.midi, attack: i === 0 || !ornament ? 'tongue' : 'slur', ornament: orn ? { type: orn } : undefined, slideTo: next })
    t += 0.8
  })
  voice.schedule({ time: t, duration: 0.1, midi: null })
  voice.stop(t + 0.1)
}

export function FreePlayStep({ exercise, onComplete }: { exercise: FreePlayExercise; onComplete: (r: ExerciseResult) => void }) {
  const { t, L } = useT()
  const { micWanted, setMicWanted } = useSession()
  const { frame, status } = usePitch(micWanted)
  const [left, setLeft] = useState(exercise.seconds)
  const pinned = useStepFooter() != null

  useEffect(() => {
    if (!micWanted || left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [micWanted, left])

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 sm:gap-5">
      <ExerciseHeader title={exercise.title} />
      <p className="max-w-lg text-center text-lg text-balance sm:text-xl">{L(exercise.prompt)}</p>
      {exercise.demo && (
        <div className={cn('flex justify-center gap-2', pinned ? 'w-full' : 'flex-wrap')}>
          <Button variant="secondary" icon="volume" className={pinned ? 'min-w-0 flex-1 px-3' : undefined} onClick={() => playDemo(exercise.demo!.notes)}>
            {t('free.plain')}
          </Button>
          <Button variant="brass" icon="sparkles" className={pinned ? 'min-w-0 flex-1 px-3' : undefined} onClick={() => playDemo(exercise.demo!.notes, exercise.demo!.ornament)}>
            {t('free.withOrnament')}
          </Button>
        </div>
      )}
      <div className="w-full max-w-2xl">
        <PitchTrace active={micWanted} target={frame?.note ?? null} height={pinned ? 120 : 220} />
      </div>
      <MicControl enabled={micWanted} onChange={setMicWanted} status={status} level={frame?.level ?? 0} />
      <StepActions>
        <Button size="lg" iconRight="next" onClick={() => onComplete({ score: 1 })} variant={left <= 0 ? 'primary' : 'secondary'}>
          {left > 0 && micWanted ? t('free.doneIn', { s: left }) : t('ex.continue')}
        </Button>
      </StepActions>
    </div>
  )
}
