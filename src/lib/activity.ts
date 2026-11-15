/**
 * When the player last did something: a note heard by the mic, a tune playing, a tap or a key.
 * Practice time is credited from this, so a screen left open does not count as practising.
 */
let lastActivity = 0

/** How long after the last sign of playing the time still counts (a breath, reading the next step). */
export const ACTIVITY_GRACE_MS = 15_000

export const markActivity = (at = Date.now()): void => {
  lastActivity = at
}

/** Milliseconds of `from`…`to` that count as practice: up to the grace period past the last activity. */
export function activeMs(from: number, to: number, last = lastActivity): number {
  return Math.max(0, Math.min(to, last + ACTIVITY_GRACE_MS) - from)
}
