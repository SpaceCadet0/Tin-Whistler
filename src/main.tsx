import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppCrash, ErrorBoundary } from './app/ErrorBoundary'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={() => <AppCrash />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
