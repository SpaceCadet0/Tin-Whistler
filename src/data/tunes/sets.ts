import type { LocalizedText, Tune } from '../../music/types'
import { buildSet } from '../../music/tuneSet'
import { keshJig, strandPolka } from './beginner'
import { morrisonsJig } from './jigs'
import { maidBehindTheBar, siegeOfEnnis, silverSpear } from './sessionTunes'
import { harvestHome, offToCalifornia } from './slipJigsAndHornpipes'

/*
 * Sets: tunes strung together the way a session plays them, without a stop between. Each is built
 * from tunes already in the library, so a correction to a tune reaches its sets too.
 */
const set = (id: string, tunes: Tune[], description: LocalizedText): Tune => buildSet(tunes, { id, description, origin: 'builtin' })

export const SETS: Tune[] = [
  set('set-polkas', [strandPolka, siegeOfEnnis], {
    en: 'Your first set: two polkas back to back. Keep the beat going through the change; the second tune climbs into the second octave.',
    ru: 'Ваш первый сет: две польки подряд. Не теряйте долю на переходе; вторая мелодия поднимается во вторую октаву.',
    ga: 'Do chéad seit: dhá pholca droim le droim. Coinnigh an buille ag imeacht tríd an athrú; dreapann an dara fonn isteach sa dara hochtach.',
  }),
  set('set-jigs', [keshJig, morrisonsJig], {
    en: 'Two of the best-known session jigs: The Kesh in G, then the darker Morrison\'s in E dorian. The change of colour is the point.',
    ru: 'Две самые известные сейшен-джиги: The Kesh в соль мажоре, затем более тёмная Morrison\'s в ми дорийском. Весь смысл в смене окраски.',
    ga: 'Dhá cheann de na poirt seisiúin is cáiliúla: The Kesh in G, ansin Morrison\'s níos dorcha in E dórach. Is é athrú an datha an pointe.',
  }),
  set('set-hornpipes', [offToCalifornia, harvestHome], {
    en: 'Two hornpipes to stroll through: keep the long-short swing steady and land the three closing notes of every part.',
    ru: 'Два хорнпайпа для неспешной прогулки: держите ровный свинг «долго-коротко» и чётко ставьте три завершающие ноты каждой части.',
    ga: 'Dhá chornphíopa le siúl tríothu: coinnigh an luascadh fada-gearr seasta agus leag trí nóta deiridh gach coda.',
  }),
  set('set-reels', [silverSpear, maidBehindTheBar], {
    en: 'A reel set in D: The Silver Spear into The Maid Behind the Bar. Breathe before the change, not on it.',
    ru: 'Сет рилов в ре мажоре: The Silver Spear переходит в The Maid Behind the Bar. Вдох берите до перехода, а не на нём.',
    ga: 'Seit ríleanna in D: The Silver Spear isteach in The Maid Behind the Bar. Tarraing anáil roimh an athrú, ní air.',
  }),
]
