import type { Tune } from '../../music/types'
import { auldLangSyne, butterfly, cooleysReel, saints, scarboroughFair } from './abcTunes'
import { amazingGrace, hotCrossBuns, keshJig, maryLamb, odeToJoy, strandPolka } from './beginner'
import {
  deckTheHalls,
  drunkenSailor,
  eineKleine,
  frereJacques,
  greensleeves,
  happyBirthday,
  jingleBells,
  joyToTheWorld,
  londonBridge,
  merryChristmas,
  michaelRow,
  minuetInG,
  morningMood,
  ohSusanna,
  oldMacDonald,
  pachelbelCanon,
  rowYourBoat,
  silentNight,
  thisOldMan,
  twinkle,
} from './popularTunes'
import { shepardsFlute } from './shepardsFlute'
import { thePrayer } from './thePrayer'

/** Curated order within each difficulty level; the list is then sorted (stably) by difficulty. */
const CURATED: Tune[] = [
  hotCrossBuns,
  maryLamb,
  twinkle,
  rowYourBoat,
  frereJacques,
  michaelRow,
  londonBridge,
  oldMacDonald,
  saints,
  odeToJoy,
  happyBirthday,
  thisOldMan,
  merryChristmas,
  joyToTheWorld,
  ohSusanna,
  deckTheHalls,
  silentNight,
  drunkenSailor,
  strandPolka,
  amazingGrace,
  auldLangSyne,
  jingleBells,
  scarboroughFair,
  eineKleine,
  morningMood,
  minuetInG,
  pachelbelCanon,
  keshJig,
  greensleeves,
  cooleysReel,
  shepardsFlute,
  thePrayer,
  butterfly,
]

/** Ordered from easiest to hardest. */
export const BUILTIN_TUNES: Tune[] = [...CURATED].sort((a, b) => a.difficulty - b.difficulty)

export const builtinTune = (id: string): Tune | undefined => BUILTIN_TUNES.find((t) => t.id === id)
