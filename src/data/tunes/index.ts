import type { Tune } from '../../music/types'
import { auldLangSyne, butterfly, cooleysReel, saints, scarboroughFair } from './abcTunes'
import { amazingGrace, hotCrossBuns, keshJig, maryLamb, odeToJoy, strandPolka } from './beginner'
import { shepardsFlute } from './shepardsFlute'
import { thePrayer } from './thePrayer'

/** Ordered roughly from easiest to hardest. */
export const BUILTIN_TUNES: Tune[] = [
  hotCrossBuns,
  maryLamb,
  saints,
  odeToJoy,
  strandPolka,
  amazingGrace,
  auldLangSyne,
  scarboroughFair,
  keshJig,
  cooleysReel,
  shepardsFlute,
  thePrayer,
  butterfly,
]

export const builtinTune = (id: string): Tune | undefined => BUILTIN_TUNES.find((t) => t.id === id)
