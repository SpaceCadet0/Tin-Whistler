import { parseAbc } from '../../import/abc'
import type { LocalizedText, Tune, TuneType } from '../../music/types'

/**
 * Built-in tunes written in ABC notation (the lingua franca of Irish music) and read with the
 * same parser users import with. Traditional / public-domain melodies. Low octave uses the
 * usual whistle convention: ABC "D" = the whistle's bottom D.
 */
export function fromAbc(
  id: string,
  abc: string,
  meta: { description: LocalizedText; difficulty: number; type?: TuneType; sectionNames?: string[]; tags?: string[]; composer?: string; whistle?: string },
): Tune {
  const { tune } = parseAbc(abc, meta.whistle ?? 'D')
  return {
    ...tune,
    id,
    origin: 'builtin',
    source: undefined,
    createdAt: undefined,
    composer: meta.composer ?? 'Traditional',
    description: meta.description,
    difficulty: meta.difficulty,
    type: meta.type ?? tune.type,
    tags: meta.tags,
    sections: tune.sections.map((s, i) => ({ ...s, id: `s${i + 1}`, name: meta.sectionNames?.[i] ?? s.name })),
  }
}

export const saints = fromAbc(
  'when-the-saints',
  `X:1
T:When the Saints Go Marching In
M:4/4
L:1/4
Q:1/4=110
K:D
z DFG|A4|z DFG|A4|z DFG|A2F2|D2F2|E4|
z FFE|D3D|F2A2|AG3|z FGA|F2D2|E4|D4|]`,
  {
    difficulty: 1,
    type: 'hymn',
    sectionNames: ['Verse'],
    tags: ['song', 'first steps'],
    description: {
      en: 'A cheerful march on five neighbouring notes with plenty of long, easy notes to settle your breath.',
      ru: 'Бодрый марш на пяти соседних нотах. Много длинных лёгких нот, чтобы выровнять дыхание.',
    },
  },
)

export const auldLangSyne = fromAbc(
  'auld-lang-syne',
  `X:1
T:Auld Lang Syne
M:4/4
L:1/8
Q:1/4=80
K:G
D2|G3F G2B2|A3G A2B2|G3G B2d2|e6 e2|d3B B2G2|A3G A2B2|G3E E2D2|G6||
e2|d3B B2G2|A3G A2e2|d3B B2d2|e6 g2|d3B B2G2|A3G A2B2|G3E E2D2|G6|]`,
  {
    difficulty: 2,
    type: 'song',
    composer: 'Traditional Scottish',
    sectionNames: ['Verse', 'Chorus'],
    tags: ['song', 'second octave'],
    description: {
      en: 'The long-short "dotted" rhythm and a leap up to high D, E and G. A friendly first step into the second octave.',
      ru: 'Пунктирный ритм «долго-коротко» и скачки к верхним D, E и G. Дружелюбный первый шаг во вторую октаву.',
    },
  },
)

export const scarboroughFair = fromAbc(
  'scarborough-fair',
  `X:1
T:Scarborough Fair
M:3/4
L:1/4
Q:1/4=96
K:Edor
E2E|B2B|F>GF|E3|B2d|e2d|B^cA|B3||
e2e|e2d|B2B|AGF|E2B|A2G|FED|E3|]`,
  {
    difficulty: 3,
    type: 'song',
    composer: 'Traditional English',
    sectionNames: ['Line 1', 'Line 2'],
    tags: ['song', 'dorian'],
    description: {
      en: 'A haunting ballad in the dorian mode, the sound of so many Irish airs. Uses C# and climbs to high E.',
      ru: 'Задумчивая баллада в дорийском ладу, так звучат многие ирландские мелодии. Есть C# и подъём к верхнему E.',
    },
  },
)

export const cooleysReel = fromAbc(
  'cooleys-reel',
  `X:1
T:Cooley's Reel
R:reel
M:4/4
L:1/8
Q:1/4=180
K:Edor
|:EBBA B2EB|B2AB dBAG|FDAD BDAD|FDAD dAFD|EBBA B2EB|B2AB defg|afec dBAF|DEFD E2:|
|:gf|eB~B2 efge|eB~B2 gedB|A2FA DAFA|A2FA defg|eB~B2 efge|eB~B2 defg|afec dBAF|DEFD E2:|`,
  {
    difficulty: 4,
    tags: ['irish', 'reel', 'session', 'rolls'],
    description: {
      en: 'A classic session reel in E dorian. Driving eighth notes, octave jumps and rolls on the long Bs.',
      ru: 'Классический сейшен-рил в ми дорийском. Напористые восьмые, октавные скачки и rolls на длинных B.',
    },
  },
)

export const butterfly = fromAbc(
  'the-butterfly',
  `X:1
T:The Butterfly
R:slip jig
M:9/8
L:1/8
Q:3/8=100
K:Em
|:B2E G2E F3|B2E G2E FED|B2E G2E F3|B2d d2B AFD:|
|:B2d e2f g3|B2d g2e dBA|B2d e2f g2a|b2a g2e dBA:|
|:B3 B2A G2A|B3 BAB dBA|B3 B2A G2A|B2d g2e dBA:|`,
  {
    difficulty: 5,
    tags: ['irish', 'slip jig', 'session'],
    description: {
      en: 'A beloved slip jig in 9/8 with three parts. Floating rhythm, fast finger work and the top of the range up to high B.',
      ru: 'Любимый слип-джиг на 9/8 из трёх частей. Парящий ритм, быстрые пальцы и верх диапазона до верхнего B.',
    },
  },
)
