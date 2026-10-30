import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'

/* Public-domain melodies and original exercises. One beat = one quarter note unless noted. */

export const hotCrossBuns: Tune = {
  id: 'hot-cross-buns',
  title: 'Hot Cross Buns',
  composer: 'Traditional',
  description: {
    en: 'Your very first tune: only three notes, B, A and G.',
    ru: 'Самая первая мелодия: всего три ноты, B, A и G.',
    ga: 'Do chéad fhonn ar fad: trí nóta amháin, B, A agus G.',
  },
  origin: 'builtin',
  type: 'children',
  whistle: 'D',
  key: 'G',
  meter: '4/4',
  bpm: 80,
  beatsPerBar: 4,
  difficulty: 1,
  sections: [
    sectionFromTabText(
      's1',
      'Whole tune',
      `t:B t:A t:G*2 | t:B t:A t:G*2 / t:G*0.5 t:G*0.5 t:G*0.5 t:G*0.5 t:A*0.5 t:A*0.5 t:A*0.5 t:A*0.5 | t:B t:A t:G*2`,
    ),
  ],
  tags: ['first steps'],
}

export const maryLamb: Tune = {
  id: 'mary-had-a-little-lamb',
  title: 'Mary Had a Little Lamb',
  composer: 'Traditional',
  description: {
    en: 'Four notes of the lower hand: D, E, F# and A. Great for practising covering the bottom holes.',
    ru: 'Четыре ноты нижней руки: D, E, F# и A. Отлично тренирует закрытие нижних отверстий.',
    ga: 'Ceithre nóta den lámh íochtair: D, E, F# agus A. Iontach chun clúdach na bpoll íochtair a chleachtadh.',
  },
  origin: 'builtin',
  type: 'children',
  whistle: 'D',
  key: 'D',
  meter: '4/4',
  bpm: 90,
  beatsPerBar: 4,
  difficulty: 1,
  sections: [
    sectionFromTabText(
      's1',
      'Verse',
      `t:F# t:E t:D t:E | t:F# t:F# t:F#*2 | t:E t:E t:E*2 | t:F# t:A t:A*2
       / t:F# t:E t:D t:E | t:F# t:F# t:F# t:F# | t:E t:E t:F# t:E | t:D*4`,
    ),
  ],
  tags: ['first steps'],
}

export const odeToJoy: Tune = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  composer: 'L. van Beethoven',
  description: {
    en: 'Five neighbouring notes, step by step. A classic for smooth finger changes.',
    ru: 'Пять соседних нот шаг за шагом. Классика для плавной смены пальцев.',
    ga: 'Cúig nóta in aice a chéile, céim ar chéim. Clasaiceach d’athruithe réidhe méar.',
  },
  origin: 'builtin',
  type: 'classical',
  whistle: 'D',
  key: 'D',
  meter: '4/4',
  bpm: 96,
  beatsPerBar: 4,
  difficulty: 2,
  sections: [
    sectionFromTabText(
      's1',
      'Part A',
      `t:F# t:F# t:G t:A | t:A t:G t:F# t:E | t:D t:D t:E t:F# | t:F#*1.5 -:E*0.5 t:E*2
       / t:F# t:F# t:G t:A | t:A t:G t:F# t:E | t:D t:D t:E t:F# | t:E*1.5 -:D*0.5 t:D*2`,
    ),
    sectionFromTabText(
      's2',
      'Part B',
      `t:E t:E t:F# t:D | t:E -:F#*0.5 -:G*0.5 t:F# t:D | t:E -:F#*0.5 -:G*0.5 t:F# t:E | t:D t:E t:A*2
       / t:F# t:F# t:G t:A | t:A t:G t:F# t:E | t:D t:D t:E t:F# | t:E*1.5 -:D*0.5 t:D*2`,
    ),
  ],
  tags: ['classic'],
}

export const amazingGrace: Tune = {
  id: 'amazing-grace',
  title: 'Amazing Grace',
  composer: 'Traditional',
  description: {
    en: 'A slow song in 3/4 that visits the high D. Practise long, steady notes and a gentle octave jump.',
    ru: 'Медленная песня на 3/4 с верхним D. Тренирует длинные ровные ноты и мягкий переход в верхнюю октаву.',
    ga: 'Amhrán mall in 3/4 a thugann cuairt ar D ard. Cleachtaigh nótaí fada seasta agus léim réidh ochtaigh.',
  },
  origin: 'builtin',
  type: 'hymn',
  whistle: 'D',
  key: 'G',
  meter: '3/4',
  bpm: 84,
  beatsPerBar: 3,
  difficulty: 2,
  sections: [
    sectionFromTabText(
      's1',
      'Line 1',
      `t:D | t:G*2 -:B*0.5 -:G*0.5 | t:B*2 t:A | t:G*2 t:E | t:D*2 t:D | t:G*2 -:B*0.5 -:G*0.5 | t:B*2 t:A | t:D+*5`,
    ),
    sectionFromTabText(
      's2',
      'Line 2',
      `t:B | t:D+*2 -:B*0.5 -:D+*0.5 | t:B*2 t:A | t:G*2 t:E | t:D*2 t:D | t:G*2 -:B*0.5 -:G*0.5 | t:B*2 t:A | t:G*3`,
    ),
  ],
  tags: ['song', 'second octave'],
}

export const strandPolka: Tune = {
  id: 'strand-polka',
  title: 'Strand Polka',
  composer: 'Tin Whistler exercise',
  description: {
    en: 'A short original polka in the Irish style: bouncy eighth notes on D, E, F#, G and A.',
    ru: 'Короткая оригинальная полька в ирландском стиле: пружинистые восьмые на D, E, F#, G и A.',
    ga: 'Polca gearr bunaidh sa stíl Ghaelach: ochtú nótaí preabacha ar D, E, F#, G agus A.',
  },
  origin: 'builtin',
  type: 'polka',
  whistle: 'D',
  key: 'D',
  meter: '2/4',
  bpm: 100,
  beatsPerBar: 2,
  difficulty: 2,
  sections: [
    sectionFromTabText(
      's1',
      'Part A',
      `t:A*0.5 t:F#*0.5 t:A*0.5 t:F#*0.5 | t:G*0.5 t:E*0.5 t:E | t:A*0.5 t:F#*0.5 t:A*0.5 t:F#*0.5 | t:E*0.5 t:F#*0.5 t:D
       / t:A*0.5 t:F#*0.5 t:A*0.5 t:F#*0.5 | t:G*0.5 t:E*0.5 t:E | t:F#*0.5 t:G*0.5 t:A*0.5 t:F#*0.5 | t:E*0.5 -:D*0.5 t:D`,
    ),
    sectionFromTabText(
      's2',
      'Part B',
      `t:D*0.5 t:E*0.5 t:F#*0.5 t:G*0.5 | t:A t:A | t:B*0.5 t:A*0.5 t:G*0.5 t:F#*0.5 | t:E t:E
       / t:D*0.5 t:E*0.5 t:F#*0.5 t:G*0.5 | t:A*0.5 t:B*0.5 t:A | t:F#*0.5 t:E*0.5 t:F#*0.5 t:E*0.5 | t:D t:D`,
    ),
  ],
  tags: ['irish', 'polka'],
}

/** The Kesh (trad. Irish jig). One beat = one eighth note; metronome clicks every 3. */
export const keshJig: Tune = {
  id: 'kesh-jig',
  title: 'The Kesh',
  composer: 'Traditional Irish jig',
  description: {
    en: 'One of the most-played session jigs. Uses both octaves and the lilting "long-short" jig feel.',
    ru: 'Один из самых популярных джигов на сейшенах. Обе октавы и характерный «качающийся» ритм джиги.',
    ga: 'Ceann de na poirt seisiúin is mó a sheinntear. Úsáideann sé an dá ochtach agus mothú luascach «fada-gearr» an phoirt.',
  },
  origin: 'builtin',
  type: 'jig',
  whistle: 'D',
  key: 'G',
  meter: '6/8',
  bpm: 240,
  pulse: 3,
  beatsPerBar: 6,
  difficulty: 3,
  sections: [
    {
      ...sectionFromTabText(
        'sA',
        'A part',
        `t:G*3 t:G -:A -:B | t:A^C3*3 t:A -:B t:D+ | t:E+ -:D+ t:D+ t:G+ -:D+ t:D+ | t:E+ -:D+ t:B t:D+ -:B t:A
         / t:G -:A t:G t:G -:A -:B | t:A^C3*3 t:A -:B t:D+ | t:E+ -:D+ t:B t:D+ -:B t:A | t:B -:G t:G t:G*3`,
      ),
      repeat: 2,
    },
    {
      ...sectionFromTabText(
        'sB',
        'B part',
        `t:B -:A t:B t:D+ -:B t:D+ | t:E+ -:G+ t:E+ t:D+ -:B t:D+ | t:B -:A t:B t:D+ -:B t:G | t:A -:B t:A t:A -:G t:A
         / t:B -:A t:B t:D+ -:B t:D+ | t:E+ -:G+ t:E+ t:D+ -:B t:D+ | t:G+ -:F#+ t:G+ t:A+ -:G+ t:A+ | t:B+ -:G+ t:G+ t:G+*3`,
      ),
      repeat: 2,
    },
  ],
  tags: ['irish', 'jig', 'session'],
}
