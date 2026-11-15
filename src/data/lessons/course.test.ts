import { describe, expect, it } from 'vitest'
import { noteById } from '../../music/whistles'
import { builtinTune } from '../tunes'
import { COURSE_LEVELS, LESSONS } from './course'

describe('course', () => {
  it('gives every lesson a unique id, an existing level and existing prerequisites', () => {
    const ids = LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    const levels = new Set(COURSE_LEVELS.map((c) => c.id))
    for (const l of LESSONS) {
      expect(levels.has(l.level), l.id).toBe(true)
      for (const p of l.prerequisites) expect(ids.includes(p), `${l.id} → ${p}`).toBe(true)
    }
  })

  it('has lessons in every level', () => {
    for (const c of COURSE_LEVELS) expect(LESSONS.some((l) => l.level === c.id), `level ${c.id}`).toBe(true)
  })

  it('only points at tunes and sections that exist', () => {
    for (const l of LESSONS) {
      if (l.melody) expect(builtinTune(l.melody), `${l.id} melody ${l.melody}`).toBeDefined()
      for (const e of l.exercises) {
        if (e.type !== 'melody') continue
        const tune = builtinTune(e.tuneId)
        expect(tune, `${l.id}/${e.id} → ${e.tuneId}`).toBeDefined()
        for (const s of e.sections ?? []) expect(s < tune!.sections.length, `${l.id}/${e.id} section ${s}`).toBe(true)
      }
    }
  })

  it('only uses notes the whistle has', () => {
    const known = (id: string, where: string) => expect(noteById(id), `${where}: ${id}`).toBeDefined()
    for (const l of LESSONS) {
      l.notes.forEach((n) => known(n, l.id))
      for (const e of l.exercises) {
        const where = `${l.id}/${e.id}`
        if (e.type === 'note' || e.type === 'pitch' || e.type === 'fingering' || e.type === 'rhythm') known(e.note, where)
        if (e.type === 'info' && e.note) known(e.note, where)
        if (e.type === 'sequence') e.notes.forEach((n) => known(n, where))
        if (e.type === 'listening') e.choices.forEach((n) => known(n, where))
        if (e.type === 'free-play') e.demo?.notes.forEach((n) => known(n, where))
      }
    }
  })

  it('keeps rhythm patterns to whole bars of four clicks', () => {
    for (const l of LESSONS) {
      for (const e of l.exercises) {
        if (e.type !== 'rhythm') continue
        const beats = e.pattern.reduce<number>((a, b) => a + Math.abs(b ?? 1), 0)
        expect(Math.abs(beats - Math.round(beats)) < 1e-9, `${l.id}/${e.id}: ${beats} beats`).toBe(true)
      }
    }
  })

  it('writes every text in all three languages', () => {
    const texts = LESSONS.flatMap((l) => [l.title, l.description, ...l.objectives, ...l.exercises.flatMap((e) => [e.title, e.instruction, 'body' in e ? e.body : undefined, 'prompt' in e ? e.prompt : undefined])])
    for (const t of texts) {
      if (!t) continue
      expect(t.en && t.ru && t.ga, JSON.stringify(t)).toBeTruthy()
    }
  })
})
