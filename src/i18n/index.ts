import { useCallback } from 'react'
import type { LocalizedText } from '../music/types'
import { useSettings, type Language } from '../state/settings'
import { en, type MessageKey } from './en'
import { ga } from './ga'
import { ru } from './ru'

const DICTS: Record<Language, Record<MessageKey, string>> = { en, ru, ga }

export type { MessageKey }
export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string

export function translate(lang: Language, key: MessageKey, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** Translation hook: `const { t, L, lang } = useT()`. */
export function useT() {
  const lang = useSettings((s) => s.language)
  const t = useCallback<TFunction>((key, vars) => translate(lang, key, vars), [lang])
  const L = useCallback((text: LocalizedText | undefined) => (text ? text[lang] ?? text.en : ''), [lang])
  return { t, L, lang }
}

const SECTION_WORDS: Record<string, LocalizedText> = {
  section: { en: 'Section', ru: 'Секция', ga: 'Cuid' },
  part: { en: 'Part', ru: 'Часть', ga: 'Páirt' },
  line: { en: 'Line', ru: 'Строка', ga: 'Líne' },
}
const SECTION_FIXED: Record<string, LocalizedText> = {
  closing: { en: 'Closing', ru: 'Концовка', ga: 'Críoch' },
  'whole tune': { en: 'Whole tune', ru: 'Целиком', ga: 'An fonn ar fad' },
  verse: { en: 'Verse', ru: 'Куплет', ga: 'Véarsa' },
  chorus: { en: 'Chorus', ru: 'Припев', ga: 'Curfá' },
  refrain: { en: 'Refrain', ru: 'Рефрен', ga: 'Loinneog' },
  melody: { en: 'Melody', ru: 'Мелодия', ga: 'Séis' },
  theme: { en: 'Theme', ru: 'Тема', ga: 'Téama' },
  variation: { en: 'Variation', ru: 'Вариация', ga: 'Athrúchán' },
  opening: { en: 'Opening', ru: 'Начало', ga: 'Tús' },
  answer: { en: 'Answer', ru: 'Ответ', ga: 'Freagra' },
  minuet: { en: 'Minuet', ru: 'Менуэт', ga: 'Mionuéid' },
  'fa la la': { en: 'Fa la la', ru: 'Фа-ла-ла', ga: 'Fa la la' },
  'good tidings': { en: 'Good tidings', ru: 'Добрые вести', ga: 'Dea-scéala' },
}

/** Localise generic section names ("Section 2", "A part", "Closing"); user-written names pass through. */
export function sectionName(name: string, lang: Language): string {
  const fixed = SECTION_FIXED[name.toLowerCase()]
  if (fixed) return fixed[lang]
  let m = /^(section|part|line)\s+(\w+)$/i.exec(name)
  if (m) return `${SECTION_WORDS[m[1].toLowerCase()][lang]} ${m[2]}`
  m = /^(\w)\s+part$/i.exec(name)
  if (m) return lang === 'en' ? name : `${SECTION_WORDS.part[lang]} ${m[1]}`
  return name
}
