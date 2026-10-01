import { useEffect, useRef, useState } from 'react'
import { audioEngine } from '../audio/AudioEngine'
import { micInput, type MicStatus } from '../audio/MicInput'
import { pitchTracker, type PitchFrame } from '../audio/PitchTracker'
import { TunePlayer, type PlayerPosition, type PlayerState } from '../audio/TunePlayer'
import type { Tune } from '../music/types'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { useShallow } from 'zustand/react/shallow'

export function useMicStatus(): MicStatus {
  const [status, setStatus] = useState<MicStatus>(micInput.current)
  useEffect(() => micInput.status.on(setStatus), [])
  return status
}

/** Run `fn` every animation frame while `active`. */
export function useRaf(fn: (now: number) => void, active = true): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    let id = 0
    const loop = (t: number) => {
      ref.current(t)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
}

/**
 * Live pitch from the microphone. The mic starts when `enabled` becomes true and is released on
 * unmount. Frames are delivered to `onFrame` synchronously (for exercise logic) and the latest
 * one is returned for rendering, throttled to animation frames.
 */
export function usePitch(enabled: boolean, onFrame?: (f: PitchFrame) => void, mode: 'whistle' | 'chromatic' = 'whistle') {
  const [frame, setFrame] = useState<PitchFrame | null>(null)
  const status = useMicStatus()
  const cb = useRef(onFrame)
  cb.current = onFrame
  const latest = useRef<PitchFrame | null>(null)
  const { a4, offsetCents, sensitivity } = useSettings(useShallow((s) => ({ a4: s.a4, offsetCents: s.offsetCents, sensitivity: s.sensitivity })))

  useEffect(() => {
    pitchTracker.setCalibration({ a4, offsetCents, sensitivity })
  }, [a4, offsetCents, sensitivity])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let started = false
    const off = pitchTracker.frames.on((f) => {
      latest.current = f
      cb.current?.(f)
    })
    pitchTracker.setMode(mode)
    void pitchTracker.start().then((ok) => {
      started = ok
      if (cancelled && ok) pitchTracker.stop()
    })
    return () => {
      cancelled = true
      off()
      if (started) pitchTracker.stop()
      latest.current = null
      setFrame(null)
    }
  }, [enabled, mode])

  useRaf(() => {
    if (latest.current !== frame) setFrame(latest.current)
  }, enabled)

  return { frame, status }
}

/** TunePlayer bound to a component: loads the tune, reports state and a rAF-updated position. */
export function usePlayer(tune: Tune | undefined) {
  const playerRef = useRef<TunePlayer | null>(null)
  playerRef.current ??= new TunePlayer()
  const player = playerRef.current
  const [state, setState] = useState<PlayerState>('stopped')
  const [position, setPosition] = useState<PlayerPosition | null>(null)
  const a4 = useSettings((s) => s.a4)

  // load synchronously so the first render already sees the timeline
  const loaded = useRef<Tune | undefined>(undefined)
  if (tune && loaded.current !== tune) {
    player.load(tune)
    loaded.current = tune
  }
  useEffect(() => () => player.stop(), [player])

  useEffect(() => {
    player.options.a4 = a4
  }, [a4, player])

  useEffect(() => player.stateChange.on(setState), [player])

  useRaf(() => {
    const p = player.positionAt(audioEngine.now)
    setPosition((prev) =>
      prev && prev.index === p.index && prev.state === p.state && Math.abs(prev.countdown - p.countdown) < 0.05 && Math.abs(prev.progress - p.progress) < 0.04 ? prev : p,
    )
  }, state !== 'stopped')

  useEffect(() => {
    if (state === 'stopped') setPosition(null)
  }, [state])

  return { player, state, position }
}

/** Credit practice time while a practice screen is open and visible. */
export function usePracticeTimer(active = true): void {
  const add = useProgress((s) => s.addPracticeTime)
  useEffect(() => {
    if (!active) return
    let last = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      if (document.visibilityState === 'visible') add(Math.round((now - last) / 1000))
      last = now
    }, 15000)
    return () => {
      window.clearInterval(id)
      if (document.visibilityState === 'visible') add(Math.round((Date.now() - last) / 1000))
    }
  }, [active, add])
}
