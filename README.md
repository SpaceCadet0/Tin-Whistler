# Tin Whistler

An interactive tin whistle (Irish whistle) trainer: a structured course, microphone pitch feedback, a tuner, trainers and games, real tunes learned section by section, and a progress system. Runs fully in the browser, and progress stays on the device.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest: pitch detection, scoring, notation, tab recognition
npm run build      # typecheck + production bundle
```

The microphone needs a secure context: `localhost` or HTTPS.

## Features

- **Onboarding**: what the whistle is, how to hold it, fingers and breath, then level, daily goal and microphone. You can skip straight to the tunes.
- **Course**: 4 levels and 19 lessons (first notes → real tunes → second octave → ornaments). Each lesson has one goal and is made of small steps: explanation, fingering, note, long tone, listening, rhythm, sequence, melody and free play.
- **Interactive whistle**: tap holes to cover them (covered, half-holed or open), hear the note, see the next fingering and which fingers to move.
- **Pitch detection**: YIN in a Web Worker fed by an AudioWorklet. It uses an adaptive noise gate, confirms pitch jumps across frames (so octave glitches don't count), and filters out cuts and taps. Calibration covers A4 and the whistle's own tuning offset.
- **Trainers**: Play the Note (adaptive), Sequences (length grows with success), Ear Training, Rhythm (perfect, early, late or missed per beat), Tuner, Falling Notes game, and Free Practice (metronome, pitch graph, recorder).
- **Tunes**: 7 built-in tunes, including *Shepard's Flute* with ornaments, articulation, a second whistle part and rubato timing taken from the reference video. Seven learning steps take you from Listen to Play on your own.
- **Player**: a big "now / next" stage you can read from a music stand; sections, loop, tempo, count-in, metronome, guide melody on/off, second voice. Tap the stage or press **Space** to play again from the marker.
- **Scoring**: Notes, Rhythm, Timing and Overall scores; lists wrong notes, where you lost your place and which phrases to repeat (with one-click looping).
- **Import**: ABC notation (thesession.org), MIDI (track choice, top-note reduction, quantisation, transposition to fit the whistle, auto-sections), **sheet music as SVG** (read exactly from the vector file) and **tab images** (dot-style tabs recognised in the browser). The visual editor has a text mode, undo, and Space / a second tap on the selected note to play from the marker.
- **Progress**: XP and levels, streak, achievements, per-note mastery, tune progress, a practice calendar, a 10-minute Daily Practice, and Smart Practice ("you often miss G → 60 seconds of G").
- **UI**: EN/RU, light and dark themes, reduced motion, keyboard shortcuts, screen-reader labels, and states that never rely on colour alone.

## Architecture

```
src/
  music/        pure music model: types, pitch math, fingering chart (any whistle key),
                whistle notes, scales, tab-text notation, tune flattening/sectioning, ornaments, editing ops
  audio/        AudioEngine (context), WhistleSynth (voice + ornaments), Metronome, TunePlayer
                (look-ahead scheduler), MicInput (worklet → worker), PitchTracker, Recorder
    pitch/      yin.ts (detector), pitch.worker.ts, captureWorklet.ts, stabilizer.ts
  engine/       application logic, UI-free
    scoring/    note matching, hold tracker, segmenter, performance & rhythm scoring
    lesson/     lesson/exercise types, course progression
    progress/   XP curve, streaks, achievements
    adaptive/   smart practice, adaptive difficulty
    daily.ts    daily plan
  import/       ABC parser, MIDI import, sheet-music SVG reader (notationSvg + svgPath), tab-image recognition (+ worker), whistle-range fitting
  data/         lessons (course.ts) and built-in tunes: data only, no UI
  state/        zustand stores: settings, progress (persisted), tune library (IndexedDB repository)
  i18n/         typed dictionaries (en is the source of truth; ru must cover every key)
  ui/           design system primitives, icons, whistle visuals (WhistleView, FingeringColumn, TabView), feedback widgets
  features/     screens: onboarding, home, learn, exercises, practice, daily, tunes (+ editor), progress, settings
  hooks/        usePitch, usePlayer, useNoteHold, useHotkeys, …
```

- **Storage boundary**: `lib/storage.ts` (key/value adapter for the stores) and `state/tunes.ts → TuneRepository`. Swap these for an API to add accounts and sync; no component changes.
- **New whistle keys**: fingerings are stored as offsets from the tonic, so a new entry in `WHISTLE_KEYS` is enough.

### Adding a lesson

Append an object to `LESSONS` in `src/data/lessons/course.ts`. Each exercise is typed (`info`, `fingering`, `note`, `pitch`, `listening`, `rhythm`, `sequence`, `melody`, `free-play`). `ExerciseRunner` renders any of them, so adding a lesson needs no UI work.

### Adding a tune

Built-in tunes use a compact tab notation (`src/music/tabText.ts`):

```
t:D*0.5 -:E^C4*0.25 | r:A+! -:C[h00000]
```

| Token | Meaning |
|---|---|
| `t:` | tongue |
| `r:` | "ru" |
| `-:` | slur |
| `+` | second octave |
| `!` | sharp stop ("i") |
| `^C4` | cut with a ring on hole 4 (`B` bounce, `S` slide, `R` roll; `~3` sets the slide span) |
| `[h00000]` | explicit fingering (`1` covered, `0` open, `h` half) |
| `*0.5` | length in beats |
| `\|` | new phrase |
| `/` | new line |

Users can also import ABC, MIDI or images, or build a tune in the editor.

## Notes and limitations

- Sheet music is read from **SVG exports** (MuseScore: File → Export → SVG, one file per page). Photos and PDFs of printed music aren't recognised directly: open them in MuseScore or Audiveris first, then export SVG. Tempo text isn't read, so set the BPM after importing.

- *Shepard's Flute* is Bill Brown's Lineage II theme, transcribed from the tab screenshots in `reference/` (tab by Hound4Sound). It is bundled for personal practice. Remove it before distributing the app.
- Tab-image recognition targets dot-style whistle tabs. On the reference screenshots it gets pitch classes ≥ 97% right. The "+" octave marks are less reliable on photographic backgrounds, and bracketed second voices are imported as extra phrases. Fix these in the editor.
- Ornaments are displayed, synthesised and taught, but not graded. Cuts and taps are too short to judge reliably from a phone microphone, so scoring ignores them on purpose.
