import { useEffect, useRef } from 'react'
import { audioEngine } from '../../audio/AudioEngine'
import { pitchTracker } from '../../audio/PitchTracker'
import { useRaf } from '../../hooks/audio'
import { useT } from '../../i18n'
import { whistleNotes } from '../../music/whistles'

/**
 * Scrolling pitch graph: the last few seconds of detected pitch against whistle note lines.
 * Great for seeing ornaments, slides and wobbly long notes.
 */
export function PitchTrace({ seconds = 6, height = 220, target, active }: { seconds?: number; height?: number; target?: number | null; active: boolean }) {
  const { t } = useT()
  const ref = useRef<HTMLCanvasElement>(null)
  const notes = whistleNotes('D').filter((n) => !n.chromatic)
  const lo = 72
  const hi = 97

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      c.width = c.clientWidth * dpr
      c.height = height * dpr
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [height])

  useRaf(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const W = c.width
    const H = c.height
    const css = getComputedStyle(document.documentElement)
    const line = css.getPropertyValue('--c-line').trim()
    const faint = css.getPropertyValue('--c-ink-faint').trim()
    const moss = css.getPropertyValue('--c-moss').trim()
    const brass = css.getPropertyValue('--c-brass').trim()
    const y = (m: number) => H - ((m - lo) / (hi - lo)) * H
    ctx.clearRect(0, 0, W, H)
    ctx.font = `${11 * dpr}px 'Geist Variable', sans-serif`
    for (const n of notes) {
      ctx.strokeStyle = n.midi === target ? brass : line
      ctx.lineWidth = (n.midi === target ? 3 : 1) * dpr
      ctx.beginPath()
      ctx.moveTo(28 * dpr, y(n.midi))
      ctx.lineTo(W, y(n.midi))
      ctx.stroke()
      ctx.fillStyle = n.midi === target ? brass : faint
      ctx.fillText(n.id, 4 * dpr, y(n.midi) + 4 * dpr)
    }
    const now = audioEngine.now
    const frames = pitchTracker.history
    ctx.strokeStyle = moss
    ctx.lineWidth = 3 * dpr
    ctx.lineJoin = 'round'
    ctx.beginPath()
    let pen = false
    for (let i = Math.max(0, frames.length - 700); i < frames.length; i++) {
      const f = frames[i]
      const age = now - f.time
      if (age > seconds) continue
      const x = W - (age / seconds) * (W - 30 * dpr)
      if (f.voiced && f.midi != null) {
        if (pen) ctx.lineTo(x, y(f.midi))
        else ctx.moveTo(x, y(f.midi))
        pen = true
      } else pen = false
    }
    ctx.stroke()
  }, active)

  return <canvas ref={ref} className="w-full rounded-2xl bg-surface-2/60" style={{ height }} role="img" aria-label={t('trace.aria')} />
}
