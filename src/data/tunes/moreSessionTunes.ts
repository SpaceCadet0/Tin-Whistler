import { fromAbc } from './abcTunes'

/*
 * More session standards: polka, jigs, reels, a Carolan waltz and a Scottish song. Traditional
 * melodies written out from memory in their usual session settings (not copied from a
 * collection), so each is worth a listen against a recording you trust.
 */

export const johnRyansPolka = fromAbc(
  'john-ryans-polka',
  `X:1
T:John Ryan's Polka
R:polka
M:2/4
L:1/8
K:Dmaj
|:dd B/c/d/B/|AF AF|dd B/c/d/B/|AF ED|dd B/c/d/B/|AF Ad/e/|fd ec|d2 d2:|
|:fd de/f/|gf ed/e/|fd Ad|fd/f/ a2|fd de/f/|gf ed/e/|fd ec|d2 d2:|`,
  {
    difficulty: 2,
    composer: 'Traditional Irish',
    tags: ['irish', 'polka', 'session'],
    description: {
      en: 'The polka everyone learns first: two repeated Ds, a quick run and a rocking A–F#. The second part reaches high A just once.',
      ru: 'Полька, которую все учат первой: два повторных D, быстрая пробежка и покачивание A–F#. Вторая часть лишь раз поднимается к верхнему A.',
      ga: 'An polca a fhoghlaimíonn gach duine ar dtús: dhá D arís, rith tapa agus luascadh A–F#. Ní shroicheann an dara cuid A ard ach uair amháin.',
    },
  },
)

export const irishWasherwoman = fromAbc(
  'irish-washerwoman',
  `X:1
T:The Irish Washerwoman
R:jig
M:6/8
L:1/8
K:Gmaj
|:BGG DGG|BGB dcB|cAA EAA|cAc edc|BGG DGG|BGB dcB|cBc Adc|1 BGG G2A:|2 BGG G2g||
|:gdg gdg|gdg bag|fdf fdf|fdf agf|egg dgg|cgg B2B|cBc Adc|1 BGG G2g:|2 BGG G3|]`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session'],
    description: {
      en: 'Perhaps the best-known jig in the world. Broken chords tumbling down in threes; the second part starts on high G and touches high B.',
      ru: 'Пожалуй, самая известная джига в мире. Разложенные аккорды скатываются тройками; вторая часть начинается с верхнего G и задевает верхнее B.',
      ga: 'An port is cáiliúla ar domhan, b’fhéidir. Cordaí briste ag titim ina dtríonna; tosaíonn an dara cuid ar G ard agus buaileann sí B ard.',
    },
  },
)

export const swallowtailJig = fromAbc(
  'swallowtail-jig',
  `X:1
T:The Swallowtail Jig
R:jig
M:6/8
L:1/8
K:Edor
|:GEE BEE|GEE BAG|FDD ADD|dcd AGF|GEE BEE|GEG B2c|dcd AGF|GEE E3:|
|:Bcd e2f|e2f edB|Bcd e2f|edB d3|Bcd e2f|e2f edB|dcd AGF|GEE E3:|`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'A dark, driving jig in E dorian. The first part rocks between E and D chords; the second climbs to high F# and falls back.',
      ru: 'Тёмная напористая джига в ми дорийском. Первая часть качается между аккордами E и D; вторая поднимается к верхнему F# и опадает.',
      ga: 'Port dorcha tiomána in E dórach. Luascann an chéad chuid idir cordaí E agus D; dreapann an dara cuid go F# ard agus titeann ar ais.',
    },
  },
)

export const trippingUpTheStairs = fromAbc(
  'tripping-up-the-stairs',
  `X:1
T:Tripping Up the Stairs
R:jig
M:6/8
L:1/8
K:Dmaj
|:FAA GBB|FAd fed|cBc ABc|dfe dAG|FAA GBB|FAd fed|cBc ABc|1 dfe d2A:|2 dfe d2c||
|:dBB fBB|fgf fed|cAA eAA|efe edc|dBB fBB|fgf fed|cBc ABc|dfe d3:|`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session'],
    description: {
      en: 'A sunny jig in D that really does trip upwards. Repeated pairs (A–A, B–B) are the place for your first cuts.',
      ru: 'Солнечная джига в ре мажоре, которая и правда «взбегает по лестнице». Повторные пары (A–A, B–B) — место для первых cut.',
      ga: 'Port grianmhar in D a ritheann suas an staighre dáiríre. Is iad na péirí athuaire (A–A, B–B) an áit do do chéad cuts.',
    },
  },
)

export const roadToLisdoonvarna = fromAbc(
  'road-to-lisdoonvarna',
  `X:1
T:The Road to Lisdoonvarna
R:jig
M:6/8
L:1/8
K:Edor
|:E2B B2A|B2c d3|F2A ABA|D2E FED|E2B B2A|B2c d3|cdc B2A|B2E E3:|
|:e2f gfe|d2B Bcd|c2A ABc|d2B B3|e2f gfe|d2B Bcd|cdc B2A|B2E E3:|`,
  {
    difficulty: 2,
    composer: 'Traditional Irish',
    tags: ['irish', 'jig', 'session', 'dorian'],
    description: {
      en: 'A gentle single jig full of long-short pairs, easy on the fingers. A good first tune in the jig rhythm.',
      ru: 'Мягкая одинарная джига из пар «долго-коротко», удобная для пальцев. Хорошая первая мелодия в ритме джиги.',
      ga: 'Port singil séimh lán de phéirí fada-gearr, éasca ar na méara. Céad fhonn maith i rithim an phoirt.',
    },
  },
)

export const merryBlacksmith = fromAbc(
  'merry-blacksmith',
  `X:1
T:The Merry Blacksmith
R:reel
M:4/4
L:1/8
K:Dmaj
|:d2 dA BAFA|ABdA BAFA|ABde f2 ed|Beed egfe|d2 dA BAFA|ABdA BAFA|ABde fdec|dBAF D4:|
|:a2 ag f2 fe|d2 dA BAFA|ABde f2 ed|Beed egfe|a2 ag f2 fe|d2 dA BAFA|ABde fdec|dBAF D4:|`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session'],
    description: {
      en: 'A friendly first reel: most of both parts is the same music, so there is half as much to learn. Starts on high D and ends on a long low one.',
      ru: 'Дружелюбный первый рил: большая часть обеих частей совпадает, так что учить вдвое меньше. Начинается с верхнего D и кончается длинным нижним.',
      ga: 'Céad ríl chairdiúil: is é an ceol céanna formhór an dá chuid, mar sin tá leath an oiread le foghlaim. Tosaíonn sé ar D ard agus críochnaíonn ar cheann fada íseal.',
    },
  },
)

export const missMcLeodsReel = fromAbc(
  'miss-mcleods-reel',
  `X:1
T:Miss McLeod's Reel
R:reel
M:4/4
L:1/8
K:Gmaj
|:G2 BG dGBG|B2 BA BcBA|G2 BG dGBG|A2 AG AcBA:|
|:G2 gf edeg|B2 BA BcBA|G2 gf edeg|a2 ag agef|g2 gf edeg|B2 BA BcBA|G2 BG dGBG|A2 AG AcBA:|`,
  {
    difficulty: 3,
    composer: 'Traditional Scottish / Irish',
    tags: ['irish', 'scottish', 'reel', 'session'],
    description: {
      en: 'A bright reel in G known on both sides of the Irish Sea. Needs C natural: cover holes 2 and 3 and leave the top one open.',
      ru: 'Яркий рил в соль мажоре, известный по обе стороны Ирландского моря. Нужно до-бекар: закройте 2-е и 3-е отверстия, верхнее оставьте открытым.',
      ga: 'Ríl gheal in G a bhfuil aithne uirthi ar dhá thaobh Mhuir Éireann. Teastaíonn C nádúrtha: clúdaigh poill 2 agus 3 agus fág an ceann uachtair oscailte.',
    },
  },
)

export const soldiersJoy = fromAbc(
  'soldiers-joy',
  `X:1
T:Soldier's Joy
R:reel
M:4/4
L:1/8
K:Dmaj
FG|:AFDF AFDF|A2 d2 d2 cB|AFDF AFDF|G2 E2 E2 FG|AFDF AFDF|A2 d2 d2 de|fafd egec|1 d2 d2 d2 FG:|2 d2 d2 d2 de||
|:f2 fe fgaf|e2 ed efge|f2 fe fgaf|edcB A2 de|f2 fe fgaf|e2 ed efge|fafd egec|1 d2 d2 d2 de:|2 d2 d2 d4|]`,
  {
    difficulty: 3,
    composer: 'Traditional',
    tags: ['irish', 'scottish', 'reel', 'session'],
    description: {
      en: 'A reel played from Scotland to Appalachia. The first part rocks on the D chord; the second runs up and down the scale to high A.',
      ru: 'Рил, который играют от Шотландии до Аппалачей. Первая часть раскачивается на аккорде D; вторая бегает по гамме до верхнего A.',
      ga: 'Ríl a sheinntear ó Albain go dtí na hApaláisigh. Luascann an chéad chuid ar an gcorda D; ritheann an dara cuid suas agus síos an scála go A ard.',
    },
  },
)

export const siBheagSiMhor = fromAbc(
  'si-bheag-si-mhor',
  `X:1
T:Sí Bheag, Sí Mhór
R:waltz
M:3/4
L:1/8
Q:1/4=96
K:Dmaj
de|:f3 e d2|d2 de d2|B4 A2|F4 A2|BA Bc d2|e4 de|f4 e2|d4 f2|
B4 e2|A4 d2|F4 E2|D4 f2|B4 e2|A4 dc|d6-|1 d4 de:|2 d4 de||
|:f2 fe d2|ed ef a2|b4 a2|f4 ed|e4 a2|f4 e2|d4 B2|B4 A2|
F4 E2|D4 f2|B4 e2|A4 a2|ba gf ed|e4 dc|d6-|1 d4 de:|2 d6|]`,
  {
    difficulty: 3,
    type: 'waltz',
    composer: "Turlough O'Carolan",
    tags: ['irish', 'waltz', 'slow', 'session', 'second octave'],
    description: {
      en: 'Said to be the first tune of the blind harper Carolan: a stately melody about two fairy hills. Long notes to shape with your breath, up to high B.',
      ru: 'По преданию, первая мелодия слепого арфиста Каролана: величавый напев о двух холмах фей. Длинные ноты, которые лепит дыхание, до верхнего B.',
      ga: 'Deirtear gurb é céad fhonn an chláirseora dhaill Ó Cearbhalláin é: séis mhaorga faoi dhá chnoc sí. Nótaí fada le múnlú le d’anáil, suas go B ard.',
    },
  },
)

export const skyeBoatSong = fromAbc(
  'skye-boat-song',
  `X:1
T:Skye Boat Song
M:6/8
L:1/8
Q:3/8=52
K:Gmaj
D>ED G2G|A>BA d3|B>AB E2E|D6|D>ED G2G|A>BA d3|B>AB E2E|G6||
B>GB B3|A>EA A3|G>EG G2G|E6|B>GB B3|A>EA A3|G>EG G2G|E6||
D>ED G2G|A>BA d3|B>AB E2E|D6|D>ED G2G|A>BA d3|B>AB E2E|G6|]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Scottish',
    sectionNames: ['Chorus', 'Verse', 'Chorus'],
    tags: ['scottish', 'song', 'slow'],
    description: {
      en: 'A rocking boat song from the Hebrides: the same lilting long-short-long figure all the way through, within one octave.',
      ru: 'Покачивающаяся лодочная песня с Гебрид: одна и та же напевная фигура «долго-коротко-долго» от начала до конца, в пределах одной октавы.',
      ga: 'Amhrán báid luascach ó Inse Gall: an fíor chéanna fada-gearr-fada ó thús deireadh, laistigh d’ochtach amháin.',
    },
  },
)

export const MORE_SESSION_TUNES = [
  johnRyansPolka,
  roadToLisdoonvarna,
  skyeBoatSong,
  irishWasherwoman,
  swallowtailJig,
  trippingUpTheStairs,
  merryBlacksmith,
  missMcLeodsReel,
  soldiersJoy,
  siBheagSiMhor,
]
