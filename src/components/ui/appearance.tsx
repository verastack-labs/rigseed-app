import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ACCENTS, type AccentKey, type Mode } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** 2.4 seconds, per the app shell spec. */
const AUTO_COLLAPSE_MS = 2400

export interface AppearanceProps {
  mode: Mode
  accent: AccentKey
  onModeChange: (next: Mode) => void
  onAccentChange: (next: AccentKey) => void
  /** Reopens the first-run setup modal. */
  onSetup?: () => void
  className?: string
}

/**
 * The top bar appearance control.
 *
 * Everything is hidden until the palette button is used. The panel expands to
 * the left, and auto-collapses 2.4s after the pointer leaves.
 *
 * The timing rule is specific and worth stating: the countdown starts on
 * pointer leave, not on open. Hovering anywhere inside cancels it for as long
 * as the pointer stays. If the control was opened without the pointer ever
 * being inside, which is what happens on a keyboard activation, the countdown
 * starts immediately.
 */
export function Appearance({
  mode,
  accent,
  onModeChange,
  onAccentChange,
  onSetup,
  className,
}: AppearanceProps) {
  const [open, setOpen] = useState(false)
  const [pointerInside, setPointerInside] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (!open || pointerInside) return
    timer.current = setTimeout(() => setOpen(false), AUTO_COLLAPSE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [open, pointerInside])

  return (
    <div
      className={cn('flex items-center justify-end', className)}
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) setOpen(false)
      }}
    >
      <div
        className={cn(
          'ease-panel-reveal flex items-center gap-2.5 overflow-hidden',
          'transition-[max-width,opacity] duration-panel',
          open ? 'max-w-[340px] opacity-100' : 'max-w-0 opacity-0',
        )}
      >
        {onSetup ? (
          <Button size="sm" onClick={onSetup}>
            Setup&hellip;
          </Button>
        ) : null}

        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Theme colour">
          {ACCENTS.map((a) => {
            const selected = a.key === accent
            return (
              <button
                key={a.key}
                type="button"
                role="radio"
                aria-checked={selected}
                title={a.label}
                aria-label={a.label}
                tabIndex={open ? (selected ? 0 : -1) : -1}
                onClick={() => onAccentChange(a.key)}
                data-mode={mode}
                data-accent={a.key}
                className={cn(
                  'size-[18px] shrink-0 rounded-full border-none',
                  'transition-shadow duration-quick',
                )}
                style={{
                  background: 'var(--accent)',
                  boxShadow: selected
                    ? '0 0 0 2px var(--sidebar-bg), 0 0 0 4px var(--accent)'
                    : undefined,
                }}
              />
            )
          })}
        </div>

        <SegmentedControl
          size="sm"
          label="Mode"
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          value={mode}
          onChange={(next) => onModeChange(next as Mode)}
        />
      </div>

      <button
        type="button"
        title="Appearance"
        aria-label="Appearance"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'ml-2.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border',
          'transition-colors duration-quick',
          open
            ? 'bg-accent-soft border-accent text-accent'
            : 'bg-surface2 border-line text-text-dim hover:text-accent',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[15px]"
          aria-hidden="true"
        >
          <circle cx="13.5" cy="6.5" r=".5" />
          <circle cx="17.5" cy="10.5" r=".5" />
          <circle cx="8.5" cy="7.5" r=".5" />
          <circle cx="6.5" cy="12.5" r=".5" />
          <path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10Z" />
        </svg>
      </button>
    </div>
  )
}
