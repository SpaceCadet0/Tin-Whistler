import { fromAbc } from './abcTunes'

/*
 * Slip jigs and hornpipes, written out in ABC from the MIDI files in reference/abc (one played-through
 * setting each). Repeated parts are folded back into |: :|. The hornpipes are written in even
 * eighths, as session ABC usually is; the MIDI swings them long-short, at a hornpipe's
 * easier 110 beats a minute. The King of the Fairies dips
 * to the B below the whistle's D twice: here that B is played an octave up.
 */

export const kidOnTheMountain = fromAbc(
  'kid-on-the-mountain',
  `X:1
T:The Kid on the Mountain
R:slip jig
M:9/8
L:1/8
K:Emin
|:~E3 FEF G2F|~E3 BcA BGD|~E3 FEF G2A|BAG FAG FED:|
|:BGB AFD G2D|GAB dge dBA|BGB AFA G2A|BAG FAG FED:|
|:~g3 eBe e2f|~g3 efg afd|~g3 eBe g2a|bag fag fed:|
|:eB/B/B e2f ~g3|eB/B/B efg afd|eB/B/B e2f g2a|bag fag fed:|
|:edB dBA G2D|GAB dge dBA|edB dBA G2A|BAG FAG FED:|`,
  {
    difficulty: 4,
    type: 'slip-jig',
    composer: 'Traditional Irish',
    tags: ['irish', 'slip jig', 'session'],
    description: {
      en: 'A five-part slip jig in E minor that keeps coming back to the same tumbling run down to low D. Rolls on E and high G, and a climb to high B in the third part.',
      ru: 'Слип-джиг из пяти частей в ми миноре: каждая часть возвращается к одной и той же пробежке вниз к нижнему D. Роллы на E и верхнем G, а в третьей части подъём к верхнему B.',
      ga: 'Port luascach cúig chuid in E mion a fhilleann arís agus arís ar an rith céanna ag titim síos go D íseal. Rolls ar E agus G ard, agus dreapadh go B ard sa tríú cuid.',
    },
  },
)

export const figForAKiss = fromAbc(
  'fig-for-a-kiss',
  `X:1
T:A Fig for a Kiss
R:slip jig
M:9/8
L:1/8
K:Edor
|:G2B E2B BAG|F2A D2A AGF|G2B E2B BAG|BdB AGF E3:|
|e2d e2f afd|e2f g2a bag|e2d e2f gfe|dcB AGF E3|e2f g2a bag|f2d d2f agf|bag agf gfe|dcB AGF E3|]`,
  {
    difficulty: 3,
    type: 'slip-jig',
    composer: 'Traditional Irish',
    tags: ['irish', 'slip jig', 'session', 'dorian'],
    description: {
      en: 'A gentle slip jig in E dorian. Long notes on the beat leave time to breathe, and the second part rises to high B before stepping back down to E.',
      ru: 'Спокойный слип-джиг в ми дорийском. Длинные ноты на сильных долях оставляют время на вдох, а вторая часть поднимается к верхнему B и по ступеням спускается обратно к E.',
      ga: 'Port luascach séimh in E dórach. Fágann nótaí fada ar an mbuille am chun anáil a tharraingt, agus ardaíonn an dara cuid go B ard sula siúlann sé síos arís go E.',
    },
  },
)

export const offToCalifornia = fromAbc(
  'off-to-california',
  `X:1
T:Off to California
R:hornpipe
M:4/4
L:1/8
Q:1/4=110
K:Gmaj
|:(3DEF GF GB AG|EDGB dge2|(3def gf gd ed|BGAB AGE2|(3DEF GF GB AG|EDGB dge2|(3def gf gd ed|BGAB EFG2:|
|:(3def gf eg fe|df ed ef ed|Bd gf gd ed|BGAB AGE2|(3DEF GF GB AG|EDGB dge2|(3def gf gd ed|BGAB EFG2:|`,
  {
    difficulty: 3,
    type: 'hornpipe',
    composer: 'Traditional Irish',
    tags: ['irish', 'hornpipe', 'session'],
    description: {
      en: 'A favourite first hornpipe, in G major. Each phrase opens with a quick triplet run-up; play the pairs of eighths long-short for the hornpipe lilt.',
      ru: 'Любимый первый хорнпайп, в соль мажоре. Каждая фраза начинается с быстрого разбега триолью; пары восьмых играйте «длинная-короткая», чтобы хорнпайп покачивался.',
      ga: 'Céad chornphíopa ceanúil, i G mór. Osclaíonn gach frása le rith suas tapa tréimhse; seinn na péirí ochtú nótaí fada-gearr do luascadh an chornphíopa.',
    },
  },
)

export const harvestHome = fromAbc(
  'harvest-home',
  `X:1
T:The Harvest Home
R:hornpipe
M:4/4
L:1/8
Q:1/4=110
K:Dmaj
|:AF DA FA DA|FA de fe dc|BA eA fA gA|fA (3efe (3dcB AG|FE DA FA DA|FA de fe dc|BA eA fA gf|ec d2 f2 d2:|
|:cd eA AA fA|AA gA fA eA|AA eA fA gA|fA (3efe (3dcB (3ABA|(3GFE DA FA DA|FA de fe dc|BA eA fA gf|ec d2 f2 d2:|`,
  {
    difficulty: 4,
    type: 'hornpipe',
    composer: 'Traditional Irish',
    tags: ['irish', 'hornpipe', 'session'],
    description: {
      en: 'A bright D-major hornpipe built on arpeggios that keep bouncing off the A. The second part is a test of quick fingers: an A between every melody note and triplets rolling down.',
      ru: 'Яркий хорнпайп в ре мажоре на арпеджио, которые всё время отталкиваются от A. Вторая часть проверяет беглость пальцев: A между каждой нотой мелодии и скатывающиеся вниз триоли.',
      ga: 'Cornphíopa geal D mór tógtha ar airpéisí a phreabann de A arís agus arís. Is triail ar mhéara tapa an dara cuid: A idir gach nóta séise agus tréimhsí ag rolladh anuas.',
    },
  },
)

export const rightsOfMan = fromAbc(
  'rights-of-man',
  `X:1
T:The Rights of Man
R:hornpipe
M:4/4
L:1/8
Q:1/4=110
K:Emin
|:GABc ABGA|FGEF GAB2|efgf eded|BdcB AGA2|GABc ABGA|FGEF GAB2|efgf edBg|fge2 E2E2:|
|:gaba bgef|gaba bgeg|fed2 d^cde|fgaf dfa2|gfed efgf|gabg afgf|efgf edBg|fge2 E2E2:|`,
  {
    difficulty: 3,
    type: 'hornpipe',
    composer: 'Traditional Irish',
    tags: ['irish', 'hornpipe', 'session'],
    description: {
      en: 'A stately E-minor hornpipe with smooth stepwise lines. Mind the C: natural (half-hole) in the first part, sharp in the second.',
      ru: 'Величавый хорнпайп в ми миноре с плавными ступенчатыми линиями. Следите за C: в первой части оно натуральное (полуотверстие), во второй диезное.',
      ga: 'Cornphíopa maorga E mion le línte réidhe céimnithe. Bí aireach ar an C: nádúrtha (leathpholl) sa chéad chuid, géar sa dara cuid.',
    },
  },
)

export const kingOfTheFairies = fromAbc(
  'king-of-the-fairies',
  `X:1
T:The King of the Fairies
R:hornpipe
M:4/4
L:1/8
Q:1/4=110
K:Edor
|:B2ED EFGF|GAB=c BAGF|GAB2 E2EF|GEFG FED2|B2ED EFGF|GABA GBd2|d=cB2 E2GF|EDE6:|
|:d2e2 B2Bd|efga gfed|efe2 B2BA|Bcde dcBc|dBe2 B2Bd|efga gfef|edBd egfe|dfe6|
efg3 ef2-|fded Bcd2-|dedB AFGA|BcdB AFGF|EDB2 E2EF|GAB2 e2ed|efe2 B2BA|GFE6:|`,
  {
    difficulty: 4,
    type: 'hornpipe',
    composer: 'Traditional Irish',
    tags: ['irish', 'hornpipe', 'session', 'dorian'],
    description: {
      en: 'A dark, majestic set dance in E dorian. The first part uses C natural (half-hole), the long second part C sharp, with notes tied over the bar line.',
      ru: 'Тёмный величественный сет-данс в ми дорийском. В первой части C натуральное (полуотверстие), в длинной второй части C диез, и ноты залигованы через тактовую черту.',
      ga: 'Damhsa seit dorcha maorga in E dórach. Úsáideann an chéad chuid C nádúrtha (leathpholl), an dara cuid fhada C géar, le nótaí ceangailte thar líne an bharra.',
    },
  },
)

export const SLIP_JIGS_AND_HORNPIPES = [kidOnTheMountain, figForAKiss, offToCalifornia, harvestHome, rightsOfMan, kingOfTheFairies]
