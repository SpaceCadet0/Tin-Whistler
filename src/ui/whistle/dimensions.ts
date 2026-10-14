/** Drawing size of WhistleView (its SVG viewBox). */
export const WHISTLE_W = 140
export const WHISTLE_H = 600

/** Rendered width of a WhistleView drawn at `height`, so placeholders keep the same footprint. */
export const whistleWidth = (height: number): number => (height * WHISTLE_W) / WHISTLE_H
