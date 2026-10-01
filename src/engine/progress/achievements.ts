import type { LocalizedText } from '../../music/types'

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
}

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
    icon: 'music',
    title: { en: 'First sound', ru: 'Первый звук' },
    description: { en: 'Play your first correct note.', ru: 'Сыграйте первую правильную ноту.' },
    test: (s) => s.notesPlayed >= 1,
  },
  {
    id: 'first-lesson',
    icon: 'book',
    title: { en: 'Off we go', ru: 'Поехали' },
    description: { en: 'Finish your first lesson.', ru: 'Пройдите первый урок.' },
    test: (s) => s.lessonsDone >= 1,
  },
  {
    id: 'first-tune',
    icon: 'star',
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
    id: 'streak-3',
    icon: 'flame',
    title: { en: 'Three days running', ru: 'Три дня подряд' },
    description: { en: 'Practise three days in a row.', ru: 'Занимайтесь три дня подряд.' },
    test: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    icon: 'flame',
    title: { en: 'A week of music', ru: 'Неделя музыки' },
    description: { en: 'Practise seven days in a row.', ru: 'Занимайтесь семь дней подряд.' },
    test: (s) => s.streak >= 7,
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
    icon: 'gamepad',
    title: { en: 'In the flow', ru: 'В потоке' },
    description: { en: 'Hit a 20-note combo in Falling Notes.', ru: 'Соберите комбо из 20 нот в Falling Notes.' },
    test: (s) => s.gameBestCombo >= 20,
  },
  {
    id: 'tune-master',
    icon: 'trophy',
    title: { en: 'Session ready', ru: 'Готов к сейшену' },
    description: { en: 'Master a tune at full speed.', ru: 'Выучите мелодию на полной скорости.' },
    test: (s) => s.tunesMastered >= 1,
  },
  {
    id: 'collector',
    icon: 'upload',
    title: { en: 'Collector', ru: 'Коллекционер' },
    description: { en: 'Add your own tune.', ru: 'Добавьте свою мелодию.' },
    test: (s) => s.importedTunes >= 1,
  },
]

export const newlyUnlocked = (snapshot: ProgressSnapshot, unlocked: Record<string, number>): Achievement[] =>
  ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.test(snapshot))
