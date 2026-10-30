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
    title: { en: 'First sound', ru: 'Первый звук', ga: 'An chéad fhuaim' },
    description: { en: 'Play your first correct note.', ru: 'Сыграйте первую правильную ноту.', ga: 'Seinn do chéad nóta ceart.' },
    test: (s) => s.notesPlayed >= 1,
  },
  {
    id: 'first-lesson',
    icon: 'start',
    title: { en: 'Off we go', ru: 'Поехали', ga: 'Ar aghaidh linn' },
    description: { en: 'Finish your first lesson.', ru: 'Пройдите первый урок.', ga: 'Críochnaigh do chéad cheacht.' },
    test: (s) => s.lessonsDone >= 1,
  },
  {
    id: 'first-tune',
    icon: 'tin',
    title: { en: 'I can play a tune!', ru: 'Я играю мелодию!', ga: 'Is féidir liom fonn a sheinm!' },
    description: { en: 'Play a whole tune from start to finish.', ru: 'Сыграйте мелодию целиком от начала до конца.', ga: 'Seinn fonn iomlán ó thús go deireadh.' },
    test: (s) => s.tunesPlayed >= 1,
  },
  {
    id: 'five-notes',
    icon: 'hand',
    title: { en: 'Nimble fingers', ru: 'Ловкие пальцы', ga: 'Méara aclaí' },
    description: { en: 'Master five notes.', ru: 'Освойте пять нот.', ga: 'Máistrigh cúig nóta.' },
    test: (s) => s.masteredNotes >= 5,
  },
  {
    id: 'full-octave',
    icon: 'ladder',
    title: { en: 'The whole octave', ru: 'Целая октава', ga: 'An t-ochtach ar fad' },
    description: { en: 'Master all seven notes of the low octave.', ru: 'Освойте все семь нот нижней октавы.', ga: 'Máistrigh na seacht nóta go léir den ochtach íseal.' },
    test: (s) => s.masteredNotes >= 7,
  },
  {
    id: 'second-octave',
    icon: 'peak',
    title: { en: 'Up an octave', ru: 'Вторая октава', ga: 'Ochtach suas' },
    description: { en: 'Master every note of the second octave.', ru: 'Освойте все ноты второй октавы.', ga: 'Máistrigh gach nóta den dara hochtach.' },
    test: (s) => s.masteredHighNotes >= SECOND_OCTAVE.length,
  },
  {
    id: 'streak-3',
    icon: 'match',
    title: { en: 'Three days running', ru: 'Три дня подряд', ga: 'Trí lá as a chéile' },
    description: { en: 'Practise three days in a row.', ru: 'Занимайтесь три дня подряд.', ga: 'Cleachtaigh trí lá as a chéile.' },
    test: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    icon: 'bonfire',
    title: { en: 'A week of music', ru: 'Неделя музыки', ga: 'Seachtain cheoil' },
    description: { en: 'Practise seven days in a row.', ru: 'Занимайтесь семь дней подряд.', ga: 'Cleachtaigh seacht lá as a chéile.' },
    test: (s) => s.streak >= 7,
  },
  {
    id: 'streak-30',
    icon: 'flame',
    title: { en: 'A month of music', ru: 'Месяц музыки', ga: 'Mí cheoil' },
    description: { en: 'Practise 30 days in a row.', ru: 'Занимайтесь 30 дней подряд.', ga: 'Cleachtaigh 30 lá as a chéile.' },
    test: (s) => s.streak >= 30,
  },
  {
    id: 'night-owl',
    icon: 'owl',
    title: { en: 'Night owl', ru: 'Ночная сова', ga: 'Ulchabhán oíche' },
    description: { en: 'Practise after 11 pm.', ru: 'Позанимайтесь после 23:00.', ga: 'Cleachtaigh tar éis 11 i.n.' },
    test: (s) => s.latePractice >= 1,
  },
  {
    id: 'marathon',
    icon: 'hourglass',
    title: { en: 'Marathon', ru: 'Марафон', ga: 'Maratón' },
    description: { en: 'Practise for an hour in one day.', ru: 'Позанимайтесь час за один день.', ga: 'Cleachtaigh ar feadh uair an chloig in aon lá amháin.' },
    test: (s) => s.bestDaySeconds >= MARATHON_SECONDS,
  },
  {
    id: 'ear-10',
    icon: 'ear',
    title: { en: 'Good ears', ru: 'Хороший слух', ga: 'Cluasa maithe' },
    description: { en: 'Name 10 notes by ear in a row.', ru: 'Угадайте на слух 10 нот подряд.', ga: 'Ainmnigh 10 nóta ón gcluas as a chéile.' },
    test: (s) => s.earBestStreak >= 10,
  },
  {
    id: 'in-tune',
    icon: 'tuner',
    title: { en: 'Dead centre', ru: 'Точно в центр', ga: 'Díreach sa lár' },
    description: { en: 'Hold a note in tune on the tuner.', ru: 'Удержите ноту точно по тюнеру.', ga: 'Coinnigh nóta i dtiúin ar an tiúnóir.' },
    test: (s) => s.tunerLocks >= 1,
  },
  {
    id: 'daily-5',
    icon: 'calendar',
    title: { en: 'Habit forming', ru: 'Привычка', ga: 'Nós á chothú' },
    description: { en: 'Complete five daily practices.', ru: 'Выполните пять ежедневных тренировок.', ga: 'Críochnaigh cúig chleachtadh laethúla.' },
    test: (s) => s.dailyDone >= 5,
  },
  {
    id: 'combo-20',
    icon: 'combo',
    title: { en: 'In the flow', ru: 'В потоке', ga: 'Sa sruth' },
    description: { en: 'Hit a 20-note combo in Falling Notes.', ru: 'Соберите комбо из 20 нот в Falling Notes.', ga: 'Buail teaglaim 20 nóta in Nótaí ag Titim.' },
    test: (s) => s.gameBestCombo >= 20,
  },
  {
    id: 'clean-run',
    icon: 'diamond',
    title: { en: 'Clean run', ru: 'Без единой ошибки', ga: 'Rith glan' },
    description: { en: 'Play a whole tune without a wrong note.', ru: 'Сыграйте мелодию целиком без единой неверной ноты.', ga: 'Seinn fonn iomlán gan nóta mícheart.' },
    test: (s) => s.cleanRuns >= 1,
  },
  {
    id: 'quick-fingers',
    icon: 'hare',
    title: { en: 'Quick fingers', ru: 'Быстрые пальцы', ga: 'Méara tapa' },
    description: { en: 'Play a whole tune at 120% speed or faster.', ru: 'Сыграйте мелодию целиком на скорости 120% или быстрее.', ga: 'Seinn fonn iomlán ar 120% luais nó níos tapúla.' },
    test: (s) => s.fastTunes >= 1,
  },
  {
    id: 'tune-master',
    icon: 'medal',
    title: { en: 'Session ready', ru: 'Готов к сейшену', ga: 'Réidh don seisiún' },
    description: { en: 'Master a tune at full speed.', ru: 'Выучите мелодию на полной скорости.', ga: 'Máistrigh fonn ar lánluas.' },
    test: (s) => s.tunesMastered >= 1,
  },
  {
    id: 'repertoire',
    icon: 'scores',
    title: { en: 'Repertoire', ru: 'Репертуар', ga: 'Stór fonn' },
    description: { en: 'Play 10 different tunes from start to finish.', ru: 'Сыграйте 10 разных мелодий от начала до конца.', ga: 'Seinn 10 bhfonn éagsúla ó thús go deireadh.' },
    test: (s) => s.tunesPlayed >= REPERTOIRE,
  },
  {
    id: 'duet',
    icon: 'duet',
    title: { en: 'Duet', ru: 'Дуэт', ga: 'Díséad' },
    description: { en: 'Play your part of a duet from start to finish.', ru: 'Сыграйте свою партию дуэта от начала до конца.', ga: 'Seinn do pháirt i ndíséad ó thús go deireadh.' },
    test: (s) => s.duetsPlayed >= 1,
  },
  {
    id: 'composer',
    icon: 'composer',
    title: { en: 'Composer', ru: 'Композитор', ga: 'Cumadóir' },
    description: { en: 'Edit a tune.', ru: 'Отредактируйте мелодию.', ga: 'Cuir fonn in eagar.' },
    test: (s) => s.editedTunes >= 1,
  },
  {
    id: 'collector',
    icon: 'collection',
    title: { en: 'Collector', ru: 'Коллекционер', ga: 'Bailitheoir' },
    description: { en: 'Add your own tune.', ru: 'Добавьте свою мелодию.', ga: 'Cuir do phort féin leis.' },
    test: (s) => s.importedTunes >= 1,
  },
]

export const newlyUnlocked = (snapshot: ProgressSnapshot, unlocked: Record<string, number>): Achievement[] =>
  ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.test(snapshot))
