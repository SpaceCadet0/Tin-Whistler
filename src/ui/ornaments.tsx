import type { CSSProperties } from 'react'

/*
 * Celtic line ornaments: single-weight strokes in currentColor, round caps, no fills except
 * dots, so they read as quiet texture at any size and follow the theme's colours.
 * Geometry is computed rather than hand-traced, so the knots stay symmetrical.
 */

interface OrnProps {
  className?: string
  style?: CSSProperties
  /** Stroke width in viewBox units (the viewBox is 100 wide). */
  weight?: number
}

const svgProps = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const
const f = (n: number) => Math.round(n * 100) / 100

/** Spiral points around (cx, cy), turning inwards, as an SVG polyline path. */
function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, start: number, dir = 1): string {
  const steps = Math.round(turns * 36)
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const k = i / steps
    const a = start + dir * k * turns * Math.PI * 2
    const r = r0 + (r1 - r0) * k
    d += `${i ? 'L' : 'M'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`
  }
  return d
}

/** Triskele: three spirals unwinding from a shared centre (the spiral from the lesson card, tripled). */
export function Triskele({ className, style, weight = 4.5, ring = false }: OrnProps & { ring?: boolean }) {
  // each arm starts at the shared centre (on its spiral's outer turn) and winds inwards
  const arm = spiral(50, 29, 21, 2.5, 1.55, Math.PI / 2)
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} strokeWidth={weight} {...svgProps}>
      <g transform={ring ? 'translate(50 50) scale(0.8) translate(-50 -50)' : 'translate(50 52) scale(1.12) translate(-50 -50)'}>
        {[0, 120, 240].map((r) => (
          <path key={r} d={arm} transform={`rotate(${r} 50 50)`} />
        ))}
      </g>
      {ring && <circle cx="50" cy="50" r="46" strokeWidth={weight * 0.6} />}
    </svg>
  )
}

/**
 * Triquetra: the three lenses where three circles of radius r (each through the others'
 * centres) overlap, optionally woven through a circle.
 */
export function Triquetra({ className, style, weight = 4, ring = true }: OrnProps & { ring?: boolean }) {
  const r = 38
  const cx = 50
  const cy = 55
  const d = r / Math.sqrt(3)
  // circle centres: bottom, upper-left, upper-right
  const c = [90, 210, 330].map((deg) => ({ x: cx + d * Math.cos((deg * Math.PI) / 180), y: cy + d * Math.sin((deg * Math.PI) / 180) }))
  const lens = (i: number, j: number, k: number) => {
    // lens of circles i & j: from centre k to the reflection of k across the i–j chord
    const mx = (c[i].x + c[j].x) / 2
    const my = (c[i].y + c[j].y) / 2
    const o = { x: 2 * mx - c[k].x, y: 2 * my - c[k].y }
    return `M${f(c[k].x)} ${f(c[k].y)} A${r} ${r} 0 0 1 ${f(o.x)} ${f(o.y)} A${r} ${r} 0 0 1 ${f(c[k].x)} ${f(c[k].y)}`
  }
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} strokeWidth={weight} {...svgProps}>
      <path d={`${lens(1, 2, 0)} ${lens(0, 1, 2)} ${lens(0, 2, 1)}`} />
      {ring && <circle cx={cx} cy={cy} r={r * 0.62} opacity={0.7} />}
    </svg>
  )
}

/** Shamrock outline: three heart leaves and a curled stem. */
export function Shamrock({ className, style, weight = 4 }: OrnProps) {
  const leaf = 'M0 0 C -3 -6 -15 -9 -15 -19 C -15 -27 -5 -29 0 -22 C 5 -29 15 -27 15 -19 C 15 -9 3 -6 0 0 Z'
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} strokeWidth={weight} {...svgProps}>
      <g transform="translate(50 50)">
        {[-90, 0, 90].map((a) => (
          <path key={a} d={leaf} transform={`rotate(${a}) translate(0 -3)`} />
        ))}
        <path d="M0 4 C 1 18 6 30 16 40" />
      </g>
    </svg>
  )
}
