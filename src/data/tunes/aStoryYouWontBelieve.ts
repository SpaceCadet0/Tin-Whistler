import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'
import { HOUND4SOUND } from './credits'

/*
 * "A Story You Won't Believe", tavern and Gwent music from The Witcher 3: Wild Hunt, from
 * Hound4Sound's video "Tin Whistle Tabs + Tutorial: The Witcher 3 - A Story You Won't Believe
 * (Gwent/Tavern Music)" (https://www.youtube.com/watch?v=zcnW9suwE08), played on a high C whistle.
 * Built by `npm run transcribe -- <url> --pages …` (scripts/transcribe-video.ts): notes, groups and
 * articulation read from screenshots of the nine tab pages (src/import/__fixtures__/story-*.png),
 * every length measured from the recording and written on a grid of sixteenths at one tempo
 * (src/import/quantize.ts): a phrase that repeats is played alike, groups of a section with the same
 * number of notes share a rhythm. Rests only in the gaps between groups, and for a whole pattern at
 * once: when most groups of a size breathe after themselves in the recording, all of them do. The octave follows the tab's "+" unless
 * the recording clearly plays another (the first page has no "+"); in section 2 one short high F
 * whose attack sounds an octave low keeps the tab's octave. The video names its few ornaments in
 * words over ringed holes ("Slide", "Trill & Slide", "Long Trill"); they are set by hand from the
 * screenshots, with the ringed hole: slides off hole 6 (C' to D') and hole 3 (F' to G'), trills on
 * hole 5 (D' to E'). "trru" (sections 5 and 8) is the rolled attack.
 */
const S1 = `t:D*0.5 r:D*0.5 t:D*0.5 t:D*1.25 | t:D*1.25 z*3.75 | t:D*0.5 t:D*0.5 t:D*0.5 t:D z*0.25 | t:C*0.75 t:D*1.25 z*4.75`

const S2 = `t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+ t:E+*0.5 | t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:D+*0.5 t:E+*0.5 t:F+*0.5 t:G+*0.5 t:F+*0.5 t:E+*0.5 t:D+*1.5 z*2 / t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+ t:E+*0.5 | t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:F+*0.5 t:E+*0.5 t:D+*0.5 t:C+ -:D+*0.5 t:D+*0.75 | t:D+*0.5 t:D+*0.75 z`

const S3 = `t:D+*9 | t:D+*0.5 t:A+*0.75 t:F+*0.25 t:G+*1.75 | t:D+*6.5 z*0.5 | t:A+*0.5 t:A+*0.5 t:F+*0.5 t:G+*0.75 t:F+*0.5 t:E+ t:C+*0.5 t:D+ z`

const S4 = `t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:D+*0.5 t:E+*0.5 t:F+*0.5 t:G+*0.5 t:F+*0.5 t:E+*0.5 t:D+ t:C+*0.5 t:D+*0.5 z | t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:F+*0.5 t:G+*0.5 t:F+ t:E+*0.5 t:D+ t:C+^S6*0.5 -:D+*0.5 z*0.5 | t:D+*1.25 r:D+*0.25 z*0.75 / t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:D+*0.5 t:E+*0.5 t:F+*0.5 t:G+*0.5 t:F+*0.5 t:E+*0.5 t:D+ t:C+*0.5 t:D+*0.5 z | t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:F+^S3*0.25 -:G+*0.5 t:G+*0.5 t:F+*0.5 t:E+*0.5 t:D+*0.5 t:C+*0.5 r:D+*0.5 | t:D+*0.25 r:D+*1.25 z*1.25`

const S5 = `t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 f:D+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+^T5*0.75 -:C+^S6*0.5 -:D+*0.5 z*0.75 / t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+*0.75 t:A+*0.5 t:F+*0.5 z*0.75 | t:D+^T5*3.5 t:C+*0.5 t:D+*0.75 z*1.25`

const S6 = `t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:F+*0.5 t:G+*0.5 t:F+*0.5 t:E+*0.5 t:D+*0.5 t:C+*0.5 t:D+ t:E+*0.5 t:F+*0.5 z | t:D+*0.5 t:A+*0.5 t:F+*0.5 t:G+ t:F+*0.5 t:E+ t:C+*0.5 t:D+*0.5 z*0.5 | t:E+*0.5 t:F+*0.5 t:F+*0.5 t:G+ t:G+*0.5 t:F+ t:E+*0.5 t:D+*0.5 z*0.5 | t:D+ r:D+*0.75 z*1.25`

const S7 = `t:A+*0.5 t:A+*0.5 t:A+*0.5 | t:G+*0.5 t:G+*0.5 t:G+*0.5 | t:F+*0.5 t:F+*0.5 t:F+*0.5 | t:E+*0.5 t:E+*0.5 t:E+*0.5 | t:D+ t:C+*0.5 t:D+ t:E+*0.5 t:F+*0.5 t:G+*0.5 t:F+*0.5 t:E+*0.5 z / t:A+*0.5 t:A+*0.5 t:A+*0.5 | t:G+*0.5 t:G+*0.5 t:G+*0.5 | t:F+*0.5 t:F+*0.5 t:F+*0.5 | t:E+*0.5 t:E+*0.5 t:E+*0.5 | t:D+ t:C+*0.5 r:D+ t:E+*0.5 r:F+ t:E+*0.5 r:D+*0.5 z`

const S8 = `f:D+*0.75 | t:D+*0.5 r:D+*0.75 t:D+*0.5 | t:E+*0.75 | t:E+*0.5 r:E+*0.75 t:E+*0.5 | t:F+*0.75 | t:F+*0.5 r:F+*0.75 t:F+*0.5 | t:G+*0.75 | t:G+*0.5 r:G+*0.75 t:G+*0.5 / t:A+*0.75 | t:F+*0.5 t:G+*0.75 | t:F+*0.5 r:E+*0.75 | t:D+*0.5 t:C+*0.75 | t:D+*0.5 t:E+*0.75 | t:F+*0.5 t:G+*0.75 | t:F+*0.5 r:E+*0.75 | t:C+*0.5 t:D+*0.75`

const S9 = `t:D+*0.75 | t:D+*0.5 r:D+*0.75 t:D+*0.5 | t:E+*0.75 | t:E+*0.5 r:E+*0.75 t:E+*0.5 | t:F+*0.75 | t:F+*0.5 r:F+*0.75 t:F+*0.5 | t:G+*0.75 | t:G+*0.5 r:G+*0.75 t:G+*0.5 / t:A+*0.75 | t:F+*0.5 t:G+*0.75 | t:F+*0.5 r:E+*0.75 | t:C+*0.5 t:D+*0.75 | t:E+*0.5 t:F+*0.75 | t:G+*0.5 r:F+*0.75 | t:E+*0.5 r:D+*0.75 | t:C+*0.5 t:D+*1.5`

export const aStoryYouWontBelieve: Tune = {
  id: 'a-story-you-wont-believe',
  title: "A Story You Won't Believe",
  composer: 'The Witcher 3: Wild Hunt OST · tab: Hound4Sound',
  description: {
    en: 'A lively tavern tune from The Witcher 3 for the high C whistle, in D minor. Runs of tongued notes high in the second octave, nine short sections.',
    ru: 'Бойкая трактирная мелодия из The Witcher 3 для вистла High C, в ре миноре. Пробежки нот с атакой языком высоко во второй октаве, девять коротких секций.',
    ga: 'Fonn bríomhar tábhairne ó The Witcher 3 don fheadóg C ard, i D mion. Ritheanna nótaí teangaithe go hard sa dara hochtach, naoi gcuid ghearra.',
  },
  tabSource: HOUND4SOUND,
  origin: 'builtin',
  type: 'soundtrack',
  whistle: 'C',
  key: 'Dm',
  bpm: 144,
  difficulty: 4,
  sections: [
    sectionFromTabText('s1', 'Section 1', S1, 'C'),
    sectionFromTabText('s2', 'Section 2', S2, 'C'),
    sectionFromTabText('s3', 'Section 3', S3, 'C'),
    sectionFromTabText('s4', 'Section 4', S4, 'C'),
    sectionFromTabText('s5', 'Section 5', S5, 'C'),
    sectionFromTabText('s6', 'Section 6', S6, 'C'),
    sectionFromTabText('s7', 'Section 7', S7, 'C'),
    sectionFromTabText('s8', 'Section 8', S8, 'C'),
    sectionFromTabText('s9', 'Section 9', S9, 'C'),
  ],
  tags: ['game', 'tavern', 'ornaments', 'second octave', 'C whistle'],
}
