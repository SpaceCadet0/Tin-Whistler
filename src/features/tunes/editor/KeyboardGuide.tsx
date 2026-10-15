import { Fragment } from 'react'
import { useT, type MessageKey } from '../../../i18n'
import { ALT_KEY, MOD_KEY } from '../../../lib/platform'
import { Button, Modal } from '../../../ui/primitives'
import { Kbd } from '../../../ui/Shortcuts'

/** A row: keys pressed together (joined by "+") or alternatives listed side by side. */
interface Row {
  keys: string[]
  combo?: boolean
  label: MessageKey
}

interface Group {
  title: MessageKey
  rows: Row[]
}

/** Keyboard cheat sheet for the tab editor (web only: the Android app has no keyboard). */
export function KeyboardGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const groups: Group[] = [
    {
      title: 'guide.notes',
      rows: [
        { keys: ['D', 'E', 'F', 'G', 'A', 'B', 'C'], label: 'guide.note' },
        { keys: ['Shift', t('guide.letter')], combo: true, label: 'guide.upper' },
        { keys: ['N'], label: 'guide.natural' },
        { keys: ['Z'], label: 'guide.rest' },
      ],
    },
    {
      title: 'guide.length',
      rows: [
        { keys: ['1', '2', '3', '4'], label: 'guide.beats' },
        { keys: ['[', ']'], label: 'guide.halveDouble' },
        { keys: ['.'], label: 'guide.dotted' },
      ],
    },
    {
      title: 'guide.articulation',
      rows: [
        { keys: ['T'], label: 'art.tongue' },
        { keys: ['R'], label: 'art.ru' },
        { keys: ['-'], label: 'art.slur' },
        { keys: ['I'], label: 'art.stop' },
      ],
    },
    {
      title: 'guide.ornaments',
      rows: [
        { keys: [ALT_KEY, 'C'], combo: true, label: 'orn.cut' },
        { keys: [ALT_KEY, 'B'], combo: true, label: 'orn.bounce' },
        { keys: [ALT_KEY, 'S'], combo: true, label: 'orn.slide' },
        { keys: [ALT_KEY, 'R'], combo: true, label: 'orn.roll' },
        { keys: [ALT_KEY, 'T'], combo: true, label: 'orn.trill' },
        { keys: [ALT_KEY, '1…6'], combo: true, label: 'guide.ring' },
      ],
    },
    {
      title: 'guide.editing',
      rows: [
        { keys: ['←', '→'], label: 'guide.move' },
        { keys: ['Shift', '← →'], combo: true, label: 'guide.selectSeveral' },
        { keys: ['Shift', t('guide.click')], combo: true, label: 'guide.selectSeveral' },
        { keys: ['Enter'], label: 'guide.insert' },
        { keys: ['Del'], label: 'guide.delete' },
        { keys: [MOD_KEY, 'C X V'], combo: true, label: 'guide.clipboard' },
        { keys: [MOD_KEY, 'Z'], combo: true, label: 'sc.undo' },
        { keys: [MOD_KEY, 'Shift', 'Z'], combo: true, label: 'sc.redo' },
        { keys: [t('guide.space')], label: 'sc.editorPlay' },
        { keys: ['Esc'], label: 'sc.stop' },
      ],
    },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('guide.title')} wide>
      <p className="mb-1 text-sm text-ink-soft">{t('guide.intro')}</p>
      <p className="mb-5 text-sm text-ink-soft">{t('guide.applies')}</p>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title} className={g.title === 'guide.editing' ? 'sm:col-span-2' : undefined}>
            <h3 className="mb-2 text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">{t(g.title)}</h3>
            <dl className={g.title === 'guide.editing' ? 'grid gap-x-8 gap-y-1.5 sm:grid-cols-2' : 'grid gap-y-1.5'}>
              {g.rows.map((r) => (
                <div key={r.keys.join() + r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <dt className="flex shrink-0 items-center gap-1">
                    {r.keys.map((k, i) => (
                      <Fragment key={k}>
                        {r.combo && i > 0 && <span className="text-xs text-ink-faint">+</span>}
                        <Kbd>{k}</Kbd>
                      </Fragment>
                    ))}
                  </dt>
                  <dd className="text-ink-soft">{t(r.label)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="mt-5 text-xs text-ink-faint">{t('guide.mouse')}</p>
      <div className="mt-5 flex justify-end">
        <Button onClick={onClose} icon="check">
          {t('guide.ok')}
        </Button>
      </div>
    </Modal>
  )
}
