import { App } from '@capacitor/app'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { isNativeApp } from '../lib/platform'
import { Button, Modal } from '../ui/primitives'

/** Screens the app starts on: going back from them leaves the app, so it asks first. */
const ROOTS = ['/', '/welcome']

/**
 * The Android back button and back swipe: an open dialog closes, any other screen goes back the
 * way the user came (or home, when opened straight from a link), and only on the home screen does
 * back offer to leave the app.
 */
export function BackButton() {
  const { t } = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [asking, setAsking] = useState(false)
  const pathRef = useRef(pathname)
  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!isNativeApp()) return
    const listener = App.addListener('backButton', () => {
      const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')
      if (dialog) {
        dialog.close()
        return
      }
      if (ROOTS.includes(pathRef.current)) {
        setAsking(true)
        return
      }
      // the data router numbers its history entries: 0 is where the app was opened
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (idx > 0) navigate(-1)
      else navigate('/', { replace: true })
    })
    return () => {
      void listener.then((l) => l.remove())
    }
  }, [navigate])

  return (
    <Modal open={asking} onClose={() => setAsking(false)} title={t('app.exitTitle')}>
      <p className="mb-5 text-ink-soft">{t('app.exitText')}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" icon="x" onClick={() => void App.exitApp()}>
          {t('app.exit')}
        </Button>
        <Button variant="secondary" onClick={() => setAsking(false)}>
          {t('app.stay')}
        </Button>
      </div>
    </Modal>
  )
}
