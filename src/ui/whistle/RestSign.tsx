/**
 * A quarter rest, drawn: the 𝄽 character is missing from many phone fonts and turns into a stack of
 * bars there.
 */
export function RestSign({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size * 0.45} height={size} viewBox="0 0 13 29" className={className} aria-hidden="true">
      <path d="M4 1.5 9.6 8.6 Q6.6 11.6 5.8 13.6 L10.4 20.4 Q6.6 18.6 4.6 20.8 Q3.4 23.4 6.6 27.4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.6 2 Q8.8 6.6 9.8 8.6 Q7.2 11 6 13.8 L4.6 11.6 Q6.6 9.4 7.2 8.4 Z" fill="currentColor" />
      <path d="M6 13 10.4 20.4 Q8.2 19.8 7 20 Z" fill="currentColor" />
    </svg>
  )
}
