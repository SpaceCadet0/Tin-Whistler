import { fromAbc } from './abcTunes'

/*
 * Twenty of the best-known melodies in the world, all in the public domain: traditional songs,
 * carols and classical themes. Written in ABC (ABC "D" = the whistle's bottom D; lowercase =
 * the second octave) and kept inside the D whistle's two octaves, D up to high B.
 */

// ── first steps ─────────────────────────────────────────────────────────────

export const twinkle = fromAbc(
  'twinkle-twinkle',
  `X:1
T:Twinkle, Twinkle, Little Star
M:4/4
L:1/4
Q:1/4=100
K:D
DDAA|BBA2|GGFF|EED2|AAGG|FFE2|AAGG|FFE2|DDAA|BBA2|GGFF|EED2|]`,
  {
    difficulty: 1,
    type: 'children',
    sectionNames: ['Melody'],
    tags: ['song', 'kids', 'first steps'],
    description: {
      en: 'The tune everyone knows (the French "Ah! vous dirai-je, maman"). Six neighbouring notes and a steady pulse.',
      ru: 'Мелодия, которую знают все (французская «Ah! vous dirai-je, maman»). Шесть соседних нот и ровный пульс.',
      ga: 'An fonn a bhfuil aithne ag cách air (an Fraincis «Ah! vous dirai-je, maman»). Sé nóta in aice a chéile agus cuisle sheasta.',
    },
  },
)

export const rowYourBoat = fromAbc(
  'row-your-boat',
  `X:1
T:Row, Row, Row Your Boat
M:6/8
L:1/8
Q:3/8=60
K:D
D3 D3|D2E F3|F2E F2G|A6|ddd AAA|FFF DDD|A2G F2E|D6|]`,
  {
    difficulty: 1,
    type: 'children',
    sectionNames: ['Melody'],
    tags: ['song', 'kids', 'round'],
    description: {
      en: 'A rolling 6/8 round that climbs the scale and jumps to high D on "merrily". Try it as a canon with a friend.',
      ru: 'Покачивающийся канон на 6/8: подъём по гамме и прыжок к верхнему D на «merrily». Попробуйте сыграть каноном с другом.',
      ga: 'Babhta rollach 6/8 a dhreapann an scála agus a léimeann go D ard ar «merrily». Triail é mar chanóin le cara.',
    },
  },
)

export const frereJacques = fromAbc(
  'frere-jacques',
  `X:1
T:Frère Jacques
M:4/4
L:1/4
Q:1/4=100
K:A
ABcA|ABcA|cde2|cde2|e/f/e/d/ cA|e/f/e/d/ cA|AEA2|AEA2|]`,
  {
    difficulty: 1,
    type: 'children',
    sectionNames: ['Melody'],
    tags: ['song', 'kids', 'round'],
    description: {
      en: 'The French round "Are you sleeping, Brother John?". Short repeated cells and quick eighth notes in the middle.',
      ru: 'Французский канон «Братец Яков». Короткие повторы и быстрые восьмые в середине.',
      ga: 'An babhta Francach «Are you sleeping, Brother John?». Cealla gearra athráite agus ochtú nótaí tapa sa lár.',
    },
  },
)

export const michaelRow = fromAbc(
  'michael-row',
  `X:1
T:Michael, Row the Boat Ashore
M:4/4
L:1/4
Q:1/4=100
K:D
DFA>F|ABA2|FAB2|A4|FAA>F|GFE2|DEF>E|DED2|]`,
  {
    difficulty: 1,
    type: 'hymn',
    composer: 'Traditional spiritual',
    sectionNames: ['Melody'],
    tags: ['song', 'spiritual'],
    description: {
      en: 'A gentle spiritual on the lower notes with a few dotted "long-short" steps.',
      ru: 'Спокойный спиричуэл на нижних нотах с несколькими пунктирными шагами «долго-коротко».',
      ga: 'Spioradálta séimh ar na nótaí íochtair le cúpla céim phoncaithe «fada-gearr».',
    },
  },
)

export const londonBridge = fromAbc(
  'london-bridge',
  `X:1
T:London Bridge Is Falling Down
M:4/4
L:1/8
Q:1/4=110
K:D
A3B A2G2|F2G2 A4|E2F2 G4|F2G2 A4|A3B A2G2|F2G2 A4|E4 A4|F2D6|]`,
  {
    difficulty: 1,
    type: 'children',
    sectionNames: ['Melody'],
    tags: ['song', 'kids'],
    description: {
      en: 'The English nursery rhyme. Small steps around A with one dotted rhythm that keeps coming back.',
      ru: 'Английская детская песенка. Маленькие шаги вокруг A и один повторяющийся пунктирный ритм.',
      ga: 'An rann páistí Sasanach. Céimeanna beaga timpeall A le rithim phoncaithe amháin a fhilleann arís agus arís.',
    },
  },
)

export const oldMacDonald = fromAbc(
  'old-macdonald',
  `X:1
T:Old MacDonald Had a Farm
M:4/4
L:1/4
Q:1/4=110
K:G
GGGD|EED2|BBAA|G3D|GGGD|EED2|BBAA|G4||D/D/G G2|D/D/G G2|GG GG|G/G/G/G/ GG|GGGD|EED2|BBAA|G4|]`,
  {
    difficulty: 1,
    type: 'children',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['song', 'kids'],
    description: {
      en: 'The farmyard song: a cheerful verse, then quick repeated notes on "here a moo, there a moo" for tonguing practice.',
      ru: 'Песенка про ферму: весёлый куплет, а затем быстрые повторы на «here a moo, there a moo» для тренировки языка.',
      ga: 'Amhrán an bhuaile: véarsa gealgháireach, ansin nótaí athráite tapa ar «here a moo, there a moo» le teangú a chleachtadh.',
    },
  },
)

// ── songs and carols ────────────────────────────────────────────────────────

export const jingleBells = fromAbc(
  'jingle-bells',
  `X:1
T:Jingle Bells
C:James Lord Pierpont
M:4/4
L:1/4
Q:1/4=120
K:G
DBAG|D3D/D/|DBAG|E3E|EcBA|F4|ddcA|B4|DBAG|D3D|DBAG|E3E|EcBA|dddd|edcA|G2d2||
BBB2|BBB2|BdG>A|B4|ccc>c|cBBB/B/|BAAB|A2d2|BBB2|BBB2|BdG>A|B4|cccc|cBBB/B/|ddcA|G4|]`,
  {
    difficulty: 3,
    type: 'carol',
    composer: 'James Lord Pierpont (1857)',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['song', 'christmas'],
    description: {
      en: 'The winter classic, verse and chorus, set in D so it needs no cross-fingerings. Lives mostly in the second octave, up to high B.',
      ru: 'Зимняя классика, куплет и припев, в ре мажоре, поэтому без вилочных аппликатур. Звучит в основном во второй октаве, до верхнего B.',
      ga: 'An clasaiceach geimhridh, véarsa agus curfá, socraithe i D ionas nach dteastaíonn crosmhéaruithe. Maireann sé sa dara hochtach den chuid is mó, suas go B ard.',
    },
  },
)

export const happyBirthday = fromAbc(
  'happy-birthday',
  `X:1
T:Happy Birthday to You
C:Mildred & Patty Hill
M:3/4
L:1/8
Q:1/4=100
K:D
A>A|B2A2d2|c4A>A|B2A2e2|d4A>A|a2f2d2|c2B2g>g|f2d2e2|d4|]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Mildred & Patty Hill',
    sectionNames: ['Melody'],
    tags: ['song', 'waltz'],
    description: {
      en: 'Play it at the next party. A waltz with a big octave leap to high A on the third line.',
      ru: 'Сыграйте на ближайшем празднике. Вальс с большим скачком на октаву к верхнему A в третьей строке.',
      ga: 'Seinn é ag an gcéad chóisir eile. Válsa le léim mhór ochtaigh go A ard ar an tríú líne.',
    },
  },
)

export const ohSusanna = fromAbc(
  'oh-susanna',
  `X:1
T:Oh! Susanna
C:Stephen Foster
M:4/4
L:1/8
Q:1/4=120
K:D
DE|FA A>B AF D>E|FF ED E2DE|FA A>B AF D>E|FF EE D4||G4 B4|B2BA A2FD|E6DE|FA A>B AF D>E|FF EE D4|]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Stephen Foster (1848)',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['song', 'american'],
    description: {
      en: 'Stephen Foster\'s banjo song. Bouncy dotted rhythms and a chorus that reaches up to G and B.',
      ru: 'Песня Стивена Фостера под банджо. Пружинистые пунктиры и припев с подъёмом к G и B.',
      ga: 'Amhrán bainseó Stephen Foster. Rithimí poncaithe preabacha agus curfá a shíneann suas go G agus B.',
    },
  },
)

export const joyToTheWorld = fromAbc(
  'joy-to-the-world',
  `X:1
T:Joy to the World
C:arr. Lowell Mason
M:2/4
L:1/8
Q:1/4=90
K:D
d2c>B|A3G|F2E2|D3A|B3B|c3c|d4-|d3d|dcBA|A>GFd|dcBA|A>GFF|FFFF/G/|A3G/F/|EEEE/F/|G3F/E/|Dd2B|A>GFG|F2E2|D4|]`,
  {
    difficulty: 2,
    type: 'carol',
    composer: 'Lowell Mason (1839), after Handel',
    sectionNames: ['Melody'],
    tags: ['song', 'christmas'],
    description: {
      en: 'The carol opens with a whole octave running down the scale from high D: perfect for checking every note in turn.',
      ru: 'Колядка начинается со спуска по гамме на целую октаву от верхнего D: отличная проверка каждой ноты по очереди.',
      ga: 'Osclaíonn an carúl le hochtach iomlán ag rith síos an scála ó D ard: foirfe chun gach nóta a sheiceáil ina sheal.',
    },
  },
)

export const deckTheHalls = fromAbc(
  'deck-the-halls',
  `X:1
T:Deck the Halls
M:4/4
L:1/8
Q:1/4=110
K:G
d3c B2A2|G2A2 B2G2|AB cA B3A|G2F2 G4|d3c B2A2|G2A2 B2G2|AB cA B3A|G2F2 G4||
A3B c2A2|B3c d2A2|Bc d2 ef g2|f2e2 d4|d3c B2A2|G2A2 B2G2|ee ee d3c|B2A2 G4|]`,
  {
    difficulty: 2,
    type: 'carol',
    composer: 'Traditional Welsh',
    sectionNames: ['Verse', 'Fa la la'],
    tags: ['song', 'christmas'],
    description: {
      en: 'The Welsh carol with its "fa la la" runs. A scale climb to high G in the middle section.',
      ru: 'Валлийская колядка с переливами «фа-ла-ла». В середине подъём по гамме к верхнему G.',
      ga: 'An carúl Breatnach lena ritheanna «fa la la». Dreapadh scála go G ard sa chuid lárnach.',
    },
  },
)

export const merryChristmas = fromAbc(
  'we-wish-you',
  `X:1
T:We Wish You a Merry Christmas
M:3/4
L:1/4
Q:1/4=140
K:D
A|dd/e/d/c/|BBB|ee/f/e/d/|cAA|ff/g/f/e/|dBA/A/|Bec|d2||A|ddd|c2c|dcB|A2e|fed|aAA/A/|Bec|d2|]`,
  {
    difficulty: 2,
    type: 'carol',
    composer: 'Traditional English',
    sectionNames: ['Verse', 'Good tidings'],
    tags: ['song', 'christmas', 'waltz'],
    description: {
      en: 'A quick 3/4 carol with little eighth-note turns and a leap up to high A near the end.',
      ru: 'Быстрая колядка на 3/4 с короткими оборотами из восьмых и скачком к верхнему A в конце.',
      ga: 'Carúl tapa 3/4 le casaidh bheaga ochtú nótaí agus léim suas go A ard gar don deireadh.',
    },
  },
)

export const silentNight = fromAbc(
  'silent-night',
  `X:1
T:Silent Night
C:Franz Xaver Gruber
M:6/8
L:1/8
Q:3/8=50
K:D
A3B2A|F6|A3B2A|F6|e4e2|c6|d4d2|A6|B4B2|d3c2B|A3B2A|F6|B4B2|d3c2B|A3B2A|F6|e4e2|g3e2c|d6|f6|d2A2F2|A3G2E|D6|]`,
  {
    difficulty: 2,
    type: 'carol',
    composer: 'Franz Xaver Gruber (1818)',
    sectionNames: ['Melody'],
    tags: ['song', 'christmas', 'air'],
    description: {
      en: 'The gentle Austrian carol. Long held notes for breath control and soft slurs into the second octave.',
      ru: 'Нежная австрийская колядка. Долгие ноты на контроль дыхания и мягкие переходы во вторую октаву.',
      ga: 'An carúl séimh Ostarach. Nótaí fada coinnithe do smacht anála agus ceangail bhoga isteach sa dara hochtach.',
    },
  },
)

export const drunkenSailor = fromAbc(
  'drunken-sailor',
  `X:1
T:Drunken Sailor
M:4/4
L:1/8
Q:1/4=130
K:Edor
B2BB B2BB|B2E2 G2B2|A2AA A2AA|A2D2 F2A2|B2BB B2BB|B2c2 d2e2|d2B2 A2F2|E4 E4||
B4 B4|E2G2 B4|A4 A4|D2F2 A4|B4 B4|B2c2 d2e2|d2B2 A2F2|E4 E4|]`,
  {
    difficulty: 2,
    type: 'shanty',
    composer: 'Traditional sea shanty',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['song', 'shanty', 'dorian'],
    description: {
      en: '"What shall we do with the drunken sailor?" A stomping shanty in E dorian. Great for crisp repeated tonguing.',
      ru: '«Что нам делать с пьяным матросом?» Задорная морская песня в ми дорийском. Отлично для чёткой атаки на повторах.',
      ga: '«What shall we do with the drunken sailor?» Amhrán mairnéalach trom-chosach in E dórach. Iontach do theangú athráite briosc.',
    },
  },
)

export const thisOldMan = fromAbc(
  'this-old-man',
  `X:1
T:This Old Man
M:4/4
L:1/4
Q:1/4=110
K:G
dBd2|dBd2|edcB|ABc2|Bcd G/G/|G/G/A/B/ cd|dAAc|BAG2|]`,
  {
    difficulty: 2,
    type: 'children',
    sectionNames: ['Melody'],
    tags: ['song', 'kids'],
    description: {
      en: '"Knick-knack paddywhack": a counting song in D with a quick run from the bottom D up to A.',
      ru: '«Knick-knack paddywhack»: считалочка в ре мажоре с быстрым пробегом от нижнего D до A.',
      ga: '«Knick-knack paddywhack»: amhrán comhairimh i D le rith tapa ón D íochtair suas go A.',
    },
  },
)

// ── classical themes ───────────────────────────────────────────────────────

export const eineKleine = fromAbc(
  'eine-kleine-nachtmusik',
  `X:1
T:Eine kleine Nachtmusik (theme)
C:Wolfgang Amadeus Mozart
M:4/4
L:1/8
Q:1/4=120
K:G
G2zD G2zD|GDGB d4|c2zA c2zA|cAFA D4||G2G2 GBAG|G2F2 FAdF|AGG2 GBAG|G2F2 FAdF|G4 z4|]`,
  {
    difficulty: 3,
    type: 'classical',
    composer: 'W. A. Mozart (1787)',
    sectionNames: ['Opening', 'Answer'],
    tags: ['classical'],
    description: {
      en: 'Mozart\'s famous serenade. Short, sharply tongued notes separated by rests, then a running answer.',
      ru: 'Знаменитая серенада Моцарта. Короткие ноты с чёткой атакой и паузами, затем бегущий ответ.',
      ga: 'Séiréanáid cháiliúil Mozart. Nótaí gearra teangaithe go géar scartha le sosanna, ansin freagra reatha.',
    },
  },
)

export const morningMood = fromAbc(
  'morning-mood',
  `X:1
T:Morning Mood (Peer Gynt)
C:Edvard Grieg
M:6/8
L:1/8
Q:3/8=50
K:G
d2B A2G|A2B d2B|A2G A2B|A2B d2B|d2e B2e|d2B A2G|G6|]`,
  {
    difficulty: 3,
    type: 'classical',
    composer: 'Edvard Grieg (1875)',
    sectionNames: ['Melody'],
    tags: ['classical', 'air'],
    description: {
      en: 'Grieg\'s sunrise, originally a flute solo, so it sits beautifully on the whistle. Smooth slurs between G, A, B and D.',
      ru: 'Рассвет Грига, изначально соло флейты, поэтому на вистле звучит отлично. Плавные переходы между G, A, B и D.',
      ga: 'Éirí gréine Grieg, aonréad fliúite ó thús, mar sin luíonn sé go hálainn ar an bhfeadóg. Ceangail réidhe idir G, A, B agus D.',
    },
  },
)

export const pachelbelCanon = fromAbc(
  'pachelbel-canon',
  `X:1
T:Canon in D (theme)
C:Johann Pachelbel
M:4/4
L:1/4
Q:1/4=60
K:D
f2e2|d2c2|B2A2|B2c2|d2c2|B2A2|G2F2|G2E2||fedc|BABc|dcBA|GFGE|fedc|BABc|dcBA|GFGE|D4|]`,
  {
    difficulty: 3,
    type: 'classical',
    composer: 'Johann Pachelbel (c. 1680)',
    sectionNames: ['Theme', 'Variation'],
    tags: ['classical', 'second octave'],
    description: {
      en: 'The wedding favourite. The descending line from high F#, first in long notes, then twice as fast.',
      ru: 'Любимая свадебная мелодия. Нисходящая линия от верхнего F#: сначала долгими нотами, затем вдвое быстрее.',
      ga: 'Ceann ceanúil na mbainiseacha. An líne ag ísliú ó F# ard, i nótaí fada ar dtús, ansin dhá oiread níos tapúla.',
    },
  },
)

export const minuetInG = fromAbc(
  'minuet-in-g',
  `X:1
T:Minuet in G
C:Christian Petzold (attr. J. S. Bach)
M:3/4
L:1/8
Q:1/4=110
K:G
d2GA Bc|d2G2G2|e2cd ef|g2G2G2|c2dc BA|B2cB AG|F2GA BG|A6|
d2GA Bc|d2G2G2|e2cd ef|g2G2G2|c2dc BA|B2cB AG|A2BA GF|G6|]`,
  {
    difficulty: 3,
    type: 'classical',
    composer: 'Christian Petzold (attr. J. S. Bach)',
    sectionNames: ['Minuet'],
    tags: ['classical', 'waltz'],
    description: {
      en: 'The minuet from Anna Magdalena Bach\'s notebook. Graceful runs across both octaves and a C natural.',
      ru: 'Менуэт из нотной тетради Анны Магдалены Бах. Изящные пассажи через обе октавы и C natural.',
      ga: 'An mionuéid as leabhar nótaí Anna Magdalena Bach. Ritheanna galánta thar an dá ochtach agus C nádúrtha.',
    },
  },
)

export const greensleeves = fromAbc(
  'greensleeves',
  `X:1
T:Greensleeves
M:6/8
L:1/8
Q:3/8=60
K:Ador
A|c2d e>fe|d2B G>AB|c2A A>^GA|B2^G E2A|c2d e>fe|d2B G>AB|c>BA ^G>FG|A3 A2||
g3 g>fe|d2B G>AB|c2A A>^GA|B2^G E3|g3 g>fe|d2B G>AB|c>BA ^G>FG|A3 A2|]`,
  {
    difficulty: 4,
    type: 'song',
    composer: 'Traditional English (16th c.)',
    sectionNames: ['Verse', 'Refrain'],
    tags: ['air', 'chromatic', 'dorian'],
    description: {
      en: 'The Tudor ballad in A dorian. Needs a half-holed G# and a cross-fingered C natural: a real chromatic workout.',
      ru: 'Баллада эпохи Тюдоров в ля дорийском. Нужны полузакрытый G# и вилочный C natural: настоящая хроматическая тренировка.',
      ga: 'An bailéad Túdarach in A dórach. Teastaíonn G# leathphoill agus C nádúrtha crosmhéaraithe: fíorchleachtadh crómatach.',
    },
  },
)

/** In rough order of difficulty. */
export const POPULAR_TUNES = [
  twinkle,
  rowYourBoat,
  frereJacques,
  michaelRow,
  londonBridge,
  oldMacDonald,
  jingleBells,
  happyBirthday,
  ohSusanna,
  joyToTheWorld,
  deckTheHalls,
  merryChristmas,
  silentNight,
  drunkenSailor,
  thisOldMan,
  eineKleine,
  morningMood,
  pachelbelCanon,
  minuetInG,
  greensleeves,
]
