import { duetSection } from '../../music/duet'
import type { DuetPart, Tune } from '../../music/types'
import { HOUND4SOUND } from './credits'

/*
 * "Tragic Love", the login screen theme of Lineage II: Freya, as a duet for a low D and a high D
 * whistle. Tab read from Hound4Sound's video "Tin Whistle Tabs + Tutorial: Lineage 2 - Freya Login
 * Screen Theme (Tragic Love)" (scripts/transcribe-video.ts with the three tab pages as --pages),
 * where one player switches whistles: the groups drawn in dark blue are the low D's, those in light
 * blue the high D's, each part resting while the other plays. Each part is written as its own tab
 * shows it, so both sound as in the recording (the high D's scale run climbs to its top B).
 * Lengths measured from the recording, on a sixteenth grid at 77 bpm. The recogniser read the
 * ornament words ("Cut", "Bounce", "Slide", "Tap") as letters; they were corrected by hand from
 * the pages, with the missed notes (C# on page 2, the scale run's C# and top B, a B on page 3)
 * checked against the pitch track. Not yet checked by ear.
 */
const PARTS: DuetPart[] = [{ id: 'lowD', whistle: 'lowD' }, { id: 'D', whistle: 'D' }]

// page 1: the low D alone
const S1_LOWD = `t:B*0.75 t:B+*1.25 -:G+*0.5 r:F#+*1.25 -:E+^C4*0.25 -:D+*0.5 -:B^C1*2 z | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+*1.25 | -:D+ r:C*1.75 | -:E+ -:D+^B6*1.25 z*0.5 | t:B*0.75 t:B+*1.25 -:G+*0.5 r:F#+*1.25 -:E+^C4*0.25 -:D+*0.5 -:B*2 z | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+*1.25 | -:F#+^C4 -:E+*0.25 -:D+*0.5 -:E+^C5*1.75 z*1.25`
const S1_D = `z*7.5 | z*4 | z*2.75 | z*2.75 | z*7.5 | z*4 | z*4.75`

// page 2: the low D opens, the high D answers
const S2_LOWD = `t:B*0.75 r:D+*0.5 -:C#*0.75 -:D+*0.75 r:F#+*0.75 | -:E+*0.25 -:D+*0.75 r:D+*0.75 -:E+*2.25 z*0.75 | z*4 | z*4.25 | z*4 | z*4.25 | z*4.25 | z*5`
const S2_D = `z*3.5 | z*4.75 | t:E*0.75 r:G -:F#*0.25 -:G*0.75 -:B*1.25 | t:G r:G^S3*0.75 -:A*2 z*0.5 | t:A*0.75 r:C -:B*0.25 -:C*0.75 -:E+^B5*1.25 | -:F#+^C3 -:G+^C3*0.75 -:B*2 z*0.5 | -:G+^B3*0.75 -:F#+^C3*3.5 | -:B^B1*4.25 z*0.75`

// page 3: the low D's opening line, the high D's scale run and answer, the low D to close
const S3_LOWD = `t:B*0.75 t:B+*1.25 -:G+*0.5 r:F#+*1.25 -:E+^C4*0.25 -:D+*0.5 -:B*2.5 z*0.5 | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+*1.25 | -:D+*0.75 -:C*1.75 | -:E+*0.75 -:D+*1.25 z*0.5 / z*7.25 | z*3.5 | z*4.25 | t:B*0.75 r:E+*0.75 -:F#+*0.75 -:G+*0.5 r:F#+^B5*1.25 | t:D+*0.75 r:D+*0.5 -:E+^C5*4`
const S3_D = `z*7.5 | z*4 | z*2.5 | z*2.5 / t:B*0.25 -:C#*0.25 -:D+*0.25 -:E+*0.25 -:F#+*0.25 -:G+*0.25 -:A+*0.25 -:B+*1.5 -:G+*0.5 r:F#+*0.75 -:E+^C4*0.25 -:D+*0.25 -:B*2 z*0.25 | t:B*0.5 r:E+*0.5 -:F#+*0.5 -:G+*0.5 r:F#+*1.5 | -:D+*0.25 r:D+^S6 -:E+*2.25 z*0.75 | z*4 | z*5.25`

export const tragicLove: Tune = {
  id: 'tragic-love',
  title: 'Tragic Love',
  composer: 'Lineage II: Freya OST · tab: Hound4Sound',
  description: {
    en: 'The login screen theme of Lineage II: Freya for two whistles in E minor: a low D carries the sorrowful air, a high D answers it and runs up its scale to the top. Cuts, bounces and slides on the long notes. Choose your part; the other plays along.',
    ru: 'Тема экрана входа из Lineage II: Freya для двух вистлов в ми миноре: Low D ведёт печальную мелодию, High D отвечает ему и взбегает по гамме до самого верха. Cut, bounce и slide на долгих нотах. Выберите свою партию, вторая сыграет вместе с вами.',
    ga: 'Téama scáileán logála isteach Lineage II: Freya do dhá fheadóg in E mion: iompraíonn feadóg D íseal an t-aer brónach, freagraíonn feadóg D ard é agus ritheann sí suas a scála go barr. Cuts, bounces agus slides ar na nótaí fada. Roghnaigh do pháirt; seinnfidh an ceann eile in éineacht leat.',
  },
  tabSource: HOUND4SOUND,
  origin: 'builtin',
  type: 'soundtrack',
  whistle: 'lowD',
  key: 'Em',
  bpm: 77,
  difficulty: 4,
  duet: { parts: PARTS },
  tags: ['game', 'duet', 'low D', 'ornaments', 'second octave'],
  sections: [
    duetSection('s1', 'Part 1', [S1_LOWD, S1_D], PARTS),
    duetSection('s2', 'Part 2', [S2_LOWD, S2_D], PARTS),
    duetSection('s3', 'Part 3', [S3_LOWD, S3_D], PARTS),
  ],
}
