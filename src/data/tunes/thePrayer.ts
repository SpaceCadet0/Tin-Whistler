import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'

/*
 * "The Prayer", the Swamp theme of Heroes of Might and Magic IV (also heard in Lineage II).
 * Tab read from Hound4Sound's video "Tin Whistle Tabs + Tutorial: HoMM IV/Lineage II - Swamp
 * Lands Theme (The Prayer)", which is played on a high C whistle, as it is here: the note names
 * are C-whistle pitches (a tone below the same fingerings on a D whistle). Every duration and breath was measured
 * from the recording's pitch track (note onsets aligned to the tab, 10 ms grid), stored in
 * beats at 60 bpm, so 1 beat = 1 second of the performance. [011111] = the tab's cross-fingered
 * high C. "t"/"r"/"-" = tu / du·ru / slur, ^C/^S = cut/slide with the ringed hole; a slide
 * glides into the following note.
 */
const S1 = `t:D*0.43 r:D*1.32 -:A*0.36 r:A*0.45 -:G*0.34 r:G*0.49 -:F*0.35 r:F*2.28 z*0.64 | t:E*0.2 -:F*0.26 -:G*2.05 | t:A*0.22 -:G*0.26 r:F*0.44 -:G*0.46 t:A*2.61 z*0.39 | t:D*0.46 r:D*0.46 -:A*0.37 r:A*0.46 -:G*0.35 r:G*0.44 -:F*0.32 r:F*0.41 -:E^C3*0.36 -:F^C3*2.56 z*0.42 | t:E*0.15 -:F*0.3 -:G*2.04 | t:A*0.19 -:G*0.22 r:F*0.44 -:G*0.47 t:A*2.52 z*0.66
/ t:A*0.49 r:A*1.4 -:D+*0.4 r:D+*0.5 -:C+[011111]*0.4 r:C+[011111]*0.5 -:A*1.69 r:A*1.13 z*0.45 | t:C+[011111]*0.23 r:C+[011111]*0.67 -:B*0.41 r:B*1.37 | -:G*0.38 r:G*1.27 | -:F^C2*0.98 r:F*0.69 | -:E^C3*0.67 r:E*1.02 z*0.42 | t:D*1.3 -:A*0.43 r:A*0.34 -:G^C1*0.34 r:G*0.43 -:F^C2*1.43 r:F*1.29 z*0.45 | t:E*0.57 r:E*1.26 -:C*0.35 r:C^S6*2.01 -:D*3.68 z*1.08`

const S2 = `t:D+*0.22 -:E+*0.26 t:F+*1.45 | -:D+^S5*0.11 -:E+*0.28 r:F+*1.37 -:E+^C3*1.47 r:F+*0.13 -:D+^C3*0.26 z*0.51 | t:D+^S5*0.39 -:E+*0.97 -:F+^C3*0.17 -:E+*0.2 -:D+*0.14 -:C+[011111]*0.55 | t:A*0.28 t:G^S2*0.76 | -:A*0.32 t:E*2.84 z*0.58
/ t:D+^S2*1.23 -:A+*0.41 r:A+*0.41 -:G+*0.3 r:G+*0.45 -:F+^C2*0.36 r:F+*2.24 z*0.33 | t:G+*0.16 -:F+*0.19 r:E+*0.11 -:F+*0.28 t:G+*2.19 -:A+*0.07 -:G+*0.22 r:F+*0.42 -:G+*0.47 t:A+*2.81 z*0.6 | t:D+*0.38 r:D+*0.42 -:A+*0.34 r:A+*0.39 -:G+^C1*0.34 r:G+*0.35 -:F+^C2*0.18 -:E+^S4*0.3 -:F+*2.26 z*0.4 | t:G+*0.2 -:F+*0.18 r:E+*0.15 -:F+^S3*0.48 -:G+*2.25 -:A+*0.08 -:G+*0.25 r:F+*0.48 -:G+^S2*0.86 -:A+*2.22 z*1.1`

const S3 = `t:A*0.27 r:A*1.5 -:D+*0.34 r:D+*0.45 -:C+[011111]*0.4 r:C+[011111]*0.44 -:D+*0.59 -:A*2.46 z*0.4 | t:C+[011111]*0.44 r:C+[011111]*1.28 | -:B*0.38 r:B*1.36 | -:G*0.38 r:G*0.84 | -:F^C2*1.32 -:E^C3*1.59 -:D^C4*0.98 z*0.45 | t:A*0.42 r:A*0.35 -:G^C1*0.51 r:G*0.17 -:F^C2*1.44 r:F*0.46 -:E^C3*0.89 -:C^S6*0.71 -:D*1.09 z*0.4
/ t:D+*0.23 -:E+*0.15 -:F+*1.29 | t:D+*0.16 -:E+*0.32 t:F+*0.23 t:E+*0.19 t:D+*0.17 t:C+[011111]*0.22 t:E+*0.19 t:C+[011111]*0.23 t:A*0.2 t:G*0.19 t:F*0.28 t:E*2.63 z*0.48`

const S4 = `t:C*0.47 r:D*1.39 t:A*0.35 r:A*0.43 -:G^C1*0.32 r:G*0.3 -:F^C2*0.19 -:E^S4*0.33 -:F*1.03 z*0.42 | t:A*0.41 r:A*0.32 -:G*0.84 | -:G^C2*0.22 -:F*0.15 | -:F^C3*0.88 -:E*1.4 z*0.35 | t:E+*0.44 r:E+*1.4 -:C+[011111]*0.37 r:C+^S6[011111]*2.25 -:D+*3.36`

export const thePrayer: Tune = {
  id: 'the-prayer',
  title: 'The Prayer (Swamp)',
  composer: 'Paul Romero & Rob King (Heroes of Might and Magic IV OST) · tab: Hound4Sound',
  description: {
    en: 'The Swamp theme from Heroes of Might and Magic IV. A slow, rubato air in D minor for the high C whistle: soft "du" and "ru" repeats, cuts, slow slides and a long climb to high A.',
    ru: 'Тема Болота из Heroes of Might and Magic IV. Медленная мелодия с рубато в ре миноре для вистла High C: мягкие повторы «du» и «ru», cut, медленные slide и долгий подъём к верхнему A.',
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
