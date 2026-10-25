import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'

/*
 * "Kaer Morhen" from The Witcher 3: Wild Hunt. Read from Hound4Sound's video "Tin Whistle Tabs +
 * Tutorial: The Witcher 3: Wild Hunt - Kaer Morhen Theme" (https://www.youtube.com/watch?v=PBLXH_ES6nk),
 * played on a high C whistle, by `npm run transcribe` (scripts/transcribe-video.ts): the tab from the
 * video frames, every duration and breath from the recording, 1 beat = 1 second of the performance
 * at 60 bpm. Notes, octaves and articulation checked by ear; ornaments re-read after fixing the
 * recogniser for crimson serif letters.
 */
const S1 = `t:D+^B5*1.56 -:A+*0.47 -:G+*0.98 -:E+*0.87 -:F+^S3*1.52 -:G+*0.61 -:D+*2.99 z*2.46 | t:C+*0.43 -:D+^C5*1.62 -:A+*0.45 -:G+*0.92 -:E+^C2*0.87 -:F+*0.84 -:E+^C3*0.44 -:D+*0.46 -:C+^S6*2.08 -:D+*2.51 z*2.4 | t:D+*1.46 -:A+*0.51 -:G+ -:E+*0.93 -:F+^S3*1.42 -:G+*0.59 -:D+*2.69 z*2.39 | t:C+*0.51 -:D+*1.43 -:A+*0.46 -:G+*0.91 -:E+^C2*0.9 -:F+*0.88 -:E+^B4*0.48 -:D+*0.49 -:C+^S6*2.28 -:D+*2.28 z*2.13`

const S2 = `t:D+*0.24 -:E+*0.23 -:F+*0.2 -:G+*0.22 -:A+*1.24 -:G+*0.18 -:F+*0.4 -:E+^B4*0.75 -:C+*0.95 -:F+*0.93 -:E+^B4*0.45 -:D+*0.47 -:C+*0.97 -:A*0.97 -:D+*2.52 z*3.41 | t:D+*0.23 -:E+*0.2 -:F+*0.15 -:G+*0.28 -:A+*1.28 -:G+*0.17 -:F+*0.38 -:E+^B4*0.77 -:C+*0.9 -:F+*0.93 -:E+^B4*0.42 -:D+*0.41 -:C+*0.94 -:A*1.02 -:D+*2.62 z*3.27`

const S3 = `t:D^B5*1.46 -:A*0.5 -:G t:C+*0.95 -:A^C1*3.66 z*0.49 | t:D^B5*1.34 -:A*0.48 -:G*0.69 -:A*0.26 t:C+*0.48 -:D+*0.39 -:A^C1*1.39 | -:D*0.47 -:E*0.4 -:F*0.34 -:E^B4*0.55 -:C^C3*0.49 / -:D*0.44 -:C*0.48 -:D*0.46 -:A*0.43 -:G*0.91 -:E*0.83 -:F^C3*1.14 z*0.48 | t:E^S4*0.53 -:F*0.45 -:E^B4*0.43 -:D*0.44 -:C*0.42 -:D^C5*2.65 z*1.52 | t:D+*0.29 -:C+*0.2 -:D+*0.92 -:A+*0.45 -:G+*0.92 -:E+*0.84 | -:F+^C3*0.31 -:E+*0.22 -:F+^S3*0.92 -:G+*0.58 -:D+*0.74 | -:F+^C3*1.01 -:D+^B5*2.71 z*1.88`

const S4 = `t:D+*0.21 -:E+*0.2 -:F+*0.23 -:G+*0.25 -:A+*1.31 -:G+*0.16 -:F+*0.4 -:E+^B4*0.79 -:C+*0.92 -:F+*0.89 -:E+^B4*0.44 -:D+*0.48 -:C+^S6*2.41 -:D+*2.21`

export const kaerMorhen: Tune = {
  id: 'kaer-morhen',
  title: 'Kaer Morhen',
  composer: 'The Witcher 3: Wild Hunt OST · tab: Hound4Sound',
  description: {
    en: 'The theme of the witchers\' keep from The Witcher 3, a slow rubato air in D minor for the high C whistle. Long slurred lines high in the second octave, with taps, cuts and slides.',
    ru: 'Тема крепости ведьмаков из The Witcher 3: медленная мелодия с рубато в ре миноре для вистла High C. Длинные легато высоко во второй октаве, с tap, cut и slide.',
  },
  origin: 'builtin',
  type: 'soundtrack',
  whistle: 'C',
  key: 'Dm',
  bpm: 60,
  difficulty: 4,
  sections: [
    sectionFromTabText('s1', 'Section 1', S1, 'C'),
    sectionFromTabText('s2', 'Section 2', S2, 'C'),
    sectionFromTabText('s3', 'Section 3', S3, 'C'),
    sectionFromTabText('s4', 'Section 4', S4, 'C'),
  ],
  tags: ['game', 'air', 'ornaments', 'second octave', 'C whistle'],
}
