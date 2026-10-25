import { sectionFromTabText } from '../../music/tabText'
import type { Tune } from '../../music/types'

/*
 * "A Story You Won't Believe", tavern and Gwent music from The Witcher 3: Wild Hunt. Read from
 * Hound4Sound's video "Tin Whistle Tabs + Tutorial: The Witcher 3 - A Story You Won't Believe
 * (Gwent/Tavern Music)" (https://www.youtube.com/watch?v=zcnW9suwE08), played on a high C whistle,
 * by `npm run transcribe` (scripts/transcribe-video.ts): the tab from the video frames, every
 * duration and breath from the recording, 1 beat = 1 second of the performance at 60 bpm. The
 * video marks its few ornaments with words ("Slide", "Trill & Slide", "Long Trill") the recogniser
 * doesn't read: they are not in the tab yet. Not yet checked by ear.
 */
const S1 = `r:D*0.16 r:D*0.19 r:D*0.26 r:D*0.57 | r:D*0.59 z*1.56 | r:D*0.19 r:D*0.2 r:D*0.23 r:D*0.29 z*0.15 | r:C*0.27 r:D*0.47 z*1.86`

const S2 = `r:D+*0.2 r:A+*0.24 r:F+*0.18 r:G+*0.37 r:F+*0.22 r:E+*0.37 r:C+*0.2 r:D+*0.38 r:E+*0.21 | r:D+*0.18 r:A+*0.25 r:F*0.19 r:G+*0.36 r:F+*0.23 r:E+*0.39 r:C+*0.21 r:D+*0.32 z*0.25 | r:D+*0.21 r:A+*0.25 r:F+*0.16 r:G+*0.37 r:F+*0.23 r:E+*0.36 r:C+*0.21 r:D+*0.38 | r:E+*0.21 r:D+*0.21 r:E+*0.18 r:F+*0.22 r:G+*0.2 r:F+*0.22 r:E+*0.22 r:D+*1.32 z*0.14 / r:D+*0.24 r:A+*0.22 r:F*0.21 r:G+*0.39 r:F+*0.23 r:E+*0.38 r:C+*0.21 r:D+*0.4 r:E+*0.2 | r:D+*0.19 r:A+*0.25 r:F+*0.23 r:G+*0.37 r:F+*0.22 r:E+*0.4 r:C+*0.22 r:D+*0.34 z*0.23 | r:D+*0.2 r:A+*0.22 r:F+*0.21 r:G+*0.37 r:F+*0.23 r:E+*0.42 r:C+*0.18 r:D+*0.36 | r:E*0.21 r:F+*0.2 r:E+*0.2 r:D+*0.24 r:C+*0.4 -:D+*0.2 r:D+*0.36 | r:D+*0.23 r:D+*0.33 z*0.36`

const S3 = `r:D+*3.92 | r:D+*0.23 r:A+*0.28 r:F+*0.14 r:G+*0.71 | r:D+*2.59 z*0.2 | r:A+*0.25 r:A+*0.19 r:F+*0.22 r:G+*0.36 r:F+*0.22 r:E+*0.38 r:C+*0.21 r:D+*0.39 z*0.44`

const S4 = `r:D+*0.22 r:A+*0.22 r:F+*0.22 r:G+*0.39 r:F+*0.22 r:E+*0.4 r:C+*0.21 r:D+*0.21 z*0.19 | r:E+*0.22 r:D+*0.22 r:E+*0.2 r:F+*0.24 r:G+*0.21 r:F+*0.23 r:E+*0.23 r:D+*0.21 z*0.16 r:C+*0.23 r:D+*0.34 z*0.24 | r:D+*0.19 r:A+*0.26 r:F+*0.18 r:G+*0.37 r:F+*0.23 r:E+*0.4 r:C+*0.22 r:D+*0.24 z*0.16 | r:E+*0.21 r:F+*0.21 r:G+*0.2 r:F+*0.21 r:E+*0.21 r:D+*0.23 r:C+*0.22 -:D+*0.18 z*0.17 | r:D+*0.5 r:D+*0.06 z*0.32 / r:D+*0.21 r:A+*0.26 r:F+*0.19 r:G+*0.38 r:F+*0.23 r:E+*0.38 r:C+*0.21 r:D+*0.22 z*0.17 | r:E+*0.21 r:D+*0.2 r:E+*0.2 r:F+*0.2 r:G+*0.21 r:F+*0.21 r:E+*0.21 r:D+*0.23 z*0.17 r:C+*0.21 r:D+*0.24 z*0.35 | r:D+*0.21 r:A+*0.24 r:F+*0.22 r:G+*0.38 r:F+*0.23 r:E+*0.4 r:C+*0.21 r:D+*0.23 z*0.13 | r:E+*0.2 r:F+*0.12 -:G+*0.19 r:G+*0.2 r:F+*0.23 r:E+*0.22 r:D+*0.21 r:C+*0.2 r:D+*0.26 | r:D+*0.13 r:D+*0.46 z*0.55`

const S5 = `r:D+*0.33 r:A+*0.27 r:F+*0.18 z*0.29 | r:D+*0.2 z*0.15 r:A+*0.24 r:F+*0.1 z*0.39 | r:D+*0.19 z*0.14 r:A+*0.23 r:F+*0.29 z*0.21 | r:D+*0.29 r:A+*0.25 r:D+*0.51 | r:D+*0.19 z*0.15 r:A+*0.23 r:F+*0.27 z*0.19 | r:D+*0.2 z*0.15 r:A+*0.22 r:F+*0.22 z*0.29 | r:D+*0.21 z*0.13 r:A+*0.24 r:F+*0.27 z*0.33 | r:D+*0.43 -:C+*0.1 -:D+*0.34 / r:D+*0.2 z*0.18 r:A+*0.25 r:F+*0.23 z*0.25 | r:D+*0.19 z*0.15 r:A+*0.25 r:F+*0.23 z*0.26 | r:D+*0.19 z*0.14 r:A+*0.26 r:F+*0.25 z*0.2 | r:D+*0.2 z*0.15 r:A+*0.25 r:F+*0.25 z*0.25 | r:D+*0.21 z*0.13 r:A+*0.19 r:F+*0.3 z*0.23 | r:D+*0.21 z*0.13 r:A+*0.25 r:F+*0.25 z*0.34 | r:D+*1.39 r:C+*0.18 r:D+*0.35 z*0.51`

const S6 = `r:D+*0.2 r:A+*0.27 r:F+*0.16 r:G+*0.35 r:F+*0.24 r:E+*0.4 r:C+*0.2 r:D+*0.25 z*0.14 | r:E+*0.21 r:F+*0.2 r:G+*0.2 r:F+*0.19 r:E+*0.22 r:D+*0.2 r:C*0.23 r:D+*0.22 z*0.17 r:E+*0.25 r:F+*0.24 z*0.35 | r:D+*0.18 r:A+*0.26 r:F+*0.2 r:G+*0.37 r:F+*0.23 r:E+*0.27 z*0.13 r:C+*0.23 r:D+*0.23 z*0.17 | r:E+*0.22 r:F+*0.21 r:F+*0.2 r:G+*0.2 r:G+*0.23 r:F+*0.21 r:E+*0.21 r:D+*0.06 | r:D+*0.39 r:D+*0.37 z*1.09`

const S7 = `r:G+*0.19 r:G+*0.19 r:G+*0.21 | r:F+*0.18 r:F+*0.19 r:F+*0.21 | r:E+*0.18 r:E+*0.2 r:E+*0.25 | r:D+*0.24 z*0.15 r:C+*0.23 r:D+*0.24 z*0.18 r:E+*0.24 r:F+*0.21 r:G+*0.21 r:F+*0.22 r:E+*0.27 z*0.97 / r:G+*0.18 r:G+*0.19 r:G+*0.21 | r:F+*0.19 r:F+*0.18 r:F+*0.22 | r:E+*0.18 r:E+*0.19 r:E+*0.24 | r:D+*0.22 z*0.17 r:C+*0.21 r:D+*0.22 z*0.18 r:E+*0.26 t:F+*0.22 z*0.17 r:E+*0.24 t:D+*0.23 z*0.4`

const S8 = `r:D+*0.41 | r:D+*0.25 r:D+*0.35 r:D+*0.23 | r:E+*0.33 | r:E+*0.19 r:E+*0.33 r:E+*0.21 | r:F+*0.33 | r:F+*0.19 r:F+*0.36 r:F+*0.22 | r:G+*0.3 | r:G+*0.21 r:G+*0.32 r:G+*0.24 / r:A+*0.34 r:F+*0.97 z*1.18 r:G+*0.58 r:F+*0.19 r:E+*0.23 z*0.13 r:C+*0.21 r:D+*1.86 r:E+*1.18 r:F+*1.14 r:G+*2.27 z*0.91 r:F+*1.17 r:E+*0.24 r:D+*0.32 r:C*0.21 r:D+*0.67`

export const aStoryYouWontBelieve: Tune = {
  id: 'a-story-you-wont-believe',
  title: "A Story You Won't Believe",
  composer: 'The Witcher 3: Wild Hunt OST · tab: Hound4Sound',
  description: {
    en: 'A lively tavern tune from The Witcher 3 for the high C whistle, in D minor. Runs of tongued notes high in the second octave, eight short sections.',
    ru: 'Бойкая трактирная мелодия из The Witcher 3 для вистла High C, в ре миноре. Пробежки нот с атакой языком высоко во второй октаве, восемь коротких секций.',
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
    sectionFromTabText('s5', 'Section 5', S5, 'C'),
    sectionFromTabText('s6', 'Section 6', S6, 'C'),
    sectionFromTabText('s7', 'Section 7', S7, 'C'),
    sectionFromTabText('s8', 'Section 8', S8, 'C'),
  ],
  tags: ['game', 'tavern', 'second octave', 'C whistle'],
}
