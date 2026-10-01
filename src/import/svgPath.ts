/** Minimal SVG path reader: splits a `d` string into glyphs and measures them. */

export interface Glyph {
  x0: number
  y0: number
  x1: number
  y1: number
  /** Number of subpaths (a hollow notehead has an outline + a hole). */
  subpaths: number
  /** First point of the glyph. */
  sx: number
  sy: number
  /** Last point reached. */
  ex: number
  ey: number
  cx: number
  cy: number
  w: number
  h: number
}

const CMD = /[MmLlHhVvCcSsQqTtAaZz]/

class Scanner {
  i = 0
  s: string
  constructor(s: string) {
    this.s = s
  }
  skip() {
    while (this.i < this.s.length && /[\s,]/.test(this.s[this.i])) this.i++
  }
  peekCmd(): string | null {
    this.skip()
    const c = this.s[this.i]
    return c && CMD.test(c) ? c : null
  }
  hasNumber(): boolean {
    this.skip()
    const c = this.s[this.i]
    return c != null && /[-+.\d]/.test(c)
  }
  num(): number {
    this.skip()
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(this.s.slice(this.i))
    if (!m) throw new Error(`Bad path number at ${this.i}`)
    this.i += m[0].length
    return Number(m[0])
  }
  flag(): number {
    this.skip()
    const c = this.s[this.i++]
    return c === '1' ? 1 : 0
  }
}

/**
 * Split a path into glyphs. Music-notation exports (MuseScore) start every glyph with an
 * absolute "M"; relative "m" inside a glyph opens a hole (e.g. a hollow notehead).
 */
export function pathGlyphs(d: string): Glyph[] {
  const sc = new Scanner(d)
  const glyphs: Glyph[] = []
  let g: Glyph | null = null
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let cmd = ''
  const add = (px: number, py: number) => {
    if (!g) return
    if (px < g.x0) g.x0 = px
    if (px > g.x1) g.x1 = px
    if (py < g.y0) g.y0 = py
    if (py > g.y1) g.y1 = py
  }
  const close = () => {
    if (!g) return
    g.ex = x
    g.ey = y
    g.w = g.x1 - g.x0
    g.h = g.y1 - g.y0
    g.cx = (g.x0 + g.x1) / 2
    g.cy = (g.y0 + g.y1) / 2
    glyphs.push(g)
  }
  while (sc.i < d.length) {
    const c = sc.peekCmd()
    if (c) {
      cmd = c
      sc.i++
    } else if (!sc.hasNumber()) break
    const rel = cmd === cmd.toLowerCase()
    switch (cmd.toUpperCase()) {
      case 'M': {
        const nx = sc.num() + (rel ? x : 0)
        const ny = sc.num() + (rel ? y : 0)
        x = nx
        y = ny
        if (cmd === 'M') {
          close()
          g = { x0: x, y0: y, x1: x, y1: y, subpaths: 1, sx: x, sy: y, ex: x, ey: y, cx: x, cy: y, w: 0, h: 0 }
        } else if (g) g.subpaths++
        startX = x
        startY = y
        add(x, y)
        cmd = rel ? 'l' : 'L'
        break
      }
      case 'L':
      case 'T':
        x = sc.num() + (rel ? x : 0)
        y = sc.num() + (rel ? y : 0)
        add(x, y)
        break
      case 'H':
        x = sc.num() + (rel ? x : 0)
        add(x, y)
        break
      case 'V':
        y = sc.num() + (rel ? y : 0)
        add(x, y)
        break
      case 'C': {
        for (let k = 0; k < 2; k++) add(sc.num() + (rel ? x : 0), sc.num() + (rel ? y : 0))
        x = sc.num() + (rel ? x : 0)
        y = sc.num() + (rel ? y : 0)
        add(x, y)
        break
      }
      case 'S':
      case 'Q': {
        add(sc.num() + (rel ? x : 0), sc.num() + (rel ? y : 0))
        x = sc.num() + (rel ? x : 0)
        y = sc.num() + (rel ? y : 0)
        add(x, y)
        break
      }
      case 'A': {
        sc.num()
        sc.num()
        sc.num()
        sc.flag()
        sc.flag()
        x = sc.num() + (rel ? x : 0)
        y = sc.num() + (rel ? y : 0)
        add(x, y)
        break
      }
      case 'Z':
        x = startX
        y = startY
        break
      default:
        sc.i++
    }
  }
  close()
  return glyphs
}

export interface SvgElement {
  tag: string
  cls: string
  d?: string
  attrs: string
}

/** Pull every classed element out of an SVG document (string-based, works outside the browser). */
export function svgElements(svg: string): SvgElement[] {
  const out: SvgElement[] = []
  for (const m of svg.matchAll(/<(path|polyline|line|rect|image)\b([^>]*?)\/?>/g)) {
    const attrs = m[2]
    const cls = /\sclass="([^"]+)"/.exec(attrs)?.[1]
    if (!cls) continue
    const d = /\sd="([^"]*)"/.exec(attrs)?.[1]
    out.push({ tag: m[1], cls, d, attrs })
  }
  return out
}
