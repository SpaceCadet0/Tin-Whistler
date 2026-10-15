import logoUrl from './logo.svg'

/** The app logo (same artwork as the favicon and the Android icon, source in assets/logo.svg). */
export function AppLogo({ size = 40, className }: { size?: number; className?: string }) {
  return <img src={logoUrl} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={className} />
}
