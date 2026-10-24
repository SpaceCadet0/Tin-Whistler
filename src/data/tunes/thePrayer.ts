import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'

/*
 * "The Prayer", the Swamp theme of Heroes of Might and Magic IV (also heard in Lineage II).
 * Tab read from Hound4Sound's video "Tin Whistle Tabs + Tutorial: HoMM IV/Lineage II - Swamp
 * Lands Theme (The Prayer)", which is played on a high C whistle. Kept with the same fingerings
 * on the D whistle (everything sounds a tone higher). Every duration and breath was measured
 * from the recording's pitch track (note onsets aligned to the tab, 10 ms grid), stored in
 * beats at 60 bpm, so 1 beat = 1 second of the performance. [011111] = the tab's cross-fingered
 * high D. "t"/"r"/"-" = tu / du·ru / slur, ^C/^S = cut/slide with the ringed hole; a slide
 * glides into the following note.
 */
const S1 = `t:E*0.43 r:E*1.32 -:B*0.36 r:B*0.45 -:A*0.34 r:A*0.49 -:G*0.35 r:G*2.28 z*0.64 | t:F#*0.2 -:G*0.26 -:A*2.05 | t:B*0.22 -:A*0.26 r:G*0.44 -:A*0.46 t:B*2.61 z*0.39 | t:E*0.46 r:E*0.46 -:B*0.37 r:B*0.46 -:A*0.35 r:A*0.44 -:G*0.32 r:G*0.41 -:F#^C3*0.36 -:G^C3*2.56 z*0.42 | t:F#*0.15 -:G*0.3 -:A*2.04 | t:B*0.19 -:A*0.22 r:G*0.44 -:A*0.47 t:B*2.52 z*0.66
/ t:B*0.49 r:B*1.4 -:E+*0.4 r:E+*0.5 -:D+[011111]*0.4 r:D+[011111]*0.5 -:B*1.69 r:B*1.13 z*0.45 | t:D+[011111]*0.23 r:D+[011111]*0.67 -:C#*0.41 r:C#*1.37 | -:A*0.38 r:A*1.27 | -:G^C2*0.98 r:G*0.69 | -:F#^C3*0.67 r:F#*1.02 z*0.42 | t:E*1.3 -:B*0.43 r:B*0.34 -:A^C1*0.34 r:A*0.43 -:G^C2*1.43 r:G*1.29 z*0.45 | t:F#*0.57 r:F#*1.26 -:D*0.35 r:D^S6*2.01 -:E*3.68 z*1.08`

const S2 = `t:E+*0.22 -:F#+*0.26 t:G+*1.45 | -:E+^S5*0.11 -:F#+*0.28 r:G+*1.37 -:F#+^C3*1.47 r:G+*0.13 -:E+^C3*0.26 z*0.51 | t:E+^S5*0.39 -:F#+*0.97 -:G+^C3*0.17 -:F#+*0.2 -:E+*0.14 -:D+[011111]*0.55 | t:B*0.28 t:A^S2*0.76 | -:B*0.32 t:F#*2.84 z*0.58
/ t:E+^S2*1.23 -:B+*0.41 r:B+*0.41 -:A+*0.3 r:A+*0.45 -:G+^C2*0.36 r:G+*2.24 z*0.33 | t:A+*0.16 -:G+*0.19 r:F#+*0.11 -:G+*0.28 t:A+*2.19 -:B+*0.07 -:A+*0.22 r:G+*0.42 -:A+*0.47 t:B+*2.81 z*0.6 | t:E+*0.38 r:E+*0.42 -:B+*0.34 r:B+*0.39 -:A+^C1*0.34 r:A+*0.35 -:G+^C2*0.18 -:F#+^S4*0.3 -:G+*2.26 z*0.4 | t:A+*0.2 -:G+*0.18 r:F#+*0.15 -:G+^S3*0.48 -:A+*2.25 -:B+*0.08 -:A+*0.25 r:G+*0.48 -:A+^S2*0.86 -:B+*2.22 z*1.1`

const S3 = `t:B*0.27 r:B*1.5 -:E+*0.34 r:E+*0.45 -:D+[011111]*0.4 r:D+[011111]*0.44 -:E+*0.59 -:B*2.46 z*0.4 | t:D+[011111]*0.44 r:D+[011111]*1.28 | -:C#*0.38 r:C#*1.36 | -:A*0.38 r:A*0.84 | -:G^C2*1.32 -:F#^C3*1.59 -:E^C4*0.98 z*0.45 | t:B*0.42 r:B*0.35 -:A^C1*0.51 r:A*0.17 -:G^C2*1.44 r:G*0.46 -:F#^C3*0.89 -:D^S6*0.71 -:E*1.09 z*0.4
/ t:E+*0.23 -:F#+*0.15 -:G+*1.29 | t:E+*0.16 -:F#+*0.32 t:G+*0.23 t:F#+*0.19 t:E+*0.17 t:D+[011111]*0.22 t:F#+*0.19 t:D+[011111]*0.23 t:B*0.2 t:A*0.19 t:G*0.28 t:F#*2.63 z*0.48`

const S4 = `t:D*0.47 r:E*1.39 t:B*0.35 r:B*0.43 -:A^C1*0.32 r:A*0.3 -:G^C2*0.19 -:F#^S4*0.33 -:G*1.03 z*0.42 | t:B*0.41 r:B*0.32 -:A*0.84 | -:A^C2*0.22 -:G*0.15 | -:G^C3*0.88 -:F#*1.4 z*0.35 | t:F#+*0.44 r:F#+*1.4 -:D+[011111]*0.37 r:D+^S6[011111]*2.25 -:E+*3.36`

export const thePrayer: Tune = {
  id: 'the-prayer',
  title: 'The Prayer (Swamp)',
  composer: 'Paul Romero & Rob King (Heroes of Might and Magic IV OST) · tab: Hound4Sound',
  description: {
    en: 'The Swamp theme from Heroes of Might and Magic IV. A slow, rubato air in E: soft "du" and "ru" repeats, cuts, slow slides and a long climb to high B.',
    ru: 'Тема Болота из Heroes of Might and Magic IV. Медленная мелодия с рубато в ми: мягкие повторы «du» и «ru», cut, медленные slide и долгий подъём к верхнему B.',
  },
  origin: 'builtin',
  type: 'soundtrack',
  whistle: 'D',
  key: 'Em',
  bpm: 60,
  difficulty: 4,
  sections: [
    sectionFromTabText('s1', 'Section 1', S1),
    sectionFromTabText('s2', 'Section 2', S2),
    sectionFromTabText('s3', 'Section 3', S3),
    sectionFromTabText('s4', 'Section 4', S4),
  ],
  tags: ['game', 'air', 'ornaments', 'second octave'],
}
