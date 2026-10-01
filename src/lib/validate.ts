/**
 * Guards for data that comes back from storage or from files the user picks. Nothing read from
 * localStorage, IndexedDB or an imported file is trusted: a stale schema, a hand-edited backup
 * or a corrupted record must degrade to defaults, never crash a render.
 */

export const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

export const isFiniteNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

const kind = (x: unknown) => (Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x)

/** Per-field checks that go beyond "same type as the default" (enums, ranges, nested shapes). */
export type FieldChecks<T> = { [K in keyof T]?: (value: unknown) => boolean }

/**
 * Keep only the persisted fields that exist in `defaults`, have the same JS type and pass the
 * optional per-field check. Unknown keys and mismatches are dropped, so the caller's defaults win.
 */
export function sanitizeAgainst<T extends object>(defaults: T, persisted: unknown, checks: FieldChecks<T> = {}): Partial<T> {
  if (!isRecord(persisted)) return {}
  const out: Partial<T> = {}
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    if (!(key in persisted)) continue
    const value = persisted[key]
    const fallback = defaults[key]
    if (typeof fallback === 'function') continue
    if (kind(value) !== kind(fallback)) continue
    if (typeof value === 'number' && !Number.isFinite(value)) continue
    const check = checks[key]
    if (check && !check(value)) continue
    out[key] = value as T[typeof key]
  }
  return out
}

export const oneOf =
  <V extends string>(...values: V[]) =>
  (x: unknown): boolean =>
    typeof x === 'string' && (values as string[]).includes(x)

/**
 * A backup file exported from Settings: `{ settings?, progress? }`, each the raw string a
 * zustand persist store keeps in localStorage (`{"state":{…},"version":n}`).
 * Returns the strings that are safe to restore, or null if the file is not a backup at all.
 */
export function parseBackup(text: string): { settings?: string; progress?: string } | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(data)) return null
  const out: { settings?: string; progress?: string } = {}
  for (const key of ['settings', 'progress'] as const) {
    const raw = data[key]
    if (typeof raw !== 'string') continue
    try {
      const stored: unknown = JSON.parse(raw)
      if (isRecord(stored) && isRecord(stored.state)) out[key] = raw
    } catch {
      /* skip the unreadable half, keep the other */
    }
  }
  return out.settings || out.progress ? out : null
}
