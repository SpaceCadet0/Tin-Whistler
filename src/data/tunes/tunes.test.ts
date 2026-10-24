import { describe, expect, it } from 'vitest'
import { sectionNotes } from '../../music/tune'
import { getWhistle, whistleLabel } from '../../music/whistles'
import { BUILTIN_TUNES } from '.'
import { auldLangSyne, butterfly, cooleysReel, saints, scarboroughFair } from './abcTunes'
import { drunkenSailor, greensleeves, joyToTheWorld, POPULAR_TUNES, silentNight, twinkle } from './popularTunes'
import { FOLK_SONGS } from './folkSongs'
import { blackthornStick, JIGS, morrisonsJig, oldJohns } from './jigs'
import { AIRS_AND_MARCHES, charlieHesMyDarling, lochLomond } from './airsAndMarches'
import { musicalPriest, SESSION_TUNES, siegeOfEnnis, tamLin, windThatShakesTheBarley } from './sessionTunes'
import { thePrayer } from './thePrayer'

const labels = (t: typeof saints, n: number) =>
  t.sections.flatMap(sectionNotes).filter((x) => x.pitch != null).slice(0, n).map((x) => whistleLabel(x.pitch!))

describe('ABC-defined built-in tunes', () => {
  it('cover difficulties 1 to 5', () => {
    expect([saints, auldLangSyne, scarboroughFair, cooleysReel, butterfly].map((t) => t.difficulty)).toEqual([1, 2, 3, 4, 5])
  })

  it('read in the right octave, without transposing', () => {
    expect(labels(saints, 5)).toEqual(['D', 'F#', 'G', 'A', 'D'])
    expect(labels(auldLangSyne, 6)).toEqual(['D', 'G', 'F#', 'G', 'B', 'A'])
    expect(labels(scarboroughFair, 4)).toEqual(['E', 'E', 'B', 'B'])
    expect(labels(cooleysReel, 4)).toEqual(['E', 'B', 'B', 'A'])
    expect(labels(butterfly, 4)).toEqual(['B', 'E', 'G', 'E'])
  })

  it('keep every bar the right length', () => {
    for (const t of [auldLangSyne, cooleysReel, butterfly]) {
      for (const s of t.sections) {
        const total = sectionNotes(s).reduce((a, n) => a + n.beats, 0)
        // a part may borrow up to one beat for a pickup (e.g. Cooley's A part ends a beat short)
        const rem = total % t.beatsPerBar!
        expect(rem <= 1 || rem >= t.beatsPerBar! - 1).toBe(true)
      }
    }
  })

  it('carry ornaments and compound-time settings', () => {
    expect(cooleysReel.sections[1].phrases.flat().filter((n) => n.ornament?.type === 'roll')).toHaveLength(4)
    expect(butterfly).toMatchObject({ meter: '9/8', pulse: 1.5, beatsPerBar: 4.5, type: 'slip-jig' })
    expect(butterfly.sections).toHaveLength(3)
    expect([saints, auldLangSyne, scarboroughFair].map((t) => t.type)).toEqual(['hymn', 'song', 'song'])
    expect(cooleysReel.type).toBe('reel')
  })

  it('are unique and ordered by difficulty', () => {
    const ids = BUILTIN_TUNES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(BUILTIN_TUNES).toHaveLength(77)
    const levels = BUILTIN_TUNES.map((t) => t.difficulty)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })
})

describe('Popular public-domain tunes', () => {
  it('adds twenty playable tunes inside the D whistle range', () => {
    expect(POPULAR_TUNES).toHaveLength(20)
    for (const t of POPULAR_TUNES) {
      const pitches = t.sections.flatMap(sectionNotes).flatMap((n) => (n.pitch == null ? [] : [n.pitch]))
      expect(pitches.length, t.id).toBeGreaterThan(20)
      expect(Math.min(...pitches), t.id).toBeGreaterThanOrEqual(74)
      expect(Math.max(...pitches), t.id).toBeLessThanOrEqual(95)
      expect(t.description?.en && t.description.ru, t.id).toBeTruthy()
    }
  })

  it('keeps the melodies as written', () => {
    expect(labels(twinkle, 6)).toEqual(['D', 'D', 'A', 'A', 'B', 'B'])
    expect(labels(joyToTheWorld, 8)).toEqual(["D'", 'C#', 'B', 'A', 'G', 'F#', 'E', 'D'])
    expect(labels(silentNight, 4)).toEqual(['A', 'B', 'A', 'F#'])
    expect(labels(greensleeves, 4)).toEqual(['A', 'C', "D'", "E'"])
    expect(labels(drunkenSailor, 8)).toEqual(['B', 'B', 'B', 'B', 'B', 'B', 'B', 'E'])
  })
})

describe('The Prayer (transcribed from video)', () => {
  const notes = thePrayer.sections.flatMap(sectionNotes)

  it('follows the tab in four sections', () => {
    expect(thePrayer.sections).toHaveLength(4)
    expect(labels(thePrayer, 8)).toEqual(['E', 'E', 'B', 'B', 'A', 'A', 'G', 'G'])
    expect(notes.filter((n) => n.pitch != null)).toHaveLength(64 + 55 + 41 + 21)
  })

  it('keeps the performance timing (1 beat = 1 s at 60 bpm)', () => {
    const total = notes.reduce((a, n) => a + n.beats, 0)
    // first note at 4.39 s, last one fades at ~148.7 s in the recording
    expect(total).toBeGreaterThan(143)
    expect(total).toBeLessThan(146)
    expect(thePrayer.bpm).toBe(60)
  })

  it('marks cuts and slides with their ringed holes', () => {
    const slides = notes.filter((n) => n.ornament?.type === 'slide')
    expect(slides.length).toBe(11)
    expect(slides.every((n) => n.ornament?.hole)).toBe(true)
  })
})

describe('Folk songs from ABC with whistle extras', () => {
  it('keep every bar whole and stay inside the whistle range', () => {
    // The Rocky Road to Dublin has one 12/8 bar in its 9/8 chorus, as it is sung
    const irregular = new Set(['rocky-road-to-dublin'])
    for (const t of FOLK_SONGS) {
      const notes = t.sections.flatMap(sectionNotes)
      const total = notes.reduce((a, n) => a + n.beats, 0)
      if (!irregular.has(t.id)) expect(total % t.beatsPerBar!, t.id).toBe(0)
      const base = getWhistle(t.whistle).baseMidi
      const pitches = notes.flatMap((n) => (n.pitch == null ? [] : [n.pitch]))
      expect(Math.min(...pitches) - base, t.id).toBeGreaterThanOrEqual(0)
      expect(Math.max(...pitches) - base, t.id).toBeLessThanOrEqual(23)
    }
  })

  it('carry breath marks, ornaments and the C whistle setting', () => {
    for (const t of FOLK_SONGS) expect(t.sections.reduce((n, s) => n + s.phrases.length, 0), t.id).toBeGreaterThan(2)
    const dannyBoy = FOLK_SONGS.find((t) => t.id === 'danny-boy')!
    expect(dannyBoy.sections.flatMap(sectionNotes).filter((n) => n.ornament?.type === 'slide').length).toBeGreaterThan(3)
    expect(FOLK_SONGS.find((t) => t.id === 'bella-ciao')).toMatchObject({ whistle: 'C', key: 'Amin' })
  })
})

describe('Session tunes, airs and marches from reference/abc', () => {
  const tunes = [...SESSION_TUNES, ...AIRS_AND_MARCHES]

  it('adds twenty-three described tunes inside the whistle range', () => {
    expect(tunes).toHaveLength(23)
    for (const t of tunes) {
      const pitches = t.sections.flatMap(sectionNotes).flatMap((n) => (n.pitch == null ? [] : [n.pitch]))
      const base = getWhistle(t.whistle).baseMidi
      expect(Math.min(...pitches) - base, t.id).toBeGreaterThanOrEqual(0)
      expect(Math.max(...pitches) - base, t.id).toBeLessThanOrEqual(23)
      expect(t.description?.en && t.description.ru, t.id).toBeTruthy()
    }
  })

  it('keep the written key where a whistle plays it, on the whistle that suits it', () => {
    expect(tamLin).toMatchObject({ whistle: 'D', key: 'Bmin' })
    expect(charlieHesMyDarling).toMatchObject({ whistle: 'C', key: 'Dmin' })
    expect(lochLomond).toMatchObject({ whistle: 'D', key: 'Gmaj' })
    expect(labels(lochLomond, 4)).toEqual(['D', 'E', 'G', 'G'])
  })

  it('keep the bars whole, allowing a pickup', () => {
    // Korobeiniki's coda and the anthem's verse have bars of their own, as transcribed
    const irregular = new Set(['korobeiniki', 'amhran-na-bhfiann'])
    for (const t of tunes.filter((x) => !irregular.has(x.id))) {
      for (const s of t.sections) {
        const rem = sectionNotes(s).reduce((a, n) => a + n.beats, 0) % t.beatsPerBar!
        expect(rem <= 1 || rem >= t.beatsPerBar! - 1, `${t.id} ${s.name}`).toBe(true)
      }
    }
  })

  it('read the melodies, pickups and ornaments as written', () => {
    expect(labels(musicalPriest, 5)).toEqual(['E', 'F#', 'B', 'B', 'A'])
    expect(musicalPriest.sections).toHaveLength(3)
    expect(labels(siegeOfEnnis, 4)).toEqual(['A', 'B', 'A', 'G'])
    expect(windThatShakesTheBarley.sections.flatMap(sectionNotes).filter((n) => n.ornament?.type === 'bounce')).toHaveLength(4)
  })
})

describe('Jigs written out from the MIDI files in reference/abc', () => {
  it('add eight jigs in 6/8 with whole bars inside the whistle range', () => {
    expect(JIGS).toHaveLength(8)
    for (const t of JIGS) {
      expect(t, t.id).toMatchObject({ type: 'jig', meter: '6/8', whistle: 'D' })
      const notes = t.sections.flatMap(sectionNotes)
      expect(notes.reduce((a, n) => a + n.beats, 0) % t.beatsPerBar!, t.id).toBe(0)
      const pitches = notes.flatMap((n) => (n.pitch == null ? [] : [n.pitch - 74]))
      expect(Math.min(...pitches), t.id).toBeGreaterThanOrEqual(0)
      expect(Math.max(...pitches), t.id).toBeLessThanOrEqual(23)
      expect(t.description?.en && t.description.ru, t.id).toBeTruthy()
    }
  })

  it('keep the keys of the settings', () => {
    expect(JIGS.map((t) => t.key)).toEqual(['Gmaj', 'Gmaj', 'Dmix', 'Ador', 'Dmaj', 'Edor', 'Dmix', 'Ador'])
    expect(labels(morrisonsJig, 4)).toEqual(['E', 'B', 'E', 'B'])
    expect(labels(oldJohns, 3)).toEqual(["E'", "D'", 'C'])
    expect(blackthornStick.sections).toHaveLength(1)
  })

  it('carry rolls, cuts, taps and slides on a modest share of the notes', () => {
    for (const t of JIGS) {
      const notes = t.sections.flatMap(sectionNotes).filter((n) => n.pitch != null)
      const share = notes.filter((n) => n.ornament).length / notes.length
      expect(share, t.id).toBeGreaterThan(0.02)
      expect(share, t.id).toBeLessThan(0.2)
    }
    const types = new Set(JIGS.flatMap((t) => t.sections.flatMap(sectionNotes)).map((n) => n.ornament?.type))
    expect([...types]).toEqual(expect.arrayContaining(['roll', 'cut', 'bounce', 'slide']))
  })
})
