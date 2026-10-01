import { useCallback } from 'react'
import type { LocalizedText } from '../music/types'
import { useSettings, type Language } from '../state/settings'
import { en, type MessageKey } from './en'
import { ru } from './ru'

const DICTS: Record<Language, Record<MessageKey, string>> = { en, ru }

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

const SECTION_WORDS: Record<string, { en: string; ru: string }> = {
  section: { en: 'Section', ru: 'Секция' },
  part: { en: 'Part', ru: 'Часть' },
  line: { en: 'Line', ru: 'Строка' },
}
const SECTION_FIXED: Record<string, { en: string; ru: string }> = {
  closing: { en: 'Closing', ru: 'Концовка' },
  'whole tune': { en: 'Whole tune', ru: 'Целиком' },
  verse: { en: 'Verse', ru: 'Куплет' },
  chorus: { en: 'Chorus', ru: 'Припев' },
  refrain: { en: 'Refrain', ru: 'Рефрен' },
  melody: { en: 'Melody', ru: 'Мелодия' },
  theme: { en: 'Theme', ru: 'Тема' },
  variation: { en: 'Variation', ru: 'Вариация' },
  opening: { en: 'Opening', ru: 'Начало' },
  answer: { en: 'Answer', ru: 'Ответ' },
  minuet: { en: 'Minuet', ru: 'Менуэт' },
  'fa la la': { en: 'Fa la la', ru: 'Фа-ла-ла' },
  'good tidings': { en: 'Good tidings', ru: 'Добрые вести' },
}

/** Localise generic section names ("Section 2", "A part", "Closing"); user-written names pass through. */
export function sectionName(name: string, lang: Language): string {
  const fixed = SECTION_FIXED[name.toLowerCase()]
  if (fixed) return fixed[lang]
  let m = /^(section|part|line)\s+(\w+)$/i.exec(name)
  if (m) return `${SECTION_WORDS[m[1].toLowerCase()][lang]} ${m[2]}`
  m = /^(\w)\s+part$/i.exec(name)
  if (m) return lang === 'ru' ? `Часть ${m[1]}` : name
  return name
}
