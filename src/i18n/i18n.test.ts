import { describe, expect, it } from 'vitest'
import { en } from './en'
import { ga } from './ga'
import { sectionName, translate } from './index'

describe('Irish', () => {
  it('has every message, none left empty', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(ga[key].trim(), key).not.toBe('')
  })

  it('fills in placeholders like the other languages', () => {
    expect(translate('ga', 'home.level', { n: 3 })).toBe('Leibhéal 3')
  })

  it('names generic sections in Irish and leaves the user’s own names alone', () => {
    expect(sectionName('Section 2', 'ga')).toBe('Cuid 2')
    expect(sectionName('B part', 'ga')).toBe('Páirt B')
    expect(sectionName('Chorus', 'ga')).toBe('Curfá')
    expect(sectionName('My bridge', 'ga')).toBe('My bridge')
  })
})
