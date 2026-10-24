import { fromAbc } from './abcTunes'

/*
 * Session dance tunes: reels, a polka and a slide. Transcribed by hand from open sources
 * (reference/abc); chord symbols are kept, the parser skips them.
 */

export const denisMurphysSlide = fromAbc(
  'denis-murphys-slide',
  `X:1
T:Denis Murphy's
R:slide
M:12/8
L:1/8
K:Dmaj
B|:"D"A2 D FED F2 A A2 f|"Em"g2 e f2 d "A"e2 d Bcd|
"D"A2 D FED F2 A A2 f|"A"a2 f efe "D"d3 [1dcB:|2 d2||
|:A|d2 e f2 f gfe f2 f|"Em"gfe fed "A"e2 d BAB|
"D"d2 e f2 f gfe f2 g|"A"a2 f efe "D"~d3 d2:|`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'slide', 'session'],
    description: {
      en: 'A Kerry slide in 12/8: long-short skipping rhythm, a climb to high A and a roll to finish the B part.',
      ru: 'Керрийский слайд на 12/8: прыгающий ритм «долго-коротко», подъём к верхнему A и roll в конце второй части.',
    },
  },
)

export const siegeOfEnnis = fromAbc(
  'siege-of-ennis',
  `X:1
T:The Siege of Ennis
R:polka
M:2/4
L:1/8
K:Dmaj
|:A>B AG|FA de|fa/f/ ef/e/|dB Bd|
A>B AG|FA de|fa/f/ ef/e/|1 d2 dB:|2 d2 de||
fa af|gb ba|fa/f/ ef/e/|dB Bd|
fa af|gb b>c'|d'/c'/b c'a|b2 bc'|
d'b c'a|ba fe|fa/f/ ef/e/|dB Bd|
A>B AG|FA de|fa/f/ ef/e/|d4 ||`,
  {
    difficulty: 3,
    composer: 'Traditional Irish',
    tags: ['irish', 'polka', 'set dance', 'second octave'],
    description: {
      en: 'The polka for the famous céilí dance. Bouncy sixteenths and a B part that lives high in the second octave; the top D is folded down an octave to stay on the whistle.',
      ru: 'Полька к знаменитому кейли-танцу. Подпрыгивающие шестнадцатые и вторая часть высоко во второй октаве; верхнее D перенесено на октаву ниже, чтобы остаться в диапазоне вистла.',
    },
  },
)

export const tamLin = fromAbc(
  'tam-lin',
  `X:1
T:Tam Lin
R:reel
M:4/4
L:1/8
K:Dmin
|:A,2DA, FA,DA,|B,2DB, FB,DB,|C2EC FCEC|FEDC A,DDC|
A,2DA, FA,DA,|B,2DB, FB,DB,|C2EC FCEC|1 FEDC D2C2:|2 FEDC D2A2||
|:dcAG F2D2|dcAG F2D2|cG (3GGG cGcd|edeg fedc|
dcAG F2D2|dcAG F2D2|B,A,B,C DCDE|1 FEDC D2 A2:|2 FEDC D2z2||`,
  {
    difficulty: 5,
    whistle: 'G',
    transpose: 0,
    composer: 'Davy Arthur',
    tags: ['reel', 'session', 'minor', 'G whistle'],
    description: {
      en: 'The "Glasgow Reel": a dark minor reel that drives off a low pedal note. Its D minor runs below a D whistle, so it is set for a G whistle in the key sessions play it in, with a half-holed B flat.',
      ru: '«Глазго-рил»: тёмный минорный рил, который раскачивается от низкой педальной ноты. Его ре минор уходит ниже D-вистла, поэтому он записан для G-вистла в той тональности, в которой его играют на сейшенах, с полузакрытым B♭.',
    },
  },
)

export const saintAnnes = fromAbc(
  'saint-annes-reel',
  `X:1
T:Saint Anne's Reel
R:reel
M:4/4
L:1/8
K:Dmaj
|:fedf edcB|A2FA DAFA|B2GB EBGB|A2FA DAFA|
fedf edcB|A2FA DAFA|BGed cABc|eddc d2 de:|
|:f2fg fedc|Bggf g2gf|edcB ABce|baa^g aba=g|
f2fg fedc|Bggf g2gf|edcB ABcd|eddc d2 de:|`,
  {
    difficulty: 4,
    composer: 'Traditional',
    tags: ['reel', 'session', 'french canadian'],
    description: {
      en: 'A sunny reel loved from Quebec to Ireland. Broken-chord runs down from high F#, and a G# that needs a half-holed note.',
      ru: 'Солнечный рил, который любят от Квебека до Ирландии. Пробежки по аккордам вниз от верхнего F# и G#, который берётся полузакрытым отверстием.',
    },
  },
)

export const musicalPriest = fromAbc(
  'musical-priest',
  `X:1
T:The Musical Priest
R:reel
M:4/4
L:1/8
K:Bmin
E|:FBBA ~B3d|cBAf ecBA|FBBA ~B3d|1 cBAc B2BA:|2 cBAc ~B3c||
|:d2dc dfed|c/B/A eA fAeA|dcBc defb|1 afec B2Bc:|2 cBAc ~B3c||
|:dB~B2 bafb|afec AB{c}BA|dB~B2 bafb|1 afec B2Bc:|2 afec B2BA||`,
  {
    difficulty: 5,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session', 'rolls', 'minor'],
    description: {
      en: 'A three-part reel in B minor, full of rolls on B. The third part leaps to high B and back again and again.',
      ru: 'Рил из трёх частей в си миноре, полный rolls на B. В третьей части мелодия снова и снова прыгает к верхнему B и обратно.',
    },
  },
)

export const windThatShakesTheBarley = fromAbc(
  'wind-that-shakes-the-barley',
  `X:1
T:The Wind That Shakes the Barley
R:reel
M:4/4
L:1/8
K:Dmaj
"D"A2AB AFEF|"B"DBBA "G"BcdB|"F"PAGAB "D"ADFA|"A"gfed BcdB|
"D"PA2FA DAFA|"B"GB BA "D"BcdB|"F"PA2FA ADFA|"A"gfed Bcde||
"D"fAdf "G"Pgfge|"F"fd Md2"E"Bcde|"D"fAdf "G"gefg|"A"afed "D"Bcde|
"D"fd Md2P"G"gfge|"F"fd Md2"E"Bcde|"D"fd Md2"G"efge|"A"afed "D"BcdB||`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session', 'cuts'],
    description: {
      en: 'One of the best-known reels in the session repertoire. Cuts on the long As and taps on the repeated Ds give it its lift.',
      ru: 'Один из самых известных рилов сейшен-репертуара. Cuts на длинных A и taps на повторяющихся D дают ему упругость.',
    },
  },
)

export const maidBehindTheBar = fromAbc(
  'maid-behind-the-bar',
  `X:1
T:The Maid Behind the Bar
R:reel
M:4/4
L:1/8
K:Dmaj
|:FAAB AFED|FAAB Azde|fBBA Bcde|fdgf efdB|
FAAB AzED|FAAB Azde|fBBA BcdB|AFEF D3z:|
|:faag fdde|fdad fddz|efga beef|gebe geez|
faaf bzaf|defd ezde|fBBA Bcdz|AFEF D3z:|`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session'],
    description: {
      en: 'A favourite reel with short breaths built in: the little rests are where you sneak a breath without losing the beat.',
      ru: 'Любимый рил со встроенными вдохами: короткие паузы как раз для того, чтобы успеть вдохнуть, не теряя ритм.',
    },
  },
)

export const banshee = fromAbc(
  'the-banshee',
  `X:1
T:The Banshee
R:reel
M:4/4
L:1/8
K:Gmaj
|:G2 GD EDEG|AGAB d2 Bd|eged BAGA|BAGE EDDE|
G2 GD EDEG|AGAB d2 Bd|eged BAGA|BAGE ED D2:|
|:ea a2 efgf|eBBA B2 Bd|eB B2 efgf|eBBA B2 Bd|
ea a2 efgf|eBBA B2 Bd|eged BAGA|BAGE EDD2:|`,
  {
    difficulty: 4,
    composer: 'James McMahon',
    tags: ['reel', 'session'],
    description: {
      en: 'A flowing G-major reel. The A part rocks between G and low D; the B part jumps up to high A over and over.',
      ru: 'Плавный рил в соль мажоре. Первая часть покачивается между G и нижним D, вторая раз за разом прыгает к верхнему A.',
    },
  },
)

export const fatherKellys = fromAbc(
  'father-kellys',
  `X:1
T:Father Kelly's
R:reel
M:4/4
L:1/8
K:Gmaj
|:B2GB AGEG|DGGF G2AB|c2AB cBAG|EAAG FDGA|
B2GB AGEG|DGGF GABc|d2Bd gdBd|1 cAFA ~G3A:|2 cAFA GABc||
|:d2Bd gdBd|d2Bd gdBd|e2ce agfe|defg agfe|
d2Bd gdBd|d2Bd gdBd|c2Ac BAGB|1 AGFA GABc:|2 AGFA ~G3A||`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session', 'rolls'],
    description: {
      en: 'A G-major reel with a cross-fingered C natural and a roll on G closing the A part. The B part circles around high G.',
      ru: 'Рил в соль мажоре с натуральным C (вилочная аппликатура) и roll на G в конце первой части. Вторая часть кружит вокруг верхнего G.',
    },
  },
)

export const morningDew = fromAbc(
  'morning-dew',
  `X:1
T:The Morning Dew
R:reel
M:4/4
L:1/8
K:Edor
|:E3B2AFD|EDEB BAFD|E3B2AFA|BcdB AFDF:|
B2eB fBeB|B2eB AFDF|B2eB fBeB|BcdB AFDF|
B2eB fBeB|B2eB AFDF|Bdeg fdec|d2dA BAFD|
B2EB GBEB|B2EB AFDF|B2EB GBEB|BcdB AFDF|
B2EB GBEB|B2EB AFDF|Bdeg fdec|d2dA BAFD|
|:BAGF EFGA|B2GB A2GA|BAGF EFGA|BcdB AFDF:|`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session', 'dorian'],
    description: {
      en: 'An E dorian reel built on a ringing B: the long middle part keeps returning to it, first an octave up, then down low.',
      ru: 'Рил в ми дорийском, построенный вокруг звонкого B: длинная средняя часть постоянно к нему возвращается, сначала октавой выше, потом внизу.',
    },
  },
)

export const drowsyMaggie = fromAbc(
  'drowsy-maggie',
  `X:1
T:Drowsy Maggie
R:reel
M:4/4
L:1/8
K:Dmaj
|:E2BE dEBE|E2BE AFDF|E2BE dEBE|1 BABc dAFD:|2 BABc dAFA||
d2fd B/c/d ec|defg afge|d2fd B/c/d ec|BABc dAFA|
d2fd B/c/d ec|defg afge|afge fdec|BABc dAFA||
dBfB dBfB|cAeA fAeA|dBfB dBfB|fef^g aecA|
dBfB dBfB|cAeA fAeA|defd B/c/d ec|BABc dAFD||`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session'],
    description: {
      en: 'A session staple: the A part bounces off low E, the later parts swap between a high melody and a drone note in quick alternation.',
      ru: 'Обязательный сейшен-рил: первая часть отталкивается от нижнего E, дальше мелодия быстро чередуется с повторяющейся опорной нотой.',
    },
  },
)

export const silverSpear = fromAbc(
  'silver-spear',
  `X:1
T:The Silver Spear
R:reel
M:4/4
L:1/8
K:Dmaj
|:FA A2 BAFA|dfed BddA|FA A2 BAFA|dfed B2 AG|
FA A2 BAFA|dfed Bdef|g3 e f3 e|1 dfed B2 AG:|2 dfed Bcde||
|:fa a2 bfaf|gfed Bdde|faaf bfaf|gfed B2 A2|
fa a2 bfaf|gfed Bdef|g3 e f3 e|1 dfed B2 A2:|2 dfed B2 AG||`,
  {
    difficulty: 4,
    composer: 'Traditional Irish',
    tags: ['irish', 'reel', 'session'],
    description: {
      en: 'A cheerful D-major reel and a great first "real" reel: clear phrases, long notes to land on and a B part up to high B.',
      ru: 'Весёлый рил в ре мажоре и отличный первый «настоящий» рил: понятные фразы, длинные ноты-опоры и вторая часть до верхнего B.',
    },
  },
)

export const SESSION_TUNES = [
  denisMurphysSlide,
  siegeOfEnnis,
  silverSpear,
  maidBehindTheBar,
  windThatShakesTheBarley,
  drowsyMaggie,
  banshee,
  fatherKellys,
  saintAnnes,
  morningDew,
  musicalPriest,
  tamLin,
]
