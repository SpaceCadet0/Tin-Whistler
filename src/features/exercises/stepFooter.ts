import { createContext, useContext } from 'react'

/**
 * The pinned button area at the bottom of a lesson screen. LessonPlayer provides its element; steps
 * put their action buttons there through <StepActions>, so on a phone the buttons never scroll away.
 * Outside a lesson (daily practice, trainers) there is no slot and the buttons stay where they are.
 */
export const StepFooterContext = createContext<HTMLElement | null>(null)

export const useStepFooter = (): HTMLElement | null => useContext(StepFooterContext)
