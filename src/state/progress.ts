import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACHIEVEMENTS, newlyUnlocked, type ProgressSnapshot } from '../engine/progress/achievements'
import { computeStreak, updateMastery, XP } from '../engine/progress/levels'
import { appStorage, todayKey } from '../lib/storage'
import { toast } from '../lib/toast'
import { isFiniteNumber, isRecord, sanitizeAgainst } from '../lib/validate'
import { useSettings } from './settings'

export interface NoteStat {
  attempts: number
  hits: number
  /** 0…1 moving average of recent attempts. */
  mastery: number
  /** Mean absolute tuning error of hits, cents. */
  avgCents: number
  last: number
}

export interface SectionProgress {
  bestScore: number
  bestTempo: number
  plays: number
}

export interface TuneProgress {
  /** Highest learning step reached (0…7). */
  step: number
  bestScore: number
  bestTempo: number
  plays: number
  completedFull: number
  mastered: boolean
  sections: Record<string, SectionProgress>
  lastPlayed: number
}

export interface DayRecord {
  seconds: number
  xp: number
  dailyDone: boolean
}

export interface SessionLog {
  at: number
  kind: 'lesson' | 'tune' | 'daily' | 'trainer' | 'game' | 'ear' | 'rhythm'
  label: string
  score?: number
}

export interface ProgressState {
  xp: number
  completedLessons: Record<string, { at: number; score: number }>
  noteStats: Record<string, NoteStat>
  transitions: Record<string, { attempts: number; misses: number }>
  tunes: Record<string, TuneProgress>
  days: Record<string, DayRecord>
  achievements: Record<string, number>
  ear: { attempts: number; correct: number; streak: number; best: number }
  tunerLocks: number
  gameBestCombo: number
  importedTunes: number
  log: SessionLog[]

  addXp: (amount: number, reason?: string) => void
  completeLesson: (id: string, score: number, title: string) => void
  recordNote: (noteId: string, hit: boolean, cents?: number) => void
  recordTransition: (from: string, to: string, hit: boolean) => void
  recordTune: (tuneId: string, sectionId: string | null, score: number, tempo: number, title: string) => void
  setTuneStep: (tuneId: string, step: number) => void
  addPracticeTime: (seconds: number) => void
  completeDaily: () => void
  recordEar: (correct: boolean) => void
  recordTunerLock: () => void
  recordGame: (combo: number, score: number) => void
  recordImport: () => void
  logSession: (entry: Omit<SessionLog, 'at'>) => void
  resetAll: () => void
}

const INITIAL = {
  xp: 0,
  completedLessons: {},
  noteStats: {},
  transitions: {},
  tunes: {},
  days: {},
  achievements: {},
  ear: { attempts: 0, correct: 0, streak: 0, best: 0 },
  tunerLocks: 0,
  gameBestCombo: 0,
  importedTunes: 0,
  log: [],
}

/** Keep the entries of a map that pass `ok`; one bad entry must not cost the rest of the history. */
const pickEntries = <V,>(x: Record<string, unknown>, ok: (v: unknown) => boolean): Record<string, V> =>
  Object.fromEntries(Object.entries(x).filter(([, v]) => ok(v))) as Record<string, V>

/**
 * Persisted progress with malformed fields replaced by their initial values. Maps are repaired
 * entry by entry (whatever is dropped here is gone once the store persists again).
 */
export function sanitizeProgress(persisted: unknown): Partial<typeof INITIAL> {
  const p = sanitizeAgainst(INITIAL, persisted, { ear: (x) => isRecord(x) && Object.values(x).every(isFiniteNumber) }) as Partial<ProgressState>
  if (p.completedLessons) p.completedLessons = pickEntries(p.completedLessons, isRecord)
  if (p.noteStats) p.noteStats = pickEntries(p.noteStats, isRecord)
  if (p.transitions) p.transitions = pickEntries(p.transitions, isRecord)
  if (p.days) p.days = pickEntries(p.days, isRecord)
  if (p.achievements) p.achievements = pickEntries(p.achievements, isFiniteNumber)
  if (p.tunes) {
    const tunes = pickEntries<TuneProgress>(p.tunes, isRecord)
    for (const [id, t] of Object.entries(tunes)) if (!isRecord(t.sections)) tunes[id] = { ...t, sections: {} }
    p.tunes = tunes
  }
  if (p.log) p.log = p.log.filter(isRecord)
  return p as Partial<typeof INITIAL>
}

const lang = () => useSettings.getState().language

export const MASTERED_NOTE = 0.75

export function snapshot(s: ProgressState): ProgressSnapshot {
  const tunes = Object.values(s.tunes)
  return {
    xp: s.xp,
    streak: computeStreak(new Set(Object.keys(s.days).filter((d) => s.days[d].seconds > 0 || s.days[d].xp > 0))),
    lessonsDone: Object.keys(s.completedLessons).length,
    masteredNotes: Object.values(s.noteStats).filter((n) => n.mastery >= MASTERED_NOTE && n.hits >= 5).length,
    notesPlayed: Object.values(s.noteStats).reduce((a, n) => a + n.hits, 0),
    tunesPlayed: tunes.filter((t) => t.completedFull > 0).length,
    tunesMastered: tunes.filter((t) => t.mastered).length,
    earBestStreak: s.ear.best,
    tunerLocks: s.tunerLocks,
    dailyDone: Object.values(s.days).filter((d) => d.dailyDone).length,
    gameBestCombo: s.gameBestCombo,
    importedTunes: s.importedTunes,
  }
}

const emptyTune = (): TuneProgress => ({
  step: 0,
  bestScore: 0,
  bestTempo: 0,
  plays: 0,
  completedFull: 0,
  mastered: false,
  sections: {},
  lastPlayed: 0,
})

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => {
      /** Apply a patch, credit today's activity and check achievements. */
      const commit = (patch: Partial<ProgressState> | ((s: ProgressState) => Partial<ProgressState>), xpGain = 0) => {
        set((s) => {
          const p = typeof patch === 'function' ? patch(s) : patch
          const day = todayKey()
          const today = s.days[day] ?? { seconds: 0, xp: 0, dailyDone: false }
          return {
            ...p,
            xp: (p.xp ?? s.xp) + xpGain,
            days: { ...(p.days ?? s.days), [day]: { ...today, ...(p.days?.[day] ?? {}), xp: today.xp + xpGain } },
          }
        })
        const s = get()
        const fresh = newlyUnlocked(snapshot(s), s.achievements)
        if (fresh.length) {
          const now = Date.now()
          set({ achievements: { ...s.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, now])) } })
          for (const a of fresh) toast({ kind: 'achievement', title: a.title[lang()], body: a.description[lang()], icon: a.icon })
        }
      }

      return {
        ...INITIAL,

        addXp: (amount, reason) => {
          commit({}, amount)
          if (reason) toast({ kind: 'xp', title: `+${amount} XP`, body: reason })
        },

        completeLesson: (id, score, title) => {
          const first = !get().completedLessons[id]
          const prev = get().completedLessons[id]?.score ?? 0
          commit(
            (s) => ({
              completedLessons: { ...s.completedLessons, [id]: { at: Date.now(), score: Math.max(prev, score) } },
              log: [{ at: Date.now(), kind: 'lesson' as const, label: title, score }, ...s.log].slice(0, 50),
            }),
            first ? XP.lesson : Math.round(XP.lesson / 4),
          )
        },

        recordNote: (noteId, hit, cents) =>
          commit(
            (s) => {
              const st = s.noteStats[noteId] ?? { attempts: 0, hits: 0, mastery: 0, avgCents: 0, last: 0 }
              const hits = st.hits + (hit ? 1 : 0)
              return {
                noteStats: {
                  ...s.noteStats,
                  [noteId]: {
                    attempts: st.attempts + 1,
                    hits,
                    mastery: updateMastery(st.mastery, hit),
                    avgCents: hit && cents != null ? (st.avgCents * st.hits + Math.abs(cents)) / hits : st.avgCents,
                    last: Date.now(),
                  },
                },
              }
            },
            hit ? XP.correctNote : 0,
          ),

        recordTransition: (from, to, hit) =>
          set((s) => {
            const key = `${from}>${to}`
            const t = s.transitions[key] ?? { attempts: 0, misses: 0 }
            return { transitions: { ...s.transitions, [key]: { attempts: t.attempts + 1, misses: t.misses + (hit ? 0 : 1) } } }
          }),

        recordTune: (tuneId, sectionId, score, tempo, title) => {
          const s0 = get().tunes[tuneId] ?? emptyTune()
          const full = sectionId == null
          const masteredNow = full && score >= 0.85 && tempo >= 0.99 && !s0.mastered
          const xp = masteredNow ? XP.tuneLearned : full && score >= 0.6 ? XP.tuneSection * 2 : score >= 0.6 ? XP.tuneSection : 5
          commit((s) => {
            const t = s.tunes[tuneId] ?? emptyTune()
            const sections = { ...t.sections }
            if (sectionId) {
              const sp = sections[sectionId] ?? { bestScore: 0, bestTempo: 0, plays: 0 }
              sections[sectionId] = {
                bestScore: Math.max(sp.bestScore, score),
                bestTempo: score >= 0.7 ? Math.max(sp.bestTempo, tempo) : sp.bestTempo,
                plays: sp.plays + 1,
              }
            }
            return {
              tunes: {
                ...s.tunes,
                [tuneId]: {
                  ...t,
                  sections,
                  plays: t.plays + 1,
                  completedFull: t.completedFull + (full && score >= 0.5 ? 1 : 0),
                  bestScore: full ? Math.max(t.bestScore, score) : t.bestScore,
                  bestTempo: full && score >= 0.7 ? Math.max(t.bestTempo, tempo) : t.bestTempo,
                  mastered: t.mastered || masteredNow,
                  lastPlayed: Date.now(),
                },
              },
              log: [{ at: Date.now(), kind: 'tune' as const, label: title, score }, ...s.log].slice(0, 50),
            }
          }, xp)
        },

        setTuneStep: (tuneId, step) =>
          set((s) => {
            const t = s.tunes[tuneId] ?? emptyTune()
            return { tunes: { ...s.tunes, [tuneId]: { ...t, step: Math.max(t.step, step), lastPlayed: Date.now() } } }
          }),

        addPracticeTime: (seconds) =>
          commit((s) => {
            const day = todayKey()
            const d = s.days[day] ?? { seconds: 0, xp: 0, dailyDone: false }
            return { days: { ...s.days, [day]: { ...d, seconds: d.seconds + seconds } } }
          }),

        completeDaily: () =>
          commit(
            (s) => {
              const day = todayKey()
              const d = s.days[day] ?? { seconds: 0, xp: 0, dailyDone: false }
              return {
                days: { ...s.days, [day]: { ...d, dailyDone: true } },
                log: [{ at: Date.now(), kind: 'daily' as const, label: 'Daily practice' }, ...s.log].slice(0, 50),
              }
            },
            XP.dailyPractice,
          ),

        recordEar: (correct) =>
          commit(
            (s) => {
              const streak = correct ? s.ear.streak + 1 : 0
              return {
                ear: {
                  attempts: s.ear.attempts + 1,
                  correct: s.ear.correct + (correct ? 1 : 0),
                  streak,
                  best: Math.max(s.ear.best, streak),
                },
              }
            },
            correct ? XP.earCorrect : 0,
          ),

        recordTunerLock: () => commit((s) => ({ tunerLocks: s.tunerLocks + 1 })),

        recordGame: (combo, score) =>
          commit(
            (s) => ({
              gameBestCombo: Math.max(s.gameBestCombo, combo),
              log: [{ at: Date.now(), kind: 'game' as const, label: 'Falling Notes', score }, ...s.log].slice(0, 50),
            }),
            Math.round(score * 30),
          ),

        recordImport: () => commit((s) => ({ importedTunes: s.importedTunes + 1 })),

        logSession: (entry) => set((s) => ({ log: [{ ...entry, at: Date.now() }, ...s.log].slice(0, 50) })),

        resetAll: () => set({ ...INITIAL }),
      }
    },
    {
      name: 'tw.progress',
      storage: appStorage,
      version: 1,
      // stored progress is untrusted (old schema, edited backup): keep only well-formed fields
      merge: (persisted, current) => ({ ...current, ...sanitizeProgress(persisted) }),
    },
  ),
)

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length
