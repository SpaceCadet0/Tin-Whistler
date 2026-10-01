import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useT } from '../i18n'
import { Button, ButtonLink } from '../ui/primitives'

interface Props {
  children: ReactNode
  fallback: (reset: () => void) => ReactNode
}

/** Catches render errors so one broken screen never blanks the whole app. Give it a `key` (e.g. the route) to clear the error on navigation. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    return this.state.error ? this.props.fallback(this.reset) : this.props.children
  }
}

/** In-shell fallback: navigation keeps working, the user can retry or go home. */
export function ScreenError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT()
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">{t('error.title')}</h1>
      <p className="text-ink-soft">{t('error.body')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button icon="repeat" onClick={onRetry}>
          {t('error.retry')}
        </Button>
        <ButtonLink to="/" variant="secondary" icon="home">
          {t('error.home')}
        </ButtonLink>
      </div>
    </div>
  )
}

/** Last-resort fallback outside the router and stores, so it cannot fail itself. */
export function AppCrash() {
  return (
    <div role="alert" style={{ maxWidth: 420, margin: '20vh auto', padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong · Что-то пошло не так</h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>Reload the page to continue. · Перезагрузите страницу.</p>
      <button type="button" onClick={() => location.reload()} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid currentColor', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
        Reload · Перезагрузить
      </button>
    </div>
  )
}
