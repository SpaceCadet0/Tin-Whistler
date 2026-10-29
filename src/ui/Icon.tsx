import type { SVGProps } from 'react'
import { ICON_BOX, ICON_PATHS } from './icons/paths'

/** One hand-drawn family (src/ui/icons, traced from scripts/icons-sheet.png by scripts/trace-icons.py). */
export type IconName = keyof typeof ICON_PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  name: IconName | string
  size?: number
  filled?: boolean
}

/** How strongly a filled icon's silhouette is tinted under its drawing. */
const FILL_TINT = 0.35

export function Icon({ name, size = 22, filled, className, style }: IconProps) {
  const icon = ICON_PATHS[name] ?? ICON_PATHS.info
  return (
    <svg width={size} height={size} viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`} fill="currentColor" className={className} style={style} aria-hidden="true" focusable="false">
      {filled && icon.fill && <path d={icon.fill} opacity={FILL_TINT} />}
      <path d={icon.d} fillRule="evenodd" />
    </svg>
  )
}
