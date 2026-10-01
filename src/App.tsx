import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { audioEngine } from './audio/AudioEngine'
import { whistleSynth } from './audio/WhistleSynth'
import { useSettings } from './state/settings'
import { useTuneLibrary } from './state/tunes'
import { MotionProvider } from './ui/motion'

const Onboarding = lazy(() => import('./features/onboarding/Onboarding'))
const Home = lazy(() => import('./features/home/Home'))
const Learn = lazy(() => import('./features/learn/Learn'))
const LessonPlayer = lazy(() => import('./features/learn/LessonPlayer'))
const PracticeHub = lazy(() => import('./features/practice/PracticeHub'))
const NoteTrainer = lazy(() => import('./features/practice/NoteTrainer'))
const TunerPage = lazy(() => import('./features/practice/TunerPage'))
const EarTraining = lazy(() => import('./features/practice/EarTraining'))
const RhythmTrainer = lazy(() => import('./features/practice/RhythmTrainer'))
const SequenceTrainer = lazy(() => import('./features/practice/SequenceTrainer'))
const FallingNotes = lazy(() => import('./features/practice/FallingNotes'))
const FreePractice = lazy(() => import('./features/practice/FreePractice'))
const WhistleExplorer = lazy(() => import('./features/practice/WhistleExplorer'))
const DailyPractice = lazy(() => import('./features/daily/DailyPractice'))
const TuneLibrary = lazy(() => import('./features/tunes/TuneLibrary'))
const TuneDetail = lazy(() => import('./features/tunes/TuneDetail'))
const TunePlayerPage = lazy(() => import('./features/tunes/TunePlayerPage'))
const TuneImport = lazy(() => import('./features/tunes/TuneImport'))
const TuneEditor = lazy(() => import('./features/tunes/TuneEditor'))
const ProgressPage = lazy(() => import('./features/progress/ProgressPage'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))

function Loading() {
  return <div className="grid min-h-[40vh] place-items-center text-ink-faint" aria-busy="true" />
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const onboarded = useSettings((s) => s.onboarded)
  return onboarded ? <>{children}</> : <Navigate to="/welcome" replace />
}

export default function App() {
  const { a4, whistleId, volume } = useSettings()
  const loadTunes = useTuneLibrary((s) => s.load)

  useEffect(() => {
    void loadTunes()
  }, [loadTunes])

  useEffect(() => {
    whistleSynth.settings = { a4, whistleId }
  }, [a4, whistleId])

  useEffect(() => {
    audioEngine.setVolume(volume)
  }, [volume])

  return (
    <MotionProvider>
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/welcome" element={<Onboarding />} />
            <Route path="/" element={<RequireOnboarding><Home /></RequireOnboarding>} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:lessonId" element={<LessonPlayer />} />
            <Route path="/practice" element={<PracticeHub />} />
            <Route path="/practice/notes" element={<NoteTrainer />} />
            <Route path="/practice/tuner" element={<TunerPage />} />
            <Route path="/practice/ear" element={<EarTraining />} />
            <Route path="/practice/rhythm" element={<RhythmTrainer />} />
            <Route path="/practice/sequence" element={<SequenceTrainer />} />
            <Route path="/practice/game" element={<FallingNotes />} />
            <Route path="/practice/free" element={<FreePractice />} />
            <Route path="/practice/whistle" element={<WhistleExplorer />} />
            <Route path="/daily" element={<DailyPractice />} />
            <Route path="/tunes" element={<TuneLibrary />} />
            <Route path="/tunes/import" element={<TuneImport />} />
            <Route path="/tunes/:tuneId" element={<TuneDetail />} />
            <Route path="/tunes/:tuneId/play" element={<TunePlayerPage />} />
            <Route path="/tunes/:tuneId/edit" element={<TuneEditor />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
    </MotionProvider>
  )
}
