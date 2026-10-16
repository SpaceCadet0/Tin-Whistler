import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useStepFooter } from './stepFooter'

/** Action buttons of a step: pinned to the bottom of the lesson screen, or in a plain row where there is no lesson footer. */
export function StepActions({ children }: { children: ReactNode }) {
  const slot = useStepFooter()
  return slot ? createPortal(children, slot) : <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
}
