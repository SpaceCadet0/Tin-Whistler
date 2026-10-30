import type { LocalizedText } from '../../music/types'
import { SECOND_OCTAVE } from '../../music/whistles'

export interface ProgressSnapshot {
  xp: number
  streak: number
  lessonsDone: number
  masteredNotes: number
  notesPlayed: number
  tunesPlayed: number
  tunesMastered: number
  earBestStreak: number
  tunerLocks: number
  dailyDone: number
  gameBestCombo: number
  importedTunes: number
  /** Second-octave notes mastered. */
  masteredHighNotes: number
  /** Whole tunes played with every note right. */
  cleanRuns: number
  /** Tunes played whole at FAST_TEMPO or quicker. */
  fastTunes: number
  duetsPlayed: number
  /** Practice ticks late at night (from 23:00 to 4:00). */
  latePractice: number
  /** Most seconds practised in one day. */
  bestDaySeconds: number
  editedTunes: number
}

/** Tempo (share of the written one) that counts as quick fingers. */
export const FAST_TEMPO = 1.2
const REPERTOIRE = 10
const MARATHON_SECONDS = 60 * 60

export interface Achievement {
  id: string
  icon: string
  title: LocalizedText
  description: LocalizedText
  test: (s: ProgressSnapshot) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-note',
    icon: 'note',
    title: { en: 'First sound', ru: 'Первый звук' },
    description: { en: 'Play your first correct note.', ru: 'Сыграйте первую правильную ноту.' },
    test: (s) => s.notesPlayed >= 1,
  },
  {
    id: 'first-lesson',
    icon: 'start',
    title: { en: 'Off we go', ru: 'Поехали' },
    description: { en: 'Finish your first lesson.', ru: 'Пройдите первый урок.' },
    test: (s) => s.lessonsDone >= 1,
  },
  {
    id: 'first-tune',
    icon: 'tin',
    title: { en: 'I can play a tune!', ru: 'Я играю мелодию!' },
    description: { en: 'Play a whole tune from start to finish.', ru: 'Сыграйте мелодию целиком от начала до конца.' },
    test: (s) => s.tunesPlayed >= 1,
  },
  {
    id: 'five-notes',
    icon: 'hand',
    title: { en: 'Nimble fingers', ru: 'Ловкие пальцы' },
    description: { en: 'Master five notes.', ru: 'Освойте пять нот.' },
    test: (s) => s.masteredNotes >= 5,
  },
  {
    id: 'full-octave',
    icon: 'ladder',
    title: { en: 'The whole octave', ru: 'Целая октава' },
    description: { en: 'Master all seven notes of the low octave.', ru: 'Освойте все семь нот нижней октавы.' },
    test: (s) => s.masteredNotes >= 7,
  },
  {
    id: 'second-octave',
    icon: 'peak',
    title: { en: 'Up an octave', ru: 'Вторая октава' },
    description: { en: 'Master every note of the second octave.', ru: 'Освойте все ноты второй октавы.' },
    test: (s) => s.masteredHighNotes >= SECOND_OCTAVE.length,
  },
  {
    id: 'streak-3',
    icon: 'match',
    title: { en: 'Three days running', ru: 'Три дня подряд' },
    description: { en: 'Practise three days in a row.', ru: 'Занимайтесь три дня подряд.' },
    test: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    icon: 'bonfire',
    title: { en: 'A week of music', ru: 'Неделя музыки' },
    description: { en: 'Practise seven days in a row.', ru: 'Занимайтесь семь дней подряд.' },
    test: (s) => s.streak >= 7,
  },
  {
    id: 'streak-30',
    icon: 'flame',
    title: { en: 'A month of music', ru: 'Месяц музыки' },
    description: { en: 'Practise 30 days in a row.', ru: 'Занимайтесь 30 дней подряд.' },
    test: (s) => s.streak >= 30,
  },
  {
    id: 'night-owl',
    icon: 'owl',
    title: { en: 'Night owl', ru: 'Ночная сова' },
    description: { en: 'Practise after 11 pm.', ru: 'Позанимайтесь после 23:00.' },
    test: (s) => s.latePractice >= 1,
  },
  {
    id: 'marathon',
    icon: 'hourglass',
    title: { en: 'Marathon', ru: 'Марафон' },
    description: { en: 'Practise for an hour in one day.', ru: 'Позанимайтесь час за один день.' },
    test: (s) => s.bestDaySeconds >= MARATHON_SECONDS,
  },
  {
    id: 'ear-10',
    icon: 'ear',
    title: { en: 'Good ears', ru: 'Хороший слух' },
    description: { en: 'Name 10 notes by ear in a row.', ru: 'Угадайте на слух 10 нот подряд.' },
    test: (s) => s.earBestStreak >= 10,
  },
  {
    id: 'in-tune',
    icon: 'tuner',
    title: { en: 'Dead centre', ru: 'Точно в центр' },
    description: { en: 'Hold a note in tune on the tuner.', ru: 'Удержите ноту точно по тюнеру.' },
    test: (s) => s.tunerLocks >= 1,
  },
  {
    id: 'daily-5',
    icon: 'calendar',
    title: { en: 'Habit forming', ru: 'Привычка' },
    description: { en: 'Complete five daily practices.', ru: 'Выполните пять ежедневных тренировок.' },
    test: (s) => s.dailyDone >= 5,
  },
  {
    id: 'combo-20',
    icon: 'combo',
    title: { en: 'In the flow', ru: 'В потоке' },
    description: { en: 'Hit a 20-note combo in Falling Notes.', ru: 'Соберите комбо из 20 нот в Falling Notes.' },
    test: (s) => s.gameBestCombo >= 20,
  },
  {
    id: 'clean-run',
    icon: 'diamond',
    title: { en: 'Clean run', ru: 'Без единой ошибки' },
    description: { en: 'Play a whole tune without a wrong note.', ru: 'Сыграйте мелодию целиком без единой неверной ноты.' },
    test: (s) => s.cleanRuns >= 1,
  },
  {
    id: 'quick-fingers',
    icon: 'hare',
    title: { en: 'Quick fingers', ru: 'Быстрые пальцы' },
    description: { en: 'Play a whole tune at 120% speed or faster.', ru: 'Сыграйте мелодию целиком на скорости 120% или быстрее.' },
    test: (s) => s.fastTunes >= 1,
  },
  {
    id: 'tune-master',
    icon: 'medal',
    title: { en: 'Session ready', ru: 'Готов к сейшену' },
    description: { en: 'Master a tune at full speed.', ru: 'Выучите мелодию на полной скорости.' },
    test: (s) => s.tunesMastered >= 1,
  },
  {
    id: 'repertoire',
    icon: 'scores',
    title: { en: 'Repertoire', ru: 'Репертуар' },
    description: { en: 'Play 10 different tunes from start to finish.', ru: 'Сыграйте 10 разных мелодий от начала до конца.' },
    test: (s) => s.tunesPlayed >= REPERTOIRE,
  },
  {
    id: 'duet',
    icon: 'duet',
    title: { en: 'Duet', ru: 'Дуэт' },
    description: { en: 'Play your part of a duet from start to finish.', ru: 'Сыграйте свою партию дуэта от начала до конца.' },
    test: (s) => s.duetsPlayed >= 1,
  },
  {
    id: 'composer',
    icon: 'composer',
    title: { en: 'Composer', ru: 'Композитор' },
    description: { en: 'Edit a tune.', ru: 'Отредактируйте мелодию.' },
    test: (s) => s.editedTunes >= 1,
  },
  {
    id: 'collector',
    icon: 'collection',
    title: { en: 'Collector', ru: 'Коллекционер' },
    description: { en: 'Add your own tune.', ru: 'Добавьте свою мелодию.' },
    test: (s) => s.importedTunes >= 1,
  },
]

export const newlyUnlocked = (snapshot: ProgressSnapshot, unlocked: Record<string, number>): Achievement[] =>
  ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.test(snapshot))
