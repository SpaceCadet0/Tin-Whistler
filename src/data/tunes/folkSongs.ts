import { fromAbc } from './abcTunes'

/*
 * Folk songs and a shanty. The melodies come from the song transcriptions of the Irish Whistle Tabs
 * app, used with the owner's permission; whistle ornaments, articulation and breath marks
 * (!breath!) were added here. All five melodies are traditional and in the public domain.
 */

export const mollyMalone = fromAbc(
  'molly-malone',
  `X:1
T:Molly Malone
M:3/4
L:1/8
Q:1/4=150
K:G
D2 | G2 G2 G2 | G B3 GG | A2 A2 A2 | A !slide!c3
!breath!A2 | B2 A2 G2 | d2 c2 B2 | B2 A2 G2 | A4
!breath!DD | G2 G2 G2 | G B3 GG | A2 A2 A2 | A !slide!c3
!breath!AA | B d3 c2 | B d3 c2 | B3 G A2 | G4 ||
!breath!D2 | G3 G G2 | G B3 G2 | A3 A A2 | A !slide!c3
!breath!AA | B d3 c2 | B d3 c2 | B3 G A2 | G4 |]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Irish',
    sectionNames: ['Verse'],
    tags: ['song', 'irish', 'waltz time'],
    description: {
      en: "Dublin's unofficial anthem in waltz time. Repeated notes to tongue cleanly, a gentle climb to high D and a chorus you can sing along to.",
      ru: 'Неофициальный гимн Дублина в размере вальса. Повторяющиеся ноты для чёткой атаки языком, плавный подъём к верхнему D и припев, который хочется подпевать.',
    },
  },
)

export const wildRover = fromAbc(
  'wild-rover',
  `X:1
T:The Wild Rover
M:3/4
L:1/8
Q:1/4=150
K:G
G2 | G3 A G2 | E2 D2 B2 | B2 A2 B2 | c6- | c4
!breath!dd | d2 B2 d2 | c2 A2 F2 | D2 B2 A2 | G6- | G4
!breath!G2 | G2 A2 G2 | E2 D2 B2 | B2 A2 B2 | c6- | c4
!breath!Bc | d2 B2 d2 | c2 A2 F2 | D2 B2 A2 | G2 ||
!breath!F2 G2 | A2 z4 | A2 z4 | F D3 z2 | z2 z2 z2 |
z2 !breath!B2 B2 | B2 A2 B2 | c6 | z2
!breath!B2 c2 | !slide!d6- | d2 B2 G2 | F2 E4- | E4 E2 |
!breath!D2 B4- | B4 A2 | G6- | G4 |]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Irish',
    sectionNames: ['Verse and chorus'],
    tags: ['song', 'irish', 'pub'],
    description: {
      en: 'The pub singalong: a steady verse, then the "No, nay, never" chorus with its rests where everyone claps. Long held notes train your breath.',
      ru: 'Песня, которую поют всем пабом: ровный куплет и припев «No, nay, never» с паузами, где все хлопают. Длинные ноты тренируют дыхание.',
    },
  },
)

export const wellerman = fromAbc(
  'wellerman',
  `X:1
T:Soon May the Wellerman Come
M:4/4
L:1/8
Q:1/4=110
K:Emin
B2 | E2 EE E2 GG | B2 {d}B2 B2 BB | c2 AA A2 cc | ee B2 B2
!breath!B2 | E2 FF G2 AA | B2 {d}B2 B2 BB | c2 A2 GG F2 | E6 z2 |
!breath!e4 e2>c2 | dd G2 G2>G2 | c2 A2 AB c2 | B2 G2 E4 |
!breath!e4 e2 dc | dd G2 G2 G2 | B2 A2 G2 F2 | E4 z2 :|`,
  {
    difficulty: 2,
    type: 'shanty',
    composer: 'Traditional (New Zealand)',
    sectionNames: ['Verse and chorus'],
    tags: ['shanty', 'minor'],
    description: {
      en: 'The whaling shanty in E minor. Quick repeated notes on the off-beats, a cut on the long Bs and a chorus that climbs to high E.',
      ru: 'Китобойная морская песня в ми миноре. Быстрые повторяющиеся ноты на слабых долях, кат на длинных B и припев с подъёмом к верхнему E.',
    },
  },
)

export const dannyBoy = fromAbc(
  'danny-boy',
  `X:1
T:Danny Boy
M:4/4
L:1/8
Q:1/4=66
K:G
(FGA !slide!B3) (AB | ed)(BA G)E3 | (FGB !slide!d3) (ed | BG)(BA3) !breath!(FG |
A!slide!B3) (AB e)d | (BA G)E3 !breath!(FG | A!slide!B3) (cBA)G | (AG3) !breath!(def g-|
g2) {a}f(f e)d(ed | BG3) !breath!(def g-| g2) {a}f(f ed)(BA-| A2) !breath!d(dd !slide!b3) |
(aa)(ge g)d(BG-| G2) !breath!(FGA !slide!B3) | (cB)(AG A)G z2 |]`,
  {
    difficulty: 3,
    type: 'air',
    composer: 'Traditional Irish (Londonderry Air)',
    sectionNames: ['Air'],
    tags: ['air', 'irish', 'slow'],
    description: {
      en: 'The Londonderry Air, played slow and slurred. Slides into the long notes, a big climb to high G and B, and long phrases to plan your breathing.',
      ru: 'Londonderry Air, медленно и легато. Слайды на длинные ноты, большой подъём к верхним G и B и длинные фразы, в которых нужно продумать дыхание.',
    },
  },
)

export const bellaCiao = fromAbc(
  'bella-ciao',
  `X:1
T:Bella Ciao
M:4/4
L:1/8
Q:1/4=120
K:Fmin
CFG | AF3- F !breath!CFG | AF3- F !breath!CFG | A2GF A2GF | c2c2 c
!breath!cBc | dd3- ddcB | dc3- c !breath!cBA | G2c2 A2G2 | F4- F |]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Italian',
    whistle: 'C',
    sectionNames: ['Verse'],
    tags: ['song', 'italian', 'minor'],
    description: {
      en: 'The Italian partisan song, set in A minor for a C whistle so every note is a plain fingering. Short, catchy phrases with tied notes across the beat.',
      ru: 'Итальянская партизанская песня в ля миноре для C-вистла: все ноты берутся обычной аппликатурой. Короткие запоминающиеся фразы с залигованными через долю нотами.',
    },
  },
)

export const FOLK_SONGS = [mollyMalone, wildRover, wellerman, dannyBoy, bellaCiao]
