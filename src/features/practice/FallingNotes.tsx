import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { audioEngine } from '../../audio/AudioEngine'
import type { PitchFrame } from '../../audio/pitch/stabilizer'
import { usePitch, usePlayer, usePracticeTimer, useRaf } from '../../hooks/audio'
import { useHotkeys } from '../../hooks/useHotkeys'
import { sectionName, useT } from '../../i18n'
import { noteFingering } from '../../music/ornaments'
import { flattenTune } from '../../music/tune'
import type { TimedNote } from '../../music/types'
import { whistleLabel } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { useSession } from '../../state/session'
import { useSettings } from '../../state/settings'
import { useAllTunes } from '../../state/tunes'
import { MicControl } from '../../ui/feedback/MicControl'
import { Icon } from '../../ui/Icon'
import { Button, Card, cn, IconButton, Toggle } from '../../ui/primitives'
import { Select } from '../../ui/Select'
import { WhistleView } from '../../ui/whistle/WhistleView'

type Verdict = 'perfect' | 'good' | 'late' | 'miss'
const LOOK_AHEAD = 3.2 // seconds of notes visible above the hit line
const HIT_LINE = 0.82

interface GameNote {
  tn: TimedNote
  verdict?: Verdict
}

export default function FallingNotes() {
  const { t, lang } = useT()
  const [params] = useSearchParams()
  const tunes = useAllTunes()
  const [tuneId, setTuneId] = useState(params.get('tune') ?? 'ode-to-joy')
  const tune = tunes.find((x) => x.id === tuneId) ?? tunes[0]
  const [sectionIdx, setSectionIdx] = useState(0)
  const [tempo, setTempo] = useState(0.7)
  const [guide, setGuide] = useState(true)
  const [metronome, setMetronome] = useState(true)
  const { micWanted, setMicWanted } = useSession()
  const latency = useSettings((s) => s.latencyMs) / 1000
  const recordGame = useProgress((s) => s.recordGame)
  const { player, state } = usePlayer(tune)
  const [hud, setHud] = useState({ score: 0, combo: 0, best: 0, hits: 0, total: 0, last: null as Verdict | null })
  const [finished, setFinished] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const notes = useRef<GameNote[]>([])
  const origin = useRef(0)
  const livePitch = useRef<number | null>(null)
  usePracticeTimer(state !== 'stopped')

  const timeline = useMemo(() => flattenTune(tune, { tempo, sections: [sectionIdx] }), [tune, tempo, sectionIdx])
  const lanes = useMemo(() => [...new Set(timeline.filter((n) => n.note.pitch != null).map((n) => Math.round(n.note.pitch!)))].sort((a, b) => a - b), [timeline])

  const onFrame = (f: PitchFrame) => {
    livePitch.current = f.voiced && f.midi != null ? f.midi : null
    if (!f.voiced || f.midi == null || state === 'stopped') return
    const now = f.time - latency - origin.current
    for (const g of notes.current) {
      if (g.verdict || g.tn.note.pitch == null) continue
      const start = g.tn.start
      if (now < start - 0.15) break
      const end = start + Math.min(g.tn.duration * 0.75, 0.45)
      if (now > end) continue
      if (Math.abs(f.midi - g.tn.note.pitch) <= 0.5) {
        const d = Math.abs(now - start)
        g.verdict = d < 0.09 ? 'perfect' : d < 0.2 ? 'good' : 'late'
        const pts = g.verdict === 'perfect' ? 100 : g.verdict === 'good' ? 70 : 40
        setHud((h) => {
          const combo = h.combo + 1
          return { ...h, score: h.score + pts * (1 + Math.floor(combo / 10) * 0.5), combo, best: Math.max(h.best, combo), hits: h.hits + 1, last: g.verdict! }
        })
        break
      }
    }
  }
  const { frame, status } = usePitch(micWanted, onFrame)

  const start = () => {
    notes.current = timeline.map((tn) => ({ tn }))
    setHud({ score: 0, combo: 0, best: 0, hits: 0, total: timeline.filter((n) => n.note.pitch != null).length, last: null })
    setFinished(false)
    const first = tune.sections.slice(0, sectionIdx).reduce((s, x) => s + x.phrases.flat().length, 0)
    player.setOptions({ tempo, melody: guide, metronome, repeat: false, countIn: (tune.beatsPerBar ?? 4) / (tune.pulse ?? 1) })
    player.play(first, first + timeline.length - 1)
    origin.current = player.passStartTime
  }

  useEffect(() => player.passStarted.on(({ startTime }) => (origin.current = startTime)), [player])

  const prev = useRef(state)
  useEffect(() => {
    if (prev.current !== 'stopped' && state === 'stopped' && notes.current.length) {
      setFinished(true)
      const total = notes.current.filter((g) => g.tn.note.pitch != null).length
      const hits = notes.current.filter((g) => g.verdict && g.verdict !== 'miss').length
      recordGame(hud.best, total ? hits / total : 0)
    }
    prev.current = state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useHotkeys({ ' ': () => (state === 'stopped' ? start() : player.stop()) })

  // canvas rendering
  useRaf(() => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = window.devicePixelRatio || 1
    if (c.width !== c.clientWidth * dpr || c.height !== c.clientHeight * dpr) {
      c.width = c.clientWidth * dpr
      c.height = c.clientHeight * dpr
    }
    const W = c.width
    const H = c.height
    const css = getComputedStyle(document.documentElement)
    const col = (v: string) => css.getPropertyValue(v).trim()
    const now = audioEngine.now - origin.current
    const hitY = H * HIT_LINE
    const laneW = W / Math.max(1, lanes.length)
    const pxPerSec = hitY / LOOK_AHEAD
    ctx.clearRect(0, 0, W, H)

    // lanes
    lanes.forEach((m, i) => {
      const x = i * laneW
      const playing = livePitch.current != null && Math.abs(livePitch.current - m) < 0.5
      ctx.fillStyle = playing ? col('--c-moss-soft') : i % 2 ? col('--c-surface') : col('--c-surface-2')
      ctx.fillRect(x, 0, laneW, H)
      ctx.fillStyle = playing ? col('--c-moss') : col('--c-ink-soft')
      ctx.font = `600 ${Math.min(28, laneW * 0.35) * dpr}px 'Geologica Variable', sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(whistleLabel(m, tune.whistle), x + laneW / 2, H - 16 * dpr)
    })
    // hit line
    ctx.fillStyle = col('--c-brass')
    ctx.fillRect(0, hitY - 2 * dpr, W, 4 * dpr)

    // notes
    for (const g of notes.current) {
      const p = g.tn.note.pitch
      if (p == null) continue
      const lane = lanes.indexOf(Math.round(p))
      const yBottom = hitY - (g.tn.start - now) * pxPerSec
      const h = Math.max(18 * dpr, g.tn.duration * pxPerSec - 4 * dpr)
      const yTop = yBottom - h
      if (yTop > H || yBottom < 0) continue
      if (!g.verdict && now > g.tn.start + Math.min(g.tn.duration * 0.75, 0.45) && state !== 'stopped' && micWanted) {
        g.verdict = 'miss'
        setHud((s) => ({ ...s, combo: 0, last: 'miss' }))
      }
      const x = lane * laneW + 6 * dpr
      const w = laneW - 12 * dpr
      const active = !g.verdict && now >= g.tn.start - 0.15 && now <= g.tn.start + g.tn.duration
      const fill = g.verdict === 'miss' ? col('--c-bad-soft') : g.verdict ? col('--c-good') : active ? col('--c-moss') : col('--c-surface')
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.roundRect(x, yTop, w, h, 10 * dpr)
      ctx.fill()
      if (!g.verdict && !active) {
        // upcoming notes: outlined, so "done" and "to play" never rely on colour alone
        ctx.strokeStyle = col('--c-moss')
        ctx.lineWidth = 3 * dpr
        ctx.stroke()
      }
      if (g.verdict === 'miss') {
        ctx.strokeStyle = col('--c-bad')
        ctx.lineWidth = 3 * dpr
        ctx.beginPath()
        ctx.moveTo(x + 8 * dpr, yTop + 8 * dpr)
        ctx.lineTo(x + w - 8 * dpr, yBottom - 8 * dpr)
        ctx.stroke()
      }
      ctx.fillStyle = g.verdict === 'miss' ? col('--c-bad') : g.verdict || active ? col('--c-on-moss') : col('--c-moss')
      ctx.font = `700 ${Math.min(26, laneW * 0.3) * dpr}px 'Geist Variable', sans-serif`
      ctx.textAlign = 'center'
      if (g.verdict && g.verdict !== 'miss') ctx.fillText('✓', x + w / 2, yTop + 26 * dpr)
      ctx.fillText(whistleLabel(p, tune.whistle) + (g.tn.note.ornament ? ` ${g.tn.note.ornament.type[0].toUpperCase()}` : ''), x + w / 2, yBottom - 10 * dpr)
    }
  }, true)

  // side panel: current & next fingering
  const now = state !== 'stopped' ? audioEngine.now - origin.current : -1
  const curG = notes.current.find((g) => g.tn.note.pitch != null && g.tn.start + g.tn.duration > now)
  const cur = curG?.tn ?? timeline.find((n) => n.note.pitch != null)
  const curFg = cur?.note.pitch != null ? noteFingering(cur.note.pitch, cur.note.fingering, tune.whistle) : undefined
  const accuracy = hud.total ? hud.hits / hud.total : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/practice" aria-label={t('common.back')} className="grid h-11 w-11 place-items-center rounded-2xl text-ink-soft hover:bg-surface-2">
          <Icon name="back" />
        </Link>
        <h1 className="font-display text-3xl font-semibold">{t('practice.game')}</h1>
        <div className="ml-auto flex items-center gap-4 font-semibold tabular">
          <span>{t('game.score')}: {Math.round(hud.score)}</span>
          <span className={cn(hud.combo >= 10 && 'text-brass')}>×{hud.combo}</span>
          {hud.last && (
            <span className={cn('rounded-full px-3 py-1 text-sm', hud.last === 'miss' ? 'bg-bad-soft text-bad' : hud.last === 'perfect' ? 'bg-good-soft text-good' : 'bg-warn-soft text-warn')} aria-live="polite">
              {t(`game.${hud.last}`)}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="relative h-[62vh] min-h-96 overflow-hidden rounded-[2rem] border border-line/70 bg-surface shadow-soft">
          <canvas ref={canvas} className="h-full w-full" role="img" aria-label={t('game.aria')} />
          {state === 'stopped' && (
            <div className="absolute inset-0 grid place-items-center bg-bg/70 backdrop-blur-sm">
              <div className="flex max-w-sm flex-col items-center gap-4 p-6 text-center">
                {finished ? (
                  <>
                    <p className="font-display text-4xl font-semibold">{Math.round(hud.score)}</p>
                    <p className="text-ink-soft">{t('game.summary', { pct: Math.round(accuracy * 100), combo: hud.best })}</p>
                  </>
                ) : (
                  <p className="text-lg text-ink-soft">{t('game.intro')}</p>
                )}
                <Button size="xl" icon="play" onClick={start}>
                  {finished ? t('game.again') : t('game.start')}
                </Button>
                {!micWanted && <p className="text-sm text-warn">{t('game.needMic')}</p>}
              </div>
            </div>
          )}
        </div>

        <Card className="flex flex-col items-center gap-4">
          {curFg && <WhistleView fingering={curFg.fingering} height={260} showHands={false} />}
          <p className="font-display text-5xl font-semibold">{cur?.note.pitch != null ? whistleLabel(cur.note.pitch, tune.whistle) : '-'}</p>
          <p className="text-sm text-ink-soft">{frame?.voiced && frame.note != null ? t('seq.hearing', { note: whistleLabel(frame.note, tune.whistle) }) : t('fb.silent')}</p>
          <MicControl enabled={micWanted} onChange={setMicWanted} status={status} level={frame?.level ?? 0} />
        </Card>
      </div>

      <Card className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          {t('game.tune')}
          <Select
            value={tune.id}
            onChange={(id) => {
              setTuneId(id)
              setSectionIdx(0)
            }}
            disabled={state !== 'stopped'}
            options={tunes.map((x) => ({ value: x.id, label: x.title }))}
          />
        </label>
        {tune.sections.length > 1 && (
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
            {t('tune.sections')}
            <Select value={sectionIdx} onChange={setSectionIdx} disabled={state !== 'stopped'} options={tune.sections.map((s, i) => ({ value: i, label: sectionName(s.name, lang) }))} />
          </label>
        )}
        <div className="flex items-center gap-2" role="group" aria-label={t('tune.tempo')}>
          <IconButton icon="minus" label={t('tune.slower')} onClick={() => setTempo((x) => Math.max(0.4, +(x - 0.1).toFixed(2)))} disabled={state !== 'stopped'} />
          <span className="tabular w-16 text-center font-semibold">{Math.round(tempo * 100)}%</span>
          <IconButton icon="plus" label={t('tune.faster')} onClick={() => setTempo((x) => Math.min(1.3, +(x + 0.1).toFixed(2)))} disabled={state !== 'stopped'} />
        </div>
        <div className="w-52">
          <Toggle label={t('tune.withGuide')} checked={guide} onChange={setGuide} />
        </div>
        <div className="w-44">
          <Toggle label={t('tune.metronome')} checked={metronome} onChange={setMetronome} />
        </div>
        {state !== 'stopped' && (
          <Button variant="secondary" icon="stop" onClick={() => player.stop()}>
            {t('tune.stop')}
          </Button>
        )}
      </Card>
    </div>
  )
}
