import { useMemo } from 'react'
import { knownOffsets, type PlayerContext } from '../../engine/collections'
import { learnedNotes } from '../../engine/lesson/course'
import { useProgress } from '../../state/progress'
import { useSettings } from '../../state/settings'

/** A note counts as learnt once it has been played right this many times, lessons or not. */
const PLAYED_ENOUGH = 5

/** What the collections and the tune of the day know about the player: the notes they can finger. */
export function usePlayerContext(): PlayerContext {
  const level = useSettings((s) => s.level)
  const completed = useProgress((s) => s.completedLessons)
  const stats = useProgress((s) => s.noteStats)
  return useMemo(() => {
    const played = Object.keys(stats).filter((id) => stats[id].hits >= PLAYED_ENOUGH)
    return { knownOffsets: knownOffsets([...learnedNotes(completed, level), ...played]) }
  }, [completed, stats, level])
}
