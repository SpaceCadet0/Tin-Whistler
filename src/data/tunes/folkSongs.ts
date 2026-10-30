import { fromAbc } from './abcTunes'

/*
 * Folk songs and sea shanties. The melodies come from the song transcriptions of the Irish Whistle
 * Tabs app, used with the owner's permission; whistle ornaments, articulation and breath marks
 * (!breath!) were added here, and long ABC lines were re-cut into the songs' four-bar phrases.
 * All of these melodies are traditional and in the public domain.
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
      ga: 'Amhrán náisiúnta neamhoifigiúil Bhaile Átha Cliath in am válsa. Nótaí athráite le teangú go glan, dreapadh réidh go D ard agus curfá ar féidir leat a chanadh leis.',
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
      ga: 'An t-amhrán tábhairne a chanann cách: véarsa seasta, ansin curfá «No, nay, never» lena shosanna ina mbuaileann cách bosa. Traenálann nótaí fada coinnithe d’anáil.',
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
      ga: 'Amhrán mairnéalach na míolta móra in E mion. Nótaí athráite tapa ar na buillí laga, cut ar na B fada agus curfá a dhreapann go E ard.',
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
      ga: 'Aer Dhoire, seinnte go mall agus ceangailte. Slides isteach sna nótaí fada, dreapadh mór go G agus B arda, agus frásaí fada le d’anáil a phleanáil.',
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
      ga: 'Amhrán na bpáirtíneach Iodálach, socraithe in A mion don fheadóg C ionas gur méarú simplí é gach nóta. Frásaí gearra tarraingteacha le nótaí ceangailte trasna an bhuille.',
    },
  },
)

export const blackVelvetBand = fromAbc(
  'black-velvet-band',
  `X:1
T:Black Velvet Band
M:3/4
L:1/4
Q:1/4=180
K:G
d/d/ d3/2 d/ | d B c | d c B- | B3 |
!breath!A G A | B G F | E D2- | D3 |
!breath!d/c/ B B | B D E | F !slide!G2 | A B2 |
!breath!B/B/ A B | c F G | A G2- | G3 |
!breath!d/d/ d3/2 d/ | d B c | d c B- | B3 |
!breath!A G A | B G F | E D2- | D3 |
!breath!d/c/ B B | B D E | F !slide!G2 | A B2 |
!breath!B/B/ A B | c F G | A G2- | G3 ||
!breath!d d2 | d B c | d c B- | B3 |
!breath!A G A | B G F | E D2- | D3 |
!breath!d/c/ B B | B D E | F !slide!G2 | A B2 |
!breath!B A B | c F G | A G2- | G3 |]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Irish',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['song', 'irish', 'waltz time'],
    description: {
      en: 'A ballad of a girl with a black velvet band, in a lilting 3/4. Long tied notes at the end of every line to practise steady breath, and a cross-fingered C natural.',
      ru: 'Баллада о девушке с чёрной бархатной лентой в плавном размере 3/4. Длинные залигованные ноты в конце каждой строки тренируют ровное дыхание, есть до-бекар вилочной аппликатурой.',
      ga: 'Bailéad faoi chailín le banda dubh veilbhite, in 3/4 luascach. Nótaí fada ceangailte ag deireadh gach líne chun anáil sheasta a chleachtadh, agus C nádúrtha crosmhéaraithe.',
    },
  },
)

export const whiskeyInTheJar = fromAbc(
  'whiskey-in-the-jar',
  `X:1
T:Whiskey in the Jar
M:2/4
L:1/8
Q:1/4=110
K:D
A | A{c}A AB | A F2 A | BB Bc | B F2
!breath!A | BB Bc | d<d cB | AA dc | B A2 F ||
!breath!A>A AB | A F2 A | B>B Bc | B F2
!breath!A | B2 B>c | d<d cB | AA dc | BA FA ||
!breath!EE/E/ EE/E/ | E4 | zF F>E | FG A2 |
z !breath!B B>A | Bc dB | AF EF | D3 |]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Irish',
    sectionNames: ['Verse', 'Verse', 'Chorus'],
    tags: ['song', 'irish', 'pub'],
    description: {
      en: 'The highwayman\'s song: quick repeated notes in the verse, then the "Musha ring dum a doo dum a da" chorus on a run of Es. Tongue every syllable.',
      ru: 'Песня о разбойнике: быстрые повторяющиеся ноты в куплете, затем припев «Musha ring dum a doo dum a da» на череде нот E. Каждый слог берите языком.',
      ga: 'Amhrán an rapaire: nótaí athráite tapa sa véarsa, ansin curfá «Musha ring dum a doo dum a da» ar shraith E. Teangaigh gach siolla.',
    },
  },
)

export const johnnyIHardlyKnewYe = fromAbc(
  'johnny-i-hardly-knew-ye',
  `X:1
T:Johnny I Hardly Knew Ye
M:6/8
L:1/8
Q:3/8=100
K:Em
B, | B,2E E2F | G2F G2E | D3- D2B, | D3- D2
!breath!B, | B,2E E2F | G2F G2A | B3- B2G | B3- B2
!breath!B | B2B B2G | A2A A2F | GGG GFE | FFF F2
!breath!A | B2B A2A | G2G F3 | EEE E2D | E3 E2 |]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Irish (words J. B. Geoghegan, 1867)',
    sectionNames: ['Verse and chorus'],
    tags: ['song', 'irish', 'minor', 'march'],
    description: {
      en: 'The anti-war march in E minor, the tune of "When Johnny Comes Marching Home". A steady 6/8 stride and quick repeated notes in the "hurroo, hurroo" refrain.',
      ru: 'Антивоенный марш в ми миноре, на мотив «When Johnny Comes Marching Home». Ровный шаг в 6/8 и быстрые повторяющиеся ноты в припеве «hurroo, hurroo».',
      ga: 'An mháirseáil frithchogaidh in E mion, fonn «When Johnny Comes Marching Home». Coisíocht sheasta 6/8 agus nótaí athráite tapa sa loinneog «hurroo, hurroo».',
    },
  },
)

export const starOfTheCountyDown = fromAbc(
  'star-of-the-county-down',
  `X:1
T:Star of the County Down
M:2/4
L:1/16
Q:1/4=70
K:D
F/A/B{d}BB A/B/dde | d/e/fe/d/B B2<!slide!A2 | !breath!F/A/B{d}BB A/B/dde | d/e/fe/d/B B/A/B3 |
!breath!fa{b}af e/d/eee | d/e/fe/d/B B2<!slide!A2 | !breath!F/A/B{d}BB A/B/dde | d/e/fe/d/B A2<B2 |
!breath!fa{b}af e/d/eee | d/e/fe/d/B B2<!slide!A2 | !breath!F/A/B{d}BB A/B/dde | d/e/fe/d/B A2<B2 |]`,
  {
    difficulty: 3,
    type: 'song',
    composer: 'Traditional Irish',
    sectionNames: ['Verse and chorus'],
    tags: ['song', 'irish', 'modal'],
    description: {
      en: 'A sweeping love song with a modal, B-minor colour. Quick pick-up notes into every line, cuts on the repeated Bs and slides into the long As.',
      ru: 'Размашистая песня о любви с модальным, си-минорным оттенком. Быстрые затакты в начале каждой строки, каты на повторяющихся B и слайды на длинные A.',
      ga: 'Amhrán grá leathan le dath módúil B mion. Nótaí tapa tosaigh isteach i ngach líne, cuts ar na B athráite agus slides isteach sna A fada.',
    },
  },
)

export const rockyRoadToDublin = fromAbc(
  'rocky-road-to-dublin',
  `X:1
T:The Rocky Road to Dublin
M:9/8
L:1/8
Q:3/8=110
K:Edor
BBB | B2B A2F E2E | B2E E2F G2A | !breath!B2B A2F E2G | F2D D2E FG
!breath!A | B2B A2F E3 | B2E E2F G2A | !breath!B2B A2F E2G | F2D D2E FGA ||
!breath!B2e {f}e2c d3 | B2e {f}e2c d2A | !breath!B2e {f}e2c d2B | A2F D2E FGA |
!breath!B2e e2c d3 | B2e e2c d2A | !breath!B2e e2c d2B | A2A A2F D2E FGA ||
!breath!B2B A2F E3 | B2E E2F G2A | !breath!B2B A2F E2G | F2D D2E FGA | B2B A2F E3 |]`,
  {
    difficulty: 4,
    type: 'song',
    composer: 'Traditional Irish (words D. K. Gavan)',
    sectionNames: ['Verse', 'Chorus', 'Ending'],
    tags: ['song', 'irish', 'slip jig time', 'modal'],
    description: {
      en: 'The tongue-twister song in 9/8, a slip jig with words, set in E dorian so every note is a plain fingering. Rolling groups of three and one long 12/8 bar at the end of the chorus.',
      ru: 'Песня-скороговорка в размере 9/8, по сути слип-джига со словами, в ми дорийском: все ноты берутся обычной аппликатурой. Перекатывающиеся тройки и один длинный такт в 12/8 в конце припева.',
      ga: 'An t-amhrán casfhoclach in 9/8, port luascach le focail, socraithe in E dórach ionas gur méarú simplí é gach nóta. Grúpaí trí rollta agus barra fada amháin 12/8 ag deireadh an churfá.',
    },
  },
)

export const blowTheManDown = fromAbc(
  'blow-the-man-down',
  `X:1
T:Blow the Man Down
M:6/8
L:1/8
Q:3/8=96
K:D
F | ABA FDF | ABA F2 D/2F/2 | A3 B3 | G3/2 F/2 G E2
!breath!F | GAG ECE | GFE !slide!B3 | !breath!AAA A2 G | F3/2 E/2 F D2 |]`,
  {
    difficulty: 3,
    type: 'shanty',
    composer: 'Traditional sea shanty',
    sectionNames: ['Verse'],
    tags: ['shanty', 'halyard'],
    description: {
      en: 'A halyard shanty with a rolling 6/8 swing: "Way, hey, blow the man down!" Short and catchy, played in the second octave with a leap up to high B for the hauling shout.',
      ru: 'Морская песня для подъёма парусов с раскачивающимся ритмом 6/8: «Way, hey, blow the man down!». Короткая и цепкая, звучит во второй октаве, со скачком к верхнему B на рабочем выкрике.',
      ga: 'Amhrán mairnéalach tarraingthe le luascadh rollach 6/8: «Way, hey, blow the man down!» Gearr agus tarraingteach, seinnte sa dara hochtach le léim suas go B ard don bhéic tharraingthe.',
    },
  },
)

export const leaveHerJohnny = fromAbc(
  'leave-her-johnny',
  `X:1
T:Leave Her, Johnny
M:2/4
L:1/16
Q:1/4=60
K:F
(FG) | A2A2 (AG)(FG) | A2(AG) F4 | G2G2 G3F | A2 c4
!breath!c2 | d2d2 c2A2 | A2(AG) F2c2 | !breath!A3F A3G | G2 F4 |]`,
  {
    difficulty: 2,
    type: 'shanty',
    composer: 'Traditional sea shanty',
    sectionNames: ['Verse'],
    tags: ['shanty', 'slow'],
    description: {
      en: 'The sailors\' farewell to a hard ship, sung slowly at the pumps on the last day of a voyage. Gentle slurred pairs and long notes to end each line.',
      ru: 'Прощание моряков с тяжёлым кораблём, которое пели медленно у помп в последний день плавания. Мягкие легато-пары и длинные ноты в конце каждой строки.',
      ga: 'Slán na mairnéalach le long chrua, canta go mall ag na caidéil ar lá deireanach an turais. Péirí ceangailte séimhe agus nótaí fada ag deireadh gach líne.',
    },
  },
)

export const spanishLadies = fromAbc(
  'spanish-ladies',
  `X:1
T:Spanish Ladies
M:4/4
L:1/4
Q:1/4=100
K:D
|: FAA B/2c/2 | dd d/2e/2f | ge fd | BA!slide!A2 |
!breath!FAA B/2c/2 | dd d/2e/2f | ge fd | BA!slide!A2 :|
|: !breath!faaf | edef | faaf | ed e2 |
!breath!faaf | edee/2f/2 | ge fd | BA!slide!A2 :|`,
  {
    difficulty: 2,
    type: 'shanty',
    composer: 'Traditional English sea shanty',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['shanty'],
    description: {
      en: 'The Royal Navy sailors\' song of the homeward voyage up the English Channel. A bold march-like tune that climbs to high A in the chorus.',
      ru: 'Песня моряков британского флота о возвращении домой через Ла-Манш. Смелая, маршевая мелодия, в припеве поднимается к верхнему A.',
      ga: 'Amhrán mairnéalach an Chabhlaigh Ríoga faoin turas abhaile suas Muir nIocht. Fonn dána cosúil le máirseáil a dhreapann go A ard sa churfá.',
    },
  },
)

export const FOLK_SONGS = [
  mollyMalone,
  wildRover,
  wellerman,
  dannyBoy,
  bellaCiao,
  blackVelvetBand,
  whiskeyInTheJar,
  johnnyIHardlyKnewYe,
  starOfTheCountyDown,
  rockyRoadToDublin,
  blowTheManDown,
  leaveHerJohnny,
  spanishLadies,
]
