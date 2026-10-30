import { parseTabText, sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'
import { HOUND4SOUND } from './credits'

/*
 * Transcribed from the tab screenshots supplied with the project brief (reference/).
 * Durations were measured from the tutorial video's playback cursor (Hound4Sound, "Tin Whistle
 * Tabs + Tutorial: Lineage 2 - Town of Dion Theme") and stored in beats at 75 bpm, so 100 %
 * tempo follows the performance's rubato. "+" = second register, ^C/^B/^S = cut/bounce/slide
 * with the ringed hole, "!" = sharp stop ("i").
 */
const S1 = `t:D*0.375 -:E*1.25 -:E^C4*0.125 -:D*0.375 -:E*1.75 | t:D*0.3125 -:E*0.4375 r:E*1.4375 -:E^C4*0.6875 | -:D^C4*0.25 -:E*0.3125 -:F#*0.75 -:G*0.25 -:F#^B4*0.375 -:E*0.25 -:D*1.75 | t:G*1.125 -:A*0.5 t:A*1 | -:G*0.25 -:A*0.5 t:A*0.75 -:B*0.1875 -:A^B2*0.25 -:G*0.3125 -:E*1.6875
/ t:D*0.375 -:E*1.1875 -:E^C4*0.75 | -:D*0.125 -:E^S5*0.625 -:F#*0.8125 -:G*0.1875 -:F#^B4*0.3125 -:E*0.25 -:D*1.75 | t:G*1.125 r:A*0.5 t:A*0.875 | -:G*0.25 t:A^S2*0.75 -:B*0.6875 -:C[h00000]*0.1875 -:B*0.25 -:A*0.25 -:G*1.1875 -:E^C3*3.9375 -:E^C4*1`

const S2 = `t:D+*0.3125 -:E+!*0.9375 t:E+*0.625 t:F#+*0.8125 -:G+*0.4375 -:F#+^B4*0.1875 -:E+*0.25 -:D+*3.0625 | t:D+*0.5 -:G+!*0.5625 t:G+*0.625 t:A+*0.8125 -:B+*0.1875 -:A+^B2*0.3125 -:G+*0.3125 -:F#+*0.625 -:E+^C3*0.5625 | -:E+^C4*0.25 -:D+*0.375 -:E+*2.875
/ t:E+*0.5625 -:G+!*0.5 t:A+*0.5625 t:B+*1.1875 t:A+*0.3125 -:G+*0.3125 -:F#+*0.5 | -:F#+^C4*0.875 -:E+*0.3125 -:F#+*0.5625 -:G+!*0.5625 t:G+*0.5625 t:G+*1.25 | -:G+^C3*0.25 -:F#+*0.25 -:E+*1.25 | -:F#+*0.25 -:E+^B5*1.5625 | t:F#+*0.25 -:E+^B5*1.4375 | -:F#+*0.4375 -:E+^B5*0.875 | -:F#+*0.375 -:E+^B5*0.375 -:D+*0.6875`

const S3 = `t:D*0.5 -:E!*0.5 t:E*0.5625 t:E*0.8125 | -:D*0.25 -:E!*0.5625 t:F#*0.875 -:G*0.375 -:F#^B4*0.1875 -:E*0.25 -:D*1.6875 | t:G*0.3125 -:A!*0.75 t:A*0.5 t:A*0.8125 | -:G*0.25 -:A!*0.5625 t:A*0.8125 -:B*0.1875 -:A^B2*0.3125 -:G*0.25 -:E*1.625
/ t:D*0.375 -:E!*0.625 t:E*0.5 t:E*0.875 | -:D*0.1875 -:E!*0.5625 t:F#*0.75 -:G*0.375 -:F#^B4*0.1875 -:E*0.25 -:D*1.75 | t:G*0.3125 -:A!*0.6875 t:A*0.5 t:A*0.875 | -:G*0.1875 t:A^S2*0.75 -:B*0.5625 -:C*0.25 -:B*0.5625 -:A*1.625 | t:B*0.8125 -:C*0.3125 -:B*0.625 -:A^B2*0.4375 -:A^C2*0.8125 -:G*0.375 -:E*0.3125 -:E^C4*1.9375`

const S4 = `t:E*0.5625 -:G*0.5 -:A*0.5625 t:A^S2*0.3125 -:B*2.8125 | t:D+*0.625 -:E+^S5~3*0.5625 -:F+[1111h0]*0.4375 -:E+*1.9375 | -:E+^C4*0.25 -:D+*0.375 -:E+*2.8125
/ t:E+*0.5 -:G+*0.3125 t:A+^S2*0.8125 -:B+*0.25 r:B+*2 -:A+*0.25 -:G+*0.25 -:F#+*1 -:G+*0.625 -:F#+^B4*0.25 | -:F#+^C4*0.9375 -:E+*0.25 -:F#+*1.0625 -:G+!*0.4375 t:G+*0.25 | -:G+^C3*0.75 -:F#+*0.375 -:E+*1.125 | -:F#+*0.3125 -:E+^B5*1.1875 | t:F#+*0.3125 -:E+^B5*1.375 | -:F#+*0.3125 -:E+^B5*1.1875 | -:F#+*0.1875 -:E+^B5*0.375 -:D+*0.3125 -:B*1.8125`

const S5 = `r:B*0.25 -:A^B2*0.25 -:G*0.3125 -:E*0.8125 -:D*0.25 -:E*0.3125 -:G*0.3125 -:A*0.3125 -:G*0.5 -:G^C3*0.625 -:E*0.125 -:D*0.375 -:G*0.4375 -:E*1.5625`

/** Harmony line (bracketed in the tab), a second whistle enters on the 30th note of section 4. */
const S4_VOICE2 = `-:B*1.375 -:C*1.5 -:B*1.625 -:A*1.1875`

const section4 = sectionFromTabText('s4', 'Section 4', S4)
section4.secondVoice = { startNote: 29, notes: parseTabText(S4_VOICE2).phrases.flat() }

export const shepardsFlute: Tune = {
  id: 'shepards-flute',
  title: "Shepard's Flute",
  composer: 'Bill Brown (Lineage II OST) · tab: Hound4Sound',
  description: {
    en: 'The Town of Dion theme. A slow air played with rubato: lots of cuts, bounces and slides, and a jump into the second octave.',
    ru: 'Тема города Дион. Медленная мелодия (air) с рубато: много cut, bounce и slide, есть переход во вторую октаву.',
  },
  tabSource: HOUND4SOUND,
  origin: 'builtin',
  type: 'soundtrack',
  whistle: 'D',
  key: 'D',
  bpm: 75,
  difficulty: 4,
  sections: [
    sectionFromTabText('s1', 'Section 1', S1),
    sectionFromTabText('s2', 'Section 2', S2),
    sectionFromTabText('s3', 'Section 3', S3),
    section4,
    sectionFromTabText('s5', 'Closing', S5),
  ],
  tags: ['game', 'air', 'ornaments'],
}
