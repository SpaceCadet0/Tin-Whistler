import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'
import { HOUND4SOUND } from './credits'

/*
 * "Tragic Love", the login screen theme of Lineage II: Freya. Tab read from Hound4Sound's video
 * "Tin Whistle Tabs + Tutorial: Lineage 2 - Freya Login Screen Theme (Tragic Love)", played on a
 * low D whistle (scripts/transcribe-video.ts with the three tab pages as --pages, --whistle lowD).
 * The video switches whistles: groups drawn in dark blue are played on the low D, groups in light
 * blue on a high D. Here it is all one low D part: the light groups of page 2 sound the same in its
 * second octave; those of page 3 (the "Ascending Scale Run" and after) reach above the low D's
 * range, so they are written an octave lower, keeping the phrase in one piece. Octaves and lengths
 * were measured from the recording (a sixteenth grid at 77 bpm). The recogniser read the ornament
 * words ("Cut", "Bounce", "Slide", "Tap") as letters; they were corrected by hand from the pages,
 * with the missed notes (C# on page 2, the scale run's C# and top B, a B on page 3) checked
 * against the pitch track. Not yet checked by ear.
 */
const S1 = `t:B*0.75 t:B+*1.25 -:G+*0.5 r:F#+*1.25 -:E+^C4*0.25 -:D+*0.5 -:B^C1*2 z | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+*1.25 | -:D+ r:C*1.75 | -:E+ -:D+^B6*1.25 z*0.5 | t:B*0.75 t:B+*1.25 -:G+*0.5 r:F#+*1.25 -:E+^C4*0.25 -:D+*0.5 -:B*2 z | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+*1.25 | -:F#+^C4 -:E+*0.25 -:D+*0.5 -:E+^C5*1.75 z*1.25`

const S2 = `t:B*0.75 r:D+*0.5 -:C#*0.75 -:D+*0.75 r:F#+*0.75 | -:E+*0.25 -:D+*0.75 r:D+*0.75 -:E+*2.25 z*0.75 | t:E+*0.75 r:G+ -:F#+*0.25 -:G+*0.75 -:B+*1.25 | t:G+ r:G+^S3*0.75 -:A+*2 z*0.5 | t:A+*0.75 r:C+ -:B+*0.25 -:C+*0.75 -:E+^B5*1.25 | -:F#+^C3 -:G+^C3*0.75 -:B+*2 z*0.5 | -:G+^B3*0.75 -:F#+^C3*3.5 | -:B+^B1*4.25 z*0.75`

const S3 = `t:B*0.75 t:B+*1.25 -:G+*0.5 r:F#+*1.25 -:E+^C4*0.25 -:D+*0.5 -:B*2.5 z*0.5 | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+*1.25 | -:D+*0.75 -:C*1.75 | -:E+*0.75 -:D+*1.25 z*0.5 / t:B*0.25 -:C#*0.25 -:D+*0.25 -:E+*0.25 -:F#+*0.25 -:G+*0.25 -:A+*0.25 -:B+*1.5 -:G+*0.5 r:F#+*0.75 -:E+^C4*0.25 -:D+*0.25 -:B*2 z*0.25 | t:B*0.5 r:E+*0.5 -:F#+*0.5 -:G+*0.5 r:F#+*1.5 | -:D+*0.25 r:D+^S6 -:E+*2.25 z*0.75 | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+^B5*1.25 | t:D+*0.75 r:D+*0.5 -:E+^C5*4`

export const tragicLove: Tune = {
  id: 'tragic-love',
  title: 'Tragic Love',
  composer: 'Lineage II: Freya OST · tab: Hound4Sound',
  description: {
    en: 'The login screen theme of Lineage II: Freya, a slow, sorrowful air for the low D whistle in E minor. Cuts, bounces and a slide on the long notes, a quick ascending scale run and long phrases in the second octave.',
    ru: 'Тема экрана входа из Lineage II: Freya, медленная печальная мелодия для вистла Low D в ми миноре. Cut, bounce и slide на долгих нотах, быстрый пробег вверх по гамме и долгие фразы во второй октаве.',
    ga: 'Téama scáileán logála isteach Lineage II: Freya, aer mall brónach don fheadóg D íseal in E mion. Cuts, bounces agus slide ar na nótaí fada, rith tapa suas an scála agus frásaí fada sa dara hochtach.',
  },
  tabSource: HOUND4SOUND,
  origin: 'builtin',
  type: 'soundtrack',
  whistle: 'lowD',
  key: 'Em',
  bpm: 77,
  difficulty: 4,
  sections: [
    sectionFromTabText('s1', 'Part 1', S1, 'lowD'),
    sectionFromTabText('s2', 'Part 2', S2, 'lowD'),
    sectionFromTabText('s3', 'Part 3', S3, 'lowD'),
  ],
  tags: ['game', 'air', 'ornaments', 'second octave', 'low D'],
}
