import { useEffect, useRef, useState } from 'react'
import type { PitchFrame } from '../audio/pitch/stabilizer'
import { NoteHoldTracker, type HoldEvent, type HoldState } from '../engine/scoring/noteHold'
import { usePitch } from './audio'

const IDLE: HoldState = { match: { status: 'silent', cents: 0, accuracy: 0 }, progress: 0, waitingRelease: false }

/** Mic + NoteHoldTracker wired into React state. */
export function useNoteHold(opts: { target: number; holdMs: number; tolerance?: number; enabled: boolean; onEvent: (e: HoldEvent) => void }) {
  const tracker = useRef(new NoteHoldTracker(opts.target, opts.holdMs, opts.tolerance))
  const [state, setState] = useState<HoldState>(IDLE)
  const onEvent = useRef(opts.onEvent)
  onEvent.current = opts.onEvent
  const latest = useRef<HoldState>(IDLE)

  useEffect(() => {
    tracker.current.holdMs = opts.holdMs
    tracker.current.tolerance = opts.tolerance ?? 40
    tracker.current.reset(opts.target)
  }, [opts.target, opts.holdMs, opts.tolerance])

  const { frame, status } = usePitch(opts.enabled, (f: PitchFrame) => {
    latest.current = tracker.current.process(f, (e) => onEvent.current(e))
  })

  useEffect(() => {
    setState(latest.current)
  }, [frame])

  return { frame, status, ...state, reset: () => tracker.current.reset() }
}
