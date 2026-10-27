import { duetSection } from '../../music/duet'
import type { DuetPart, Tune } from '../../music/types'

/*
 * "Hope", the Dirt theme from Heroes of Might and Magic IV, as a duet for a high D and a low D
 * whistle. From Hound4Sound's video "Tin Whistle Tabs + Tutorial: Heroes of Might and Magic IV -
 * Dirt Theme (Hope)" (https://www.youtube.com/watch?v=woruS4tEzAY), where the parts are drawn in
 * brown (high D) and green (low D) and played one after the other. Built by `npm run transcribe-duet`
 * (scripts/transcribe-duet.ts): both parts read from screenshots of the eight tab pages, each timed
 * from the recording, the low D part laid onto the high D one through the columns they share (and
 * the other way round where low D leads), lengths on a grid of sixteenths at 88 bpm. Articulation
 * and ornaments checked note by note against the pages and corrected by hand. Not yet checked by ear.
 */
const PARTS: DuetPart[] = [{ id: 'D', whistle: 'D' }, { id: 'lowD', whistle: 'lowD' }]

const S1_D = `z*7 | z*8.75 | z*7 | z*7 / z*7 | z*8.75 | z*7 | z*7`
const S1_LOWD = `t:E+*0.5 -:F#+*0.5 -:G+*1.75 -:A+*0.5 t:A+*0.75 -:B+*0.5 t:B+*1.75 z*0.75 | t:E+*0.5 r:E+*0.5 -:F#+*0.75 -:G+*2 -:F#+^C3*0.5 t:E+*0.75 -:D+*0.75 -:E+*1.75 z*1.25 | t:A*0.5 -:B*0.5 t:C*1.5 -:B*0.5 t:B*0.75 -:A^C1*0.5 t:A*0.5 -:G^C2*0.75 -:A z*0.5 | t:G*0.5 -:A*0.5 -:B*1.75 -:A^C1*0.5 t:A*0.75 -:G^C2*0.5 -:A*1.75 z*0.75 / t:E+*0.5 -:F#+*0.5 -:G+*1.75 -:F#+^C3*0.5 t:F#+*0.75 -:E+^C4*0.5 t:E+*1.75 z*0.75 | t:D+*0.5 -:E+*0.5 -:F#+*0.75 t:E+^B5*2 -:D+*0.5 t:B*0.75 -:A^S2+C1*0.75 -:B*1.75 z*1.25 | t:A*0.5 -:B*0.5 t:C*1.75 -:B*0.5 t:B*0.75 -:A^C1*0.5 t:A*1.75 z*0.75 | t:G*0.5 -:A*0.5 -:B*1.75 t:E*0.5 r:E*0.5 -:F#*0.75 -:D*2.5`

const S2_D = `t:E+*0.5 -:F#+*0.5 -:G+*1.5 -:A+*0.5 t:A+*0.5 -:B+*0.5 t:B+*1.75 | t:E+*0.5 r:E+*1.5 -:F#+!*0.5 t:G+*1.75 -:F#+^C3*0.5 t:E+*0.75 -:D+*0.5 -:B*1.5 z*0.5 | t:A+*0.5 r:A+*1.5 -:G+^C2*0.5 t:G+*1.75 -:F#+^C3*0.5 t:F#+*0.75 -:E+^C4*0.5 -:F#+*1.5 z*0.5 | t:E+*0.5 -:F#+*0.5 -:G+*1.75 -:F#+^C3*0.5 t:F#+*0.5 -:E+^C4*0.5 -:F#+*2`
const S2_LOWD = `t:E+*0.5 -:F#+*0.5 -:G+*1.5 -:F#+^C3*0.5 t:F#+*0.5 -:E+^C4*0.5 t:E+*1.5 z*0.25 | t:D+*0.5 -:E+*1.5 -:F#+!*0.5 t:E+*1.75 -:D+*0.5 t:B*0.75 -:A^S2+C1*0.5 -:B*2 z*0.5 | t:A*1.5 -:G*0.5 -:A*1.75 -:G*0.5 -:F#*0.75 -:A*0.5 -:G*0.75 t:G*1.75 | t:G*0.5 -:A*1.75 -:G*0.5 -:F#*0.5 -:E^C3*0.5 -:F#*2`

const S3_D = `t:E+*0.5 -:F#+*0.5 -:G+*1.75 -:F#+^C3*0.5 t:F#+*0.75 -:E+^C4*1.25 r:E+*0.5 z*0.25 | t:D+*0.5 -:E+*0.5 -:F#+!*0.5 t:E+*1.5 -:D+*0.5 t:B*0.5 -:A^S2+C1*0.75 -:B*2.25 z*0.25 | t:E+*0.5 -:F#+*0.5 -:G+*1.5 -:F#+^C3*0.5 -:E+*0.5 -:D+*0.5 t:E+*0.5 -:D+*0.5 -:E+ | -:D+*0.5 -:E+!*0.25 t:E+^S2*0.5 -:B+*1.25`
const S3_LOWD = `t:E+*0.5 -:F#+!*0.5 t:E+*1.75 t:D+*0.5 t:B*0.75 -:A^S2+C1*1.25 -:B*0.75 | -:A^C1*0.5 -:B*0.5 t:D+*0.5 t:B*1.5 -:A^C1*0.5 t:G*0.5 -:F#^C3*0.75 -:G*2 z*0.5 | t:A*0.5 -:B!*0.5 t:A*1.5 -:G^C2*0.5 t:G*0.5 -:F#^C3*0.5 t:F#*0.5 -:E^C4*0.5 -:F# | -:E*0.5 -:F#*0.25 -:G*1.75`

const S4_D = `t:A+*0.75 r:A+*1.25 -:B+!*0.5 t:A+^B2*0.5 -:G+*0.5 t:F#+^B4*0.5 -:E+*0.5 | -:F#+*0.5 -:G+!*0.25 t:G+^S2*0.5 -:B+*1.75 t:A+*0.75 r:A+*0.25 -:G+^C2*0.5 r:G+*1.25 z*0.5 | t:F#+*0.5 -:G+!*0.5 t:A+^S2*0.75 -:B+ -:B+^C1*0.5 -:A+*0.5 t:A+*0.5 -:G+^C2*0.5 t:G+*2 -:F#+^C3 -:G+^C3*3`
const S4_LOWD = `z*4.5 | z*1.25 | t:E+*1.75 t:D+*0.75 t:B*0.25 -:A^S2+C1*0.5 t:B*1.75 | t:F#*0.5 -:G!*0.5 t:A^S2*0.75 -:B -:B^C1*0.5 -:A*0.5 t:A*0.5 -:G^C2*0.5 t:G*4.5 z*1.5`

const S5_D = `z*6 | z*9.5 | z*6 | z*6 / z*6 | z*9.5 | z*6 | z*6.25`
const S5_LOWD = `t:E+*0.5 -:F#+*0.5 -:G+ -:G+^C3*0.5 -:F#+*0.5 -:F#+^C4*0.5 -:E+*0.5 -:E+^C5*2 | -:E+^C4*0.5 -:D+*0.5 -:E+*0.5 -:F#+*0.5 -:E+ -:E+^C4*1.5 -:D+*0.5 t:B*0.75 -:A^S2+C1*0.75 -:B*2 z | t:A*0.5 -:B*0.5 t:C r:C*0.5 -:B*0.5 -:B^C1*0.5 -:A*0.5 -:A^C2*2 | -:G^C2*0.5 -:A*0.5 -:B -:B^C1*0.5 t:E*0.5 r:E*0.5 -:F#*0.5 -:D*2 / t:E+*0.5 -:F#+*0.5 -:G+ -:G+^C3*0.5 -:F#+*0.5 -:F#+^C4*0.5 -:E+*0.5 -:E+^C5*2 | -:E+^C4*0.5 -:D+*0.5 -:E+*0.5 -:F#+*0.5 t:E+^B5 -:E+^C4*1.5 -:D+*0.5 t:B*0.75 -:A^S2+C1*0.75 -:B*2 z | t:A*0.5 -:B*0.5 t:C r:C*0.5 -:B*0.5 -:B^C1*0.5 -:A*0.5 -:A^C2*2 | t:G*0.5 -:A*0.5 -:B*0.75 -:B^C1*0.5 t:E*0.5 r:E*0.5 -:F#*0.5 -:D*2.5`

const S6_D = `t:E+*0.5 -:F#+*0.5 -:G+*1.75 -:A+*0.5 t:A+ -:B+*0.5 t:B+*1.5 z | t:E+*0.5 r:E+*0.5 -:F#+*0.5 -:G+*1.75 -:F#+*0.5 t:E+^B5 -:D+*0.5 -:B*3.25 z*5 z*7.25`
const S6_LOWD = `t:E+*0.5 -:F#+*0.5 -:G+*1.75 -:A+*0.5 t:A+ -:B+*0.5 t:B+*2 z*0.5 z*0.5 | t:E+*0.5 -:F#+*0.5 -:G+*1.75 -:F#+*0.5 t:E+^B5 -:D+*0.5 -:E+*2 z | t:C*1.75 r:C*0.25 -:B*0.25 -:B^C1*0.5 -:A*0.75 -:A^C2*0.25 -:G*0.5 -:A | -:G^C2*0.5 -:A*0.5 -:B -:B^C1*0.5 -:A*0.5 -:A^C2*0.75 -:G*0.5 -:A*3`

const S7_D = `t:E+*0.5 -:F#+*0.5 -:G+*1.5 -:A+*0.5 t:A+*0.5 -:B+*0.5 t:B+*1.25 z*1.25 | t:D+*0.5 -:E+*0.5 -:F#+*0.5 t:E+^B5*1.75 -:D+*0.5 t:B*0.5 -:A^S2+C1*0.75 -:B*2.5 | -:A^C1*0.5 -:B*0.5 t:C*1.25 -:E+*6.75 | -:D+*2.75`
const S7_LOWD = `t:E+*0.5 -:F#+*0.5 -:G+*1.5 -:A+*0.5 t:A+*0.5 -:B+*0.5 t:B+*1.75 z*0.75 | t:D+*0.5 -:E+*0.5 -:F#+*0.5 t:E+^B5*1.75 -:D+*0.5 t:B*0.5 -:A^S2+C1*0.75 -:B*1.75 z*0.75 | t:A*0.5 -:B*0.5 t:C*1.25 r:C*0.5 -:B*0.5 -:B^C1*0.5 -:A*0.25 -:A^C2*0.75 -:G*0.5 -:A z*0.25 | t:G*0.5 -:A*0.5 t:B*1.5 -:B^C1*0.25 t:E*0.5 r:E*0.5 -:F#*0.75 -:D*0.75`

const S8_D = `t:G -:A*1.25 -:B -:B^C1*0.5 -:A*0.75 -:A^C2*0.25 -:G*2 -:G^C3*0.75 z*0.5 | t:F#+*0.5 -:G+!*0.5 t:A+^S2*0.75 -:B+ -:B+^C1*0.5 -:A+*0.75 -:A+^C2*0.5 -:G+*2 -:G+^C3*1.75 -:F#+^C3 -:G+^C3*3`
const S8_LOWD = `t:G -:A*1.25 -:B -:B^C1*0.5 -:A*0.75 -:A^C2*0.25 -:G*2 -:G^C3*1.25 | t:F#*0.5 -:G!*0.5 t:A*0.75 -:G -:G^C3*0.5 -:F#*0.75 -:F#^C4*0.5 -:E*2 -:E^C5*1.75 -:D^C3 -:E^C3*3`

export const hope: Tune = {
  id: 'hope',
  title: 'Hope',
  composer: 'Heroes of Might and Magic IV OST · tab: Hound4Sound',
  description: {
    en: 'The Dirt theme from Heroes of Might and Magic IV for two whistles: a high D and a low D take turns with the tune and the harmony, and play together. Choose your part; the other plays along.',
    ru: 'Тема земли из Heroes of Might and Magic IV для двух вистлов: high D и low D по очереди ведут мелодию и гармонию и играют вместе. Выберите свою партию, вторая сыграет вместе с вами.',
  },
  origin: 'builtin',
  type: 'soundtrack',
  whistle: 'D',
  key: 'Em',
  bpm: 88,
  difficulty: 3,
  duet: { parts: PARTS },
  tags: ['game', 'duet', 'low D', 'ornaments'],
  sections: [
    duetSection('s1', 'Section 1', [S1_D, S1_LOWD], PARTS),
    duetSection('s2', 'Section 2', [S2_D, S2_LOWD], PARTS),
    duetSection('s3', 'Section 3', [S3_D, S3_LOWD], PARTS),
    duetSection('s4', 'Section 4', [S4_D, S4_LOWD], PARTS),
    duetSection('s5', 'Section 5', [S5_D, S5_LOWD], PARTS),
    duetSection('s6', 'Section 6', [S6_D, S6_LOWD], PARTS),
    duetSection('s7', 'Section 7', [S7_D, S7_LOWD], PARTS),
    duetSection('s8', 'Section 8', [S8_D, S8_LOWD], PARTS),
  ],
}
