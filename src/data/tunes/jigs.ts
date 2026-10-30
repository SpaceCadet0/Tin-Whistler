import { fromAbc } from './abcTunes'

/*
 * Session jigs, written out in ABC from the MIDI files in reference/abc (one played-through
 * setting each). Repeated parts are folded back into |: :| with first and second endings.
 * Old John's ties its last A into the next part in the MIDI; here that A is played again.
 */

export const blarneyPilgrim = fromAbc(
  'blarney-pilgrim',
  `X:1
T:The Blarney Pilgrim
R:jig
M:6/8
L:1/8
K:Dmix
|:DED DEG|A3 ABc|BAG AGE|GEA GED|DED DEG|A3 ABc|BAG AGE|GED D3:|
|:ded dBG|AGA BGE|ded dBG|AGA GBd|g2e dBG|AGA BGE|B2G AGE|GED D3:|
|:A2D B2D|A2D ABc|BAG AGE|GEA GED|ADD BDD|ADD ABc|BAG AGE|GED D3:|`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'mixolydian'],
    description: {
      en: 'A three-part jig in D mixolydian, the flattened C giving it its old-world sound. The C part bounces off low D between every melody note.',
      ru: 'Джиг из трёх частей в ре миксолидийском: C натуральное придаёт ему старинное звучание. В третьей части мелодия отталкивается от нижнего D после каждой ноты.',
      ga: 'Port trí chuid i D micsileidiach, an C maolaithe ag tabhairt a fhuaime seanaimseartha dó. Preabann cuid C de D íseal idir gach nóta séise.',
    },
  },
)

export const outOnTheOcean = fromAbc(
  'out-on-the-ocean',
  `X:1
T:Out on the Ocean
R:jig
M:6/8
L:1/8
K:Gmaj
|:B3 BAG|BdB A2B|GED G2A|BdB AGA|B3 BAG|BdB A2B|GED G2A|1 BGF G2A:|2 BGF GBd||
|:ege edB|ege edB|d2d def|gfe dBA|G2A B2d|ege dBA|GED G2A|1 BGF GBd:|2 BGF G3|]`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session'],
    description: {
      en: 'A sunny G-major jig with long held Bs to settle into. The B part climbs to high G and rolls back down through the scale.',
      ru: 'Солнечный джиг в соль мажоре с длинными B, на которых можно устроиться. Вторая часть поднимается к верхнему G и скатывается обратно по гамме.',
      ga: 'Port grianmhar G mór le B fada coinnithe le socrú isteach iontu. Dreapann cuid B go G ard agus rollann sé anuas arís tríd an scála.',
    },
  },
)

export const liltingBanshee = fromAbc(
  'lilting-banshee',
  `X:1
T:The Lilting Banshee
R:jig
M:6/8
L:1/8
K:Ador
|:EAA EAA|BAB G2A|Bee edB|def gfg|eAA eAA|BAB G2A|Bee edB|1 dBA A3:|2 dBA A2d||
|:eaa age|dBA G2A|Bee edB|def gfg|eaa age|dBA G2A|Bee edB|1 dBA A2d:|2 dBA A3|]`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'An A dorian jig that swings between low E and A, then answers an octave higher in the B part. Plenty of repeated As to practise clean tonguing.',
      ru: 'Джиг в ля дорийском, который качается между нижними E и A, а во второй части отвечает октавой выше. Много повторяющихся A для чёткой атаки языком.',
      ga: 'Port A dórach a luascann idir E íseal agus A, ansin freagraíonn sé ochtach níos airde i gcuid B. Neart A athráite chun teangú glan a chleachtadh.',
    },
  },
)

export const morrisonsJig = fromAbc(
  'morrisons-jig',
  `X:1
T:Morrison's Jig
R:jig
M:6/8
L:1/8
K:Edor
|:E3 B3|EBE AFD|EDE B3|dcB AFD|E3 B3|EBE AFD|G3 FGA|dAG FED:|
Bee fee|aee fee|Bee fee|a2g fed|Bee fee|aee fee|gfe d2A|BAG FGA|
Bee fee|aee fee|Bee fee|faf def|g3 gfe|def g2d|edc d2A|BAG FED|]`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'One of the most played jigs: an E dorian A part built on long low Es and Bs, and a B part that hammers out high E with every turn.',
      ru: 'Один из самых играемых джигов: первая часть в ми дорийском на длинных нижних E и B, вторая раз за разом отбивает верхнее E.',
      ga: 'Ceann de na poirt is mó a sheinntear: cuid A in E dórach tógtha ar E agus B fada ísle, agus cuid B a bhuaileann E ard amach le gach casadh.',
    },
  },
)

export const banishMisfortune = fromAbc(
  'banish-misfortune',
  `X:1
T:Banish Misfortune
R:jig
M:6/8
L:1/8
K:Dmix
|:fed cAG|A2d cAG|F2D DED|FEF GFG|AGA cAG|AGA cde|fed cAG|Ad^c d3:|
|:f2d d^cd|f2g agf|e2c cBc|e2f gfe|f2g agf|e2f gfe|fed cAG|Ad^c d3:|
|:f2g e2f|d2e c2d|ABA GAG|F2F GED|c3 cAG|AGA cde|fed cAG|Ad^c d3:|`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'mixolydian'],
    description: {
      en: 'A three-part jig in D mixolydian that switches between C natural and C sharp, a good workout for the cross-fingered C.',
      ru: 'Джиг из трёх частей в ре миксолидийском, где C натуральное чередуется с C диезом: хорошая тренировка вилочного C.',
      ga: 'Port trí chuid i D micsileidiach a athraíonn idir C nádúrtha agus C géar, cleachtadh maith don C crosmhéaraithe.',
    },
  },
)

export const connaughtmansRambles = fromAbc(
  'connaughtmans-rambles',
  `X:1
T:The Connaughtman's Rambles
R:jig
M:6/8
L:1/8
K:Dmaj
|:FAA dAA|BAA dAG|FAA dfe|dBB BAG|FAA dAA|BAA def|gfe dfe|1 dBB BAG:|2 dBB B3||
|:fbb faf|fed ede|fbb faf|fed e3|fbb faf|fed def|gfe dfe|1 dBB B3:|2 dBB BAG|]`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session'],
    description: {
      en: 'A favourite D-major jig that leans towards B minor. The A part rocks on repeated As, the B part reaches up to high B.',
      ru: 'Любимый джиг в ре мажоре с уклоном в си минор. Первая часть покачивается на повторяющихся A, вторая тянется к верхнему B.',
      ga: 'Port ceanúil D mór a chlaonann i dtreo B mion. Luascann cuid A ar A athráite, síneann cuid B suas go B ard.',
    },
  },
)

export const oldJohns = fromAbc(
  'old-johns',
  `X:1
T:Old John's
R:jig
M:6/8
L:1/8
K:Ador
|:e/d/cA AcA|AGE FGA|BcA AA2|GAd dde|dcA AcA|AGE FGA|Bcd ee2|BcA AA2:|
|:Aef gea|age dcA|Aef gea|aba ga2-|aef gea|age dcA|Acd ee2|dcA AA2:|`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'An A dorian jig that opens with a quick pair of sixteenths. The B part climbs to high A and B, with C naturals to cross-finger.',
      ru: 'Джиг в ля дорийском, который начинается с быстрой пары шестнадцатых. Вторая часть поднимается к верхним A и B, с вилочным C натуральным.',
      ga: 'Port A dórach a osclaíonn le péire tapa séú nótaí déag. Dreapann cuid B go A agus B arda, le C nádúrtha le crosmhéarú.',
    },
  },
)

export const blackthornStick = fromAbc(
  'blackthorn-stick',
  `X:1
T:The Blackthorn Stick
R:jig
M:6/8
L:1/8
K:Gmaj
dBA GE2|GD2 DEG|GG2 DGA|Bc2 cBA|GBd BA2|DGA Bc2|cBA GBd|ded cBA|
GEG EDB,|DEG GG2|DGA Bc2|cBA GBd|ded cBA|GEG EDB,|DEG GG2|]`,
  {
    difficulty: 2,
    transpose: 0,
    composer: 'Traditional Irish',
    sectionNames: ['Tune'],
    tags: ['irish', 'jig'],
    description: {
      en: 'A short, gentle G-major jig in the low octave, with long Gs and Cs to rest on. A good first jig to get the lilting 6/8 feel; the two low Bs below the whistle are played an octave up.',
      ru: 'Короткий спокойный джиг в соль мажоре в нижней октаве, с длинными G и C, на которых можно отдохнуть. Хороший первый джиг, чтобы поймать качающийся ритм 6/8; два низких B ниже вистла играются октавой выше.',
      ga: 'Port gearr séimh G mór san ochtach íseal, le G agus C fada le scíth a ligean orthu. Céad phort maith chun mothú luascach 6/8 a fháil; seinntear an dá B íseal faoi raon na feadóige ochtach suas.',
    },
  },
)

export const JIGS = [
  blackthornStick,
  outOnTheOcean,
  blarneyPilgrim,
  liltingBanshee,
  connaughtmansRambles,
  morrisonsJig,
  banishMisfortune,
  oldJohns,
]
