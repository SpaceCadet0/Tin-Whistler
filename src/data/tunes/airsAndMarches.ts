import { fromAbc } from './abcTunes'

/*
 * Songs, airs, marches and anthems. Transcribed by hand from open sources (reference/abc);
 * chord symbols are kept, the parser skips them. Fixes against the originals: Scotland the Brave
 * and The Foggy Dew count in quarter notes (L:1/4) so their bars are whole; the tied D# at the end
 * of Korobeiniki keeps its sharp; a missing "/" in Charlie He's My Darling. Loch Lomond is moved
 * to G to sit in the first octave; Charlie He's My Darling keeps its D minor on a C whistle.
 */

export const wayfaringStranger = fromAbc(
  'wayfaring-stranger',
  `X:1
T:The Wayfaring Stranger
R:air
M:4/4
L:1/8
Q:1/4=84
K:Emin
|:"Em"z2E2E2B2|B8-|B2G2A2G2-|GE-EE-E4|
z3EE2B2|"Am"z2A6-|A2E-E(3G2A2B2|"Em"B8|
zEE3EB2|"Em"z2B6-|B2G2A2G2|ED2E-E4|
z2E2EB2A-|"C"A8-|"D"A2G2-GE2D-|"Em"DE2-E4E|
z2B2B2d2|"C"z2e6-|e2e2d2B2|"G"BAGG-G4|
z2G2G2B2|"C"B8-|B2G2(3G2A2B2-|"B7"B2BAB4|
z2E2E2B2|"Em"z2B6-|B2G2A2G2-|GE-EE-E4|
z2E2EB2A-|"C"A8-|"D"A2G2-GE2D-|"Em"DE2-E4E:|`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional American',
    sectionNames: ['Verse and chorus'],
    tags: ['song', 'minor', 'long notes'],
    description: {
      en: 'A slow, lonesome American hymn in E minor. Long tied notes and syncopated entries: a lesson in breath control and counting rests.',
      ru: 'Медленный одинокий американский гимн в ми миноре. Длинные залигованные ноты и вступления со смещением: урок дыхания и счёта пауз.',
      ga: 'Iomann Meiriceánach mall uaigneach in E mion. Nótaí fada ceangailte agus tosaithe sioncóipithe: ceacht i smacht anála agus i gcomhaireamh sosanna.',
    },
  },
)

export const korobeiniki = fromAbc(
  'korobeiniki',
  `X:1
T:Korobeiniki
R:polka
M:2/4
L:1/8
K:Gmaj
|:B2 FG|A2 GF|E2 EG|B2 AG|F3 G|A2 B2|G2 E2|E2 z2||
A2- Ac|e2 dc|B3 G|B2 AG|F2 FG|A2 B2|G2 E2|E2 z2:|
B4|G4|A4|F4|G4|E4|^D4 -|- ^D2 z2||
B4|G4|A4|F4|G2 B2|ee^d2 -|- ^d2 z2||`,
  {
    difficulty: 3,
    type: 'song',
    composer: 'Traditional Russian',
    tags: ['song', 'russian', 'minor'],
    description: {
      en: 'The Russian peddlers\' song the whole world knows from Tetris. A brisk E-minor tune, then a slow coda with a half-holed D#.',
      ru: '«Коробейники» — песня, которую весь мир знает по «Тетрису». Бодрая мелодия в ми миноре, а затем медленная кода с полузакрытым D#.',
      ga: 'Amhrán mangairí na Rúise a bhfuil aithne ag an saol air ó Tetris. Fonn beoga in E mion, ansin códa mall le D# leathphoill.',
    },
  },
)

export const scotlandTheBrave = fromAbc(
  'scotland-the-brave',
  `X:1
T:Scotland the Brave
R:march
M:4/4
L:1/4
K:Dmaj
A,D|D2 D3/2E/|FD FA|d2 d3/2c/|dA FD|G2 B3/2G/|FA FD|
E2 A3/2B/|(3ABA FE|D2 D3/2E/|FD FA|d2 d3/2c/|dA FD|
G2 B3/2G/|FA FD|E2 D3/2D/|D2 cd|e2 e3/2e/|ec A2|
d2 f3/2e/|dA FD|d2 dd|c2 dc|Bd cB|AG FE|D2 D3/2E/|FD FA|
d2 d3/2c/|dA FD|G2 B3/2G/|FA FD|E2 D3/2E/|D2||`,
  {
    difficulty: 2,
    composer: 'Traditional Scottish',
    tags: ['march', 'scottish', 'pipes'],
    description: {
      en: 'The great Highland pipe march. Dotted rhythms on a D-major scale with a proud leap to high D.',
      ru: 'Знаменитый марш шотландских волынщиков. Пунктирный ритм в ре мажоре и гордый скачок к верхнему D.',
      ga: 'An mháirseáil mhór phíob na nGarbhchríoch. Rithimí poncaithe ar scála D mór le léim bhródúil go D ard.',
    },
  },
)

export const lochLomond = fromAbc(
  'loch-lomond',
  `X:1
T:Loch Lomond
R:song
M:4/4
L:1/8
Q:1/4=80
K:Dmaj
A,B,|D2 DE F2 FE|D2 DB, A,2 A,B,|D2 DD D2 FA|B4 A3A|
B2 BA F2 FA|GF ED B,2 A,B,|D2 FA B2 AF|E4 D4||`,
  {
    difficulty: 2,
    type: 'song',
    transpose: 5,
    composer: 'Traditional Scottish',
    sectionNames: ['Chorus'],
    tags: ['song', 'scottish'],
    description: {
      en: '"O ye\'ll tak\' the high road": the chorus of the Scottish ballad. Written in D it dips below the whistle, so it is set in G, where it sits comfortably in the first octave.',
      ru: '«O ye\'ll tak\' the high road» — припев шотландской баллады. В ре мажоре мелодия уходит ниже вистла, поэтому она в соль мажоре, где удобно ложится в первую октаву.',
      ga: '«O ye\'ll tak\' the high road»: curfá an bhailéid Albanaigh. I D théann sé faoi raon na feadóige, mar sin tá sé curtha i G, áit a luíonn sé go compordach sa chéad ochtach.',
    },
  },
)

export const ukrainianAnthem = fromAbc(
  'ukrainian-anthem',
  `X:1
T:Ukrainian National Anthem
C:Mykhailo Verbytsky
R:march
M:4/4
L:1/8
Q:1/4=90
K:Emin
"G"B3B BABc|d3c B2"D#m"A2|"Em"G2B2"B"F2B2|"Em"E3F G2"D"A2|
"G"B3B BABc|d3c B2"B7"A2|"Em"G2B2"B"F2B2|"Em"E4 E2z2|
"B"F3F BAGF|"Em"EFGE "B"F2F2|"Em"G2G2"D"A2A2|"G"B4 B2z2|
"B"F3F BAGF|"Em"EFGE "B"F2F2|"Em"G2B2"B"F2B2|"Em"E3F GABc||
|:"G"d3^c d2B2|"D"A2A2 dc"D#"BA|"Em"G2G2 "D"A2A2|"G"B3A GA"D7"Bc|
"G"d3^c d2B2|"D"A2A2 dc"D#"BA|"Em"G2B2 F2B2|1 "Em"E3F GABc:|2 "Em"e4 e4||`,
  {
    difficulty: 3,
    type: 'anthem',
    composer: 'Mykhailo Verbytsky',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['anthem', 'ukrainian', 'minor'],
    description: {
      en: '"Shche ne vmerla Ukrainy", composed in 1863. A solemn E-minor verse and a rising chorus with a half-holed C#.',
      ru: '«Ще не вмерла України», музыка 1863 года. Торжественный куплет в ми миноре и восходящий припев с полузакрытым C#.',
      ga: '«Shche ne vmerla Ukrainy», a cumadh in 1863. Véarsa sollúnta in E mion agus curfá ag ardú le C# leathphoill.',
    },
  },
)

export const amhranNaBhFiann = fromAbc(
  'amhran-na-bhfiann',
  `X:1
T:Amhrán na bhFiann
C:Peadar Kearney
R:march
M:4/4
L:1/8
Q:1/4=90
K:Dmaj
A2|F2 DF A3 A|Bcde f3 e|d2B2A2F2|
A3G EzA2|F2 DF A3 A|Bcde f3 d|c3 c B3 B|
A2 A2 z2 A2|G3 G GEFG|A3 B A2 d2|
c3 B c2 B2|A2 G2 E2 A2|F2 DF A3 A|
Bcde f2 dB|A d2 F E3 D D6 z2||
ABc|d3 e f2 d2|A3 A|A3 A|B3 B G2 B2|
A4 A4|d4 c4|B6 cd|e3 f e2 B2|c6z2|
d3 ef2d2|A6 A2|B3 B G2 B2|A4 A2 A2|
c4 c3 c|c2 c2 B3 B|A6 A2|G3 G GEFG|
A3 B A2 d2|c3 B c2 B2|A2 G2 E2A2|
F2 DFA3 A|Bcde f2z dB|A d2 fe3d|d6z2||`,
  {
    difficulty: 3,
    type: 'anthem',
    composer: 'Peadar Kearney, Patrick Heeney',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['anthem', 'irish'],
    description: {
      en: '"The Soldier\'s Song", the Irish national anthem. The chorus is the anthem as sung today; the verse comes first, as in the original song.',
      ru: '«Песнь солдата», гимн Ирландии. Припев — это гимн в том виде, в каком его поют сегодня; куплет идёт первым, как в исходной песне.',
      ga: '«Amhrán na bhFiann», amhrán náisiúnta na hÉireann. Is é an curfá an t-amhrán náisiúnta mar a chantar inniu é; tagann an véarsa ar dtús, mar a bhí san amhrán bunaidh.',
    },
  },
)

export const charlieHesMyDarling = fromAbc(
  'charlie-hes-my-darling',
  `X:1
T:Charlie He's My Darling
M:C
L:1/8
R:Air
K:Dmin
~A,|D>EFG (A2 d) z/A/|(B2 d) z/B/ (A2 d) z/F/|~D>EFG A2 ~d>e|f2 e>d d3:|
d|^c(A=Bc) ~d>efd|^c(A=Bc) d2 e2|f>efd =c>A ~F(G/A/)|B>G A>F EA/G/ FE|
~D>EFG (A2 d) z/A/|(B2 d) z/B/ (A2 d) A/F/|~D>EFG A2 ~d>e|f2 e>d d3||`,
  {
    difficulty: 4,
    whistle: 'C',
    transpose: 0,
    composer: 'Traditional Scottish',
    tags: ['air', 'scottish', 'minor', 'rolls', 'slurs', 'C whistle'],
    description: {
      en: 'A Jacobite song played as a slow air in D minor, set for a C whistle where the B flat is a simple cross-fingering. Slurred groups, rolls and dotted rhythms.',
      ru: 'Якобитская песня, сыгранная как медленный эйр в ре миноре. Записана для C-вистла, где B♭ берётся простой вилочной аппликатурой. Легато, rolls и пунктирный ритм.',
      ga: 'Amhrán Seacaibíteach seinnte mar aer mall i D mion, socraithe don fheadóg C áit ar crosmhéarú simplí é an B maol. Grúpaí ceangailte, rolls agus rithimí poncaithe.',
    },
  },
)

export const ifIWasABlackbird = fromAbc(
  'if-i-was-a-blackbird',
  `X:1
T:If I Was a Blackbird
R:waltz
M:3/4
L:1/8
K:Gmaj
GA | B4 BB | D2 G2 G2 | (B2{d}) d2 (e2 {d})| d4 d2 |
d2 c2 B2 | (D2{A}) A2 G2 | AB c2 B2 | A4 GA |
B3 B B2 | D2 G2 G2 | (B2{d}) d2 (e2 {d})| d4 d2 |
d2 c2 B2 | (D2{A}) A2 G2 | AB c2 BA | G4 |]`,
  {
    difficulty: 2,
    composer: 'Traditional Irish',
    sectionNames: ['Verse'],
    tags: ['waltz', 'irish', 'song', 'cuts'],
    description: {
      en: 'A gentle Irish waltz-song in G. Slow enough to place your first cuts on the long notes and to cross-finger the C natural.',
      ru: 'Нежная ирландская песня-вальс в соль мажоре. Достаточно медленная, чтобы попробовать первые cuts на длинных нотах и вилочное C натуральное.',
      ga: 'Amhrán válsa Gaelach séimh i G. Mall go leor chun do chéad cuts a chur ar na nótaí fada agus chun an C nádúrtha a chrosmhéarú.',
    },
  },
)

export const dawningOfTheDay = fromAbc(
  'dawning-of-the-day',
  `X:1
T:The Dawning of the Day
C:Thomas O'Connellan
R:air
M:4/4
L:1/8
Q:1/4=72
K:Gmaj
|:D|G>AGF TE2D2|{B}d>edc B2AB/A/|GDGA B2ge/c/|B2A2G2z:|
g/f/|e>def g2fg|ab/a/ gf ed2g/f/|edef g2fg|ab/a/ gfe3e|
fdef g2 g/f/e/d/|BgBg cBA2|GDGA B2ge/c/|B2A2G2z||`,
  {
    difficulty: 3,
    type: 'air',
    composer: "Thomas O'Connellan",
    tags: ['air', 'irish', 'harp', 'trill'],
    description: {
      en: 'A 17th-century harp air, later the tune of "On Raglan Road". Dotted rhythms, a trill and a second part that sings up to high A.',
      ru: 'Арфовый эйр XVII века, позже ставший мелодией «On Raglan Road». Пунктирный ритм, трель и вторая часть, поднимающаяся к верхнему A.',
      ga: 'Aer cláirsí ón 17ú haois, fonn «On Raglan Road» níos déanaí. Rithimí poncaithe, trill agus dara cuid a chanann suas go A ard.',
    },
  },
)

export const foggyDew = fromAbc(
  'foggy-dew',
  `X:1
T:The Foggy Dew
R:song
M:4/4
L:1/4
Q:1/4=90
K:Dmaj
|:EF G2|GA B2|gf e2|dB A2|GA BA|BG EG|FA G2|GF G2:|
ef g2|gf e2|fg ag|fe d2|Bd e2|ef gf|ed e2|ef e2|
EF G2|GA B2|gf e2|dB A2|GA BA|BG EG|FA G2|GF G2|`,
  {
    difficulty: 3,
    type: 'song',
    composer: 'Traditional Irish',
    tags: ['song', 'irish', 'dorian', 'second octave'],
    description: {
      en: 'The ballad of the 1916 Rising, in the dark E dorian mode. Big leaps up to high G and a middle part that stays in the second octave.',
      ru: 'Баллада о Пасхальном восстании 1916 года в тёмном ми дорийском ладу. Большие скачки к верхнему G и средняя часть, целиком во второй октаве.',
      ga: 'Bailéad Éirí Amach 1916, sa mhód dorcha E dórach. Léimeanna móra suas go G ard agus cuid lárnach a fhanann sa dara hochtach.',
    },
  },
)

export const illTellMeMa = fromAbc(
  'ill-tell-me-ma',
  `X:1
T:I'll Tell Me Ma
R:polka
M:2/4
L:1/8
K:Dmaj
"D"Ad f>f|"G"gf "D"f>g|"A"fe e>f|"D"ed d2|
Ad f>f|"G"gf "D"f>g|"A"fe e>f|"D"ed d2|
aa af|"Em"gg g<e|"D"f>f fd|"A"ec BA|
"D"aa af|"G"gg g a/g/|"D"fd "A7"ec|"D"dd d2|]`,
  {
    difficulty: 2,
    composer: 'Traditional Irish',
    sectionNames: ['Verse and chorus'],
    tags: ['song', 'irish', 'children', 'second octave'],
    description: {
      en: 'The Belfast children\'s street song, played as a polka. Short, bouncy and mostly in the second octave: good practice for high notes.',
      ru: 'Белфастская детская уличная песенка в ритме польки. Короткая, подпрыгивающая и почти вся во второй октаве: хорошая тренировка высоких нот.',
      ga: 'Amhrán sráide pháistí Bhéal Feirste, seinnte mar pholca. Gearr, preabach agus sa dara hochtach den chuid is mó: cleachtadh maith do nótaí arda.',
    },
  },
)

export const AIRS_AND_MARCHES = [
  lochLomond,
  scotlandTheBrave,
  wayfaringStranger,
  ifIWasABlackbird,
  illTellMeMa,
  korobeiniki,
  foggyDew,
  dawningOfTheDay,
  ukrainianAnthem,
  amhranNaBhFiann,
  charlieHesMyDarling,
]
