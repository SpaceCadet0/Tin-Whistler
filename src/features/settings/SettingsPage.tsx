import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import { toast } from '../../lib/toast'
import { parseBackup } from '../../lib/validate'
import { WHISTLE_KEYS } from '../../music/whistles'
import { useProgress } from '../../state/progress'
import { localTuneRepository } from '../../state/tunes'
import { useSettings, type Language, type MotionPref, type PlayerLevel, type ThemePref } from '../../state/settings'
import { Icon } from '../../ui/Icon'
import { Button, buttonClass, Card, Modal, PageHeader, Segmented, Slider } from '../../ui/primitives'

const MAX_BACKUP_BYTES = 5_000_000

export default function SettingsPage() {
  const { t } = useT()
  const s = useSettings()
  const resetProgress = useProgress((x) => x.resetAll)
  const [confirm, setConfirm] = useState(false)

  const exportData = async () => {
    const tunes = await localTuneRepository.list().catch(() => [])
    const data = { settings: localStorage.getItem('tw.settings'), progress: localStorage.getItem('tw.progress'), tunes, exportedAt: new Date().toISOString() }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'tin-whistler-progress.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  const importData = async (file: File) => {
    // validate before touching storage: a wrong file must not replace good progress
    const backup = file.size <= MAX_BACKUP_BYTES ? parseBackup(await file.text().catch(() => '')) : null
    if (!backup) {
      toast({ kind: 'error', title: t('settings.importInvalid') })
      return
    }
    try {
      // tunes are merged by id: an imported tune replaces its older copy, the rest stay
      for (const tune of backup.tunes ?? []) await localTuneRepository.save(tune)
      if (backup.progress) localStorage.setItem('tw.progress', backup.progress)
      if (backup.settings) localStorage.setItem('tw.settings', backup.settings)
      location.reload()
    } catch {
      toast({ kind: 'error', title: t('settings.importFailed') })
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={t('settings.title')} />
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-5">
          <h2 className="font-display text-xl font-semibold">{t('settings.general')}</h2>
          <Row label={t('settings.language')}>
            <Segmented<Language> label={t('settings.language')} value={s.language} onChange={(v) => s.set({ language: v })} options={[
                { value: 'en', label: 'English' },
                { value: 'ru', label: 'Русский' },
                {
                  value: 'ga',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clover" size={18} />
                      Gaeilge
                    </span>
                  ),
                },
              ]}
            />
          </Row>
          <Row label={t('settings.theme')}>
            <Segmented<ThemePref>
              label={t('settings.theme')}
              value={s.theme}
              onChange={(v) => s.set({ theme: v })}
              options={[
                { value: 'system', label: t('settings.system') },
                { value: 'light', label: t('settings.light') },
                { value: 'dark', label: t('settings.dark') },
              ]}
            />
          </Row>
          <Row label={t('settings.motion')}>
            <Segmented<MotionPref>
              label={t('settings.motion')}
              value={s.motion}
              onChange={(v) => s.set({ motion: v })}
              options={[
                { value: 'system', label: t('settings.system') },
                { value: 'reduce', label: t('settings.reduce') },
                { value: 'full', label: t('settings.full') },
              ]}
            />
          </Row>
          <Row label={t('settings.level')}>
            <Segmented<PlayerLevel>
              size="sm"
              label={t('settings.level')}
              value={s.level}
              onChange={(v) => s.set({ level: v })}
              options={[
                { value: 'beginner', label: t('onb.level.beginner') },
                { value: 'some', label: t('onb.level.some') },
                { value: 'returning', label: t('onb.level.returning') },
              ]}
            />
          </Row>
          <Row label={t('settings.goal')}>
            <Segmented<number> label={t('settings.goal')} value={s.dailyGoalMin} onChange={(v) => s.set({ dailyGoalMin: v })} options={[5, 10, 20].map((m) => ({ value: m, label: `${m} ${t('common.min')}` }))} />
          </Row>
        </Card>

        <Card className="flex flex-col gap-5">
          <h2 className="font-display text-xl font-semibold">{t('settings.audio')}</h2>
          <Row label={t('settings.whistle')}>
            <select value={s.whistleId} onChange={(e) => s.set({ whistleId: e.target.value })} className="h-11 rounded-xl border border-line bg-surface px-3">
              {WHISTLE_KEYS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </Row>
          <p className="-mt-3 text-sm text-ink-soft">{t('settings.whistleHint')}</p>
          <Slider label={t('settings.volume')} value={Math.round(s.volume * 100)} min={0} max={100} onChange={(v) => s.set({ volume: v / 100 })} format={(v) => `${v}%`} />
          <Slider label="A4" value={s.a4} min={430} max={450} onChange={(v) => s.set({ a4: v })} format={(v) => `${v} Hz`} />
          <Slider
            label={t('settings.sensitivity')}
            value={Math.round(s.sensitivity * 100)}
            min={0}
            max={100}
            onChange={(v) => s.set({ sensitivity: v / 100 })}
            format={(v) => (v < 35 ? t('settings.noisy') : v > 65 ? t('settings.quiet') : t('settings.normal'))}
          />
          <Slider label={t('settings.latency')} value={s.latencyMs} min={0} max={250} step={5} onChange={(v) => s.set({ latencyMs: v })} format={(v) => `${v} ms`} />
          <p className="-mt-3 text-sm text-ink-soft">{t('settings.latencyHint')}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink-soft">
              {t('tuner.offset')}: {s.offsetCents > 0 ? '+' : ''}
              {s.offsetCents} {t('tuner.cents')}
            </span>
            <Link to="/practice/tuner" className="text-sm font-semibold text-moss hover:underline">
              {t('tuner.calibrate')} →
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold">{t('settings.data')}</h2>
          <p className="text-sm text-ink-soft">{t('settings.dataHint')}</p>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button variant="secondary" icon="download" onClick={exportData}>
              {t('settings.export')}
            </Button>
            <label className={buttonClass('secondary', 'md', 'cursor-pointer')}>
              <Icon name="upload" size={20} />
              {t('settings.import')}
              <input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            </label>
            <Button variant="ghost" onClick={() => s.set({ onboarded: false })}>
              {t('settings.replayOnboarding')}
            </Button>
            <Button variant="danger" icon="trash" onClick={() => setConfirm(true)}>
              {t('settings.reset')}
            </Button>
          </div>
        </Card>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title={t('settings.reset')}>
        <p className="mb-6 text-ink-soft">{t('settings.resetBody')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetProgress()
              setConfirm(false)
              toast({ kind: 'info', title: t('settings.resetDone') })
            }}
          >
            {t('settings.reset')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 font-medium">{label}</span>
      <div className="flex min-w-0 [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
    </div>
  )
}
