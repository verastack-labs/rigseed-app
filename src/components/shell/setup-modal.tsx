import { Button } from '@/components/ui/button'
import { ACCENTS, type AccentKey, type Mode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useThemeStore, type Layout } from '@/state/theme-store'

const MODES: { key: Mode; title: string; hint: string }[] = [
  { key: 'dark', title: 'Dark', hint: 'Default. Warm charcoal surfaces.' },
  { key: 'light', title: 'Light', hint: 'Paper white with soft tint.' },
]

const LAYOUTS: { key: Layout; title: string; hint: string; ribbon?: boolean }[] = [
  { key: 'easy', title: 'Easy', hint: 'Big cards, plain language, few numbers.', ribbon: true },
  { key: 'grid', title: 'Grid', hint: 'Balanced cards with progress and speeds.' },
  { key: 'list', title: 'List', hint: 'Dense rows for large libraries.' },
]

/**
 * The first-run setup card.
 *
 * Every choice applies immediately to the app behind the scrim and to the card
 * itself. That is the point of it: you are not previewing the theme, you are
 * already using it.
 *
 * Both buttons persist whatever is currently selected. Skip is not a cancel,
 * because there is nothing to cancel; the choices already took effect.
 */
export function SetupModal() {
  const { mode, accent, defaultLayout, onboardingCompleted } = useThemeStore()
  const { setMode, setAccent, setDefaultLayout, completeOnboarding } = useThemeStore()

  if (onboardingCompleted) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{ background: 'var(--scrim-modal)', backdropFilter: 'blur(6px)' }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up your look"
        className={cn(
          'bg-surface border-line flex w-[720px] max-w-full flex-col gap-6 overflow-hidden',
          'rounded-[18px] border px-8 pt-[30px] pb-6 shadow-[var(--shadow-modal)]',
        )}
      >
        <header className="flex flex-col gap-2">
          <span className="text-accent text-[10.5px] font-bold tracking-[0.08em] uppercase">
            First run
          </span>
          <h1 className="text-text text-[23px] font-bold">Set up your look</h1>
          <p className="text-text-dim text-[13px] leading-[1.55]">
            Pick a mode, a theme colour and a default view. Everything updates live behind this
            window, and you can change it any time from the palette button in the top bar.
          </p>
        </header>

        <section className="flex flex-col gap-2.5">
          <span className="text-text-dimmer text-[10px] font-bold tracking-[0.08em] uppercase">
            Mode
          </span>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={mode === m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-[13px] text-left',
                  'transition-colors duration-quick',
                  mode === m.key ? 'bg-accent-soft border-accent' : 'bg-surface2 border-line',
                )}
              >
                <span
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold"
                  style={
                    m.key === 'dark'
                      ? { background: '#1B1D20', color: '#E9E8E6' }
                      : { background: '#F3F3F1', color: '#232527' }
                  }
                >
                  Aa
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-text text-[13.5px] font-semibold">{m.title}</span>
                  <span className="text-text-dim text-[11.5px]">{m.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <span className="text-text-dimmer text-[10px] font-bold tracking-[0.08em] uppercase">
            Theme colour
          </span>
          <div role="radiogroup" aria-label="Theme colour" className="grid grid-cols-8 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                type="button"
                role="radio"
                aria-checked={accent === a.key}
                onClick={() => setAccent(a.key as AccentKey)}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  data-mode={mode}
                  data-accent={a.key}
                  className="size-6 rounded-full transition-shadow duration-quick"
                  style={{
                    background: 'var(--accent)',
                    boxShadow:
                      accent === a.key
                        ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)'
                        : undefined,
                  }}
                />
                <span
                  className={cn(
                    'text-center text-[10.5px] font-semibold',
                    accent === a.key ? 'text-accent' : 'text-text-dim',
                  )}
                >
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <span className="text-text-dimmer text-[10px] font-bold tracking-[0.08em] uppercase">
            Default view
          </span>
          <div className="grid grid-cols-3 gap-3">
            {LAYOUTS.map((l) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={defaultLayout === l.key}
                onClick={() => setDefaultLayout(l.key)}
                className={cn(
                  'relative flex flex-col gap-1 overflow-hidden rounded-xl border-[1.5px] px-3.5 py-[13px] text-left',
                  'transition-colors duration-quick',
                  defaultLayout === l.key
                    ? 'bg-accent-soft border-accent'
                    : 'bg-surface2 border-line',
                )}
              >
                {l.ribbon ? (
                  <span
                    aria-hidden="true"
                    className="bg-accent text-accent-on absolute top-[17px] -right-[52px] w-[164px] rotate-45 text-center text-[8.5px] leading-[1.35] font-extrabold tracking-[0.09em] uppercase"
                  >
                    New to
                    <br />
                    torrents
                  </span>
                ) : null}
                <span className="text-text text-[13px] font-semibold">{l.title}</span>
                <span className="text-text-dim max-w-[9rem] text-[11.5px]">{l.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <footer className="flex items-center gap-3">
          <span className="text-text-dim text-[11.5px]">
            You can change all of this later in Settings.
          </span>
          <span className="flex-1" />
          <Button variant="ghost" className="whitespace-nowrap" onClick={completeOnboarding}>
            Skip
          </Button>
          <Button variant="primary" className="whitespace-nowrap" onClick={completeOnboarding}>
            Start using rigseed
          </Button>
        </footer>
      </div>
    </div>
  )
}
