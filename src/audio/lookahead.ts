/**
 * Look-ahead scheduling shared by the tune player and the metronome: a timer wakes every
 * LOOKAHEAD_MS and hands the audio clock everything due before `now + scheduleAhead()`.
 *
 * Browsers throttle timers in background tabs to about once a second, so a 0.15 s horizon
 * would leave gaps there. While the page is hidden the horizon grows past that interval;
 * the cost is only that a stop takes effect a little later, which nobody can see.
 */
export const LOOKAHEAD_MS = 25

const HIDDEN_AHEAD = 1.5

export function scheduleAhead(visibleAhead: number): number {
  return typeof document !== 'undefined' && document.hidden ? HIDDEN_AHEAD : visibleAhead
}

/** Run `tick` as soon as the page is hidden (to fill the longer horizon before throttling starts). Returns an unsubscribe. */
export function onHide(tick: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  const handler = () => {
    if (document.hidden) tick()
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
