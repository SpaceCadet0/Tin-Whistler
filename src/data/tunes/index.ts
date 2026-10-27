import type { Tune } from '../../music/types'
import { AIRS_AND_MARCHES } from './airsAndMarches'
import { auldLangSyne, butterfly, cooleysReel, saints, scarboroughFair } from './abcTunes'
import { amazingGrace, hotCrossBuns, keshJig, maryLamb, odeToJoy, strandPolka } from './beginner'
import {
  bellaCiao,
  blackVelvetBand,
  blowTheManDown,
  dannyBoy,
  johnnyIHardlyKnewYe,
  leaveHerJohnny,
  mollyMalone,
  rockyRoadToDublin,
  spanishLadies,
  starOfTheCountyDown,
  wellerman,
  whiskeyInTheJar,
  wildRover,
} from './folkSongs'
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
import { SESSION_TUNES } from './sessionTunes'
import { JIGS } from './jigs'
import { aStoryYouWontBelieve } from './aStoryYouWontBelieve'
import { hope } from './hope'
import { kaerMorhen } from './kaerMorhen'
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
  mollyMalone,
  wildRover,
  wellerman,
  bellaCiao,
  leaveHerJohnny,
  spanishLadies,
  johnnyIHardlyKnewYe,
  whiskeyInTheJar,
  blackVelvetBand,
  strandPolka,
  amazingGrace,
  auldLangSyne,
  jingleBells,
  scarboroughFair,
  dannyBoy,
  blowTheManDown,
  starOfTheCountyDown,
  eineKleine,
  morningMood,
  minuetInG,
  pachelbelCanon,
  keshJig,
  greensleeves,
  cooleysReel,
  shepardsFlute,
  thePrayer,
  kaerMorhen,
  aStoryYouWontBelieve,
  hope,
  rockyRoadToDublin,
  butterfly,
  ...AIRS_AND_MARCHES,
  ...SESSION_TUNES,
  ...JIGS,
]

/** Ordered from easiest to hardest. */
export const BUILTIN_TUNES: Tune[] = [...CURATED].sort((a, b) => a.difficulty - b.difficulty)

export const builtinTune = (id: string): Tune | undefined => BUILTIN_TUNES.find((t) => t.id === id)
