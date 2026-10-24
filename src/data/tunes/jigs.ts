import { fromAbc } from './abcTunes'

/*
 * Session jigs, written out in ABC from the MIDI files in reference/abc (one played-through
 * setting each). Repeated parts are folded back into |: :| with first and second endings.
 * The MIDI has no ornaments; rolls, cuts, taps and slides were added in the usual places:
 * rolls on long notes, cuts on repeated notes, taps on the bottom D, slides into F#.
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
|:D{g}ED DEG|~A3 ABc|BAG A{c}GE|GEA GED|D{g}ED DEG|~A3 ABc|BAG A{c}GE|GED D3:|
|:d{g}ed dBG|AGA BGE|d{g}ed dBG|AGA GBd|~g2e dBG|AGA BGE|~B2G A{c}GE|GED D3:|
|:A2!tap!D B2!tap!D|A2!tap!D ABc|BAG A{c}GE|GEA GED|A!tap!DD B!tap!DD|A!tap!DD ABc|BAG A{c}GE|GED D3:|`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'mixolydian'],
    description: {
      en: 'A three-part jig in D mixolydian, the flattened C giving it its old-world sound. The C part bounces off low D between every melody note.',
      ru: 'Джиг из трёх частей в ре миксолидийском: C натуральное придаёт ему старинное звучание. В третьей части мелодия отталкивается от нижнего D после каждой ноты.',
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
|:~B3 BAG|BdB ~A2B|GED ~G2A|BdB AGA|~B3 BAG|BdB ~A2B|GED ~G2A|1 BGF G2A:|2 BGF GBd||
|:ege {a}edB|ege {a}edB|~d2d def|gfe dBA|~G2A ~B2d|ege dBA|GED ~G2A|1 BGF GBd:|2 BGF G3|]`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session'],
    description: {
      en: 'A sunny G-major jig with long held Bs to settle into. The B part climbs to high G and rolls back down through the scale.',
      ru: 'Солнечный джиг в соль мажоре с длинными B, на которых можно устроиться. Вторая часть поднимается к верхнему G и скатывается обратно по гамме.',
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
|:E{c}AA E{c}AA|BAB ~G2A|B{g}ee edB|def gfg|e{c}AA e{c}AA|BAB ~G2A|B{g}ee edB|1 dBA ~A3:|2 dBA A2d||
|:e{b}aa age|dBA ~G2A|B{g}ee edB|def gfg|e{b}aa age|dBA ~G2A|B{g}ee edB|1 dBA A2d:|2 dBA ~A3|]`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'An A dorian jig that swings between low E and A, then answers an octave higher in the B part. Plenty of repeated As to practise clean tonguing.',
      ru: 'Джиг в ля дорийском, который качается между нижними E и A, а во второй части отвечает октавой выше. Много повторяющихся A для чёткой атаки языком.',
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
|:~E3 B3|EBE A!slide!FD|EDE ~B3|dcB AFD|~E3 B3|EBE A!slide!FD|~G3 FGA|dAG FED:|
B{g}ee fee|a{g}ee fee|B{g}ee fee|a2g fed|B{g}ee fee|a{g}ee fee|gfe ~d2A|BAG FGA|
B{g}ee fee|a{g}ee fee|B{g}ee fee|faf def|~g3 gfe|def ~g2d|edc ~d2A|BAG FED|]`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'One of the most played jigs: an E dorian A part built on long low Es and Bs, and a B part that hammers out high E with every turn.',
      ru: 'Один из самых играемых джигов: первая часть в ми дорийском на длинных нижних E и B, вторая раз за разом отбивает верхнее E.',
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
|:fed cAG|~A2d cAG|!slide!F2D D{g}ED|FEF GFG|AGA cAG|AGA cde|fed cAG|Ad^c d3:|
|:~f2d d^cd|f2g agf|~e2c cBc|e2f gfe|~f2g agf|e2f gfe|fed cAG|Ad^c d3:|
|:f2g e2f|d2e c2d|A{c}BA G{A}AG|!slide!F2F GED|{d}c3 cAG|AGA cde|fed cAG|Ad^c d3:|`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'mixolydian'],
    description: {
      en: 'A three-part jig in D mixolydian that switches between C natural and C sharp, a good workout for the cross-fingered C.',
      ru: 'Джиг из трёх частей в ре миксолидийском, где C натуральное чередуется с C диезом: хорошая тренировка вилочного C.',
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
|:F{c}AA d{c}AA|BAA dAG|F{c}AA dfe|d{e}BB BAG|F{c}AA d{c}AA|BAA def|gfe dfe|1 d{e}BB BAG:|2 d{e}BB ~B3||
|:fbb faf|fed ede|fbb faf|fed ~e3|fbb faf|fed def|gfe dfe|1 d{e}BB ~B3:|2 d{e}BB BAG|]`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session'],
    description: {
      en: 'A favourite D-major jig that leans towards B minor. The A part rocks on repeated As, the B part reaches up to high B.',
      ru: 'Любимый джиг в ре мажоре с уклоном в си минор. Первая часть покачивается на повторяющихся A, вторая тянется к верхнему B.',
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
|:e/d/cA {c}AcA|AGE FGA|BcA {c}AA2|GAd {e}dde|dcA {c}AcA|AGE FGA|Bcd e~e2|BcA {c}AA2:|
|:Aef gea|age dcA|Aef gea|aba ga2-|aef gea|age dcA|Acd e~e2|dcA {c}AA2:|`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'An A dorian jig that opens with a quick pair of sixteenths. The B part climbs to high A and B, with C naturals to cross-finger.',
      ru: 'Джиг в ля дорийском, который начинается с быстрой пары шестнадцатых. Вторая часть поднимается к верхним A и B, с вилочным C натуральным.',
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
dBA GE2|GD2 DEG|G~G2 DGA|Bc2 cBA|GBd B~A2|DGA Bc2|cBA GBd|ded cBA|
GEG EDB,|DEG G~G2|DGA Bc2|cBA GBd|ded cBA|GEG EDB,|DEG G~G2|]`,
  {
    difficulty: 2,
    transpose: 0,
    composer: 'Traditional Irish',
    sectionNames: ['Tune'],
    tags: ['irish', 'jig'],
    description: {
      en: 'A short, gentle G-major jig in the low octave, with long Gs and Cs to rest on. A good first jig to get the lilting 6/8 feel; the two low Bs below the whistle are played an octave up.',
      ru: 'Короткий спокойный джиг в соль мажоре в нижней октаве, с длинными G и C, на которых можно отдохнуть. Хороший первый джиг, чтобы поймать качающийся ритм 6/8; два низких B ниже вистла играются октавой выше.',
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
