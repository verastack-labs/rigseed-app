import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SettingRowProps {
  label: string
  /** One line on what it does. Not a restatement of the label. */
  hint?: string
  /** The control. A switch, an input, a segmented group. */
  children: ReactNode
  /** Marks a row holding an unapplied edit. */
  dirty?: boolean
  /**
   * Dims the label and hint for a row whose control is switched off elsewhere.
   *
   * Disabling the control alone was not enough. A greyed input under a label
   * and hint at full strength reads as a field that ought to work and does
   * not, rather than as one waiting on the switch above it. This dims the
   * words too, so the whole row recedes together.
   *
   * Presentation only. The control keeps its own `disabled`, which is what
   * actually stops input and what assistive technology reads.
   */
  inactive?: boolean
  className?: string
}

/**
 * One preference: what it is on the left, the control on the right.
 *
 * The hint is not optional decoration. Half of these keys are named after
 * libtorrent internals, and "Pre-allocate disk space" means nothing to
 * somebody who has not lost a download to a full disk. A row with no hint is
 * a row whose label already says everything.
 *
 * A dirty row is marked with a dot rather than a colour change. The section
 * nav marks dirty sections the same way, so the two agree, and a person
 * scanning a long page can find what they touched without reading it.
 */
export function SettingRow({ label, hint, children, dirty, inactive, className }: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 border-t border-line px-[18px] py-3.5 first:border-t-0',
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-[12.5px] font-semibold transition-colors duration-fast',
              inactive ? 'text-text-dimmer' : 'text-text',
            )}
          >
            {label}
          </span>
          {dirty ? (
            <span
              aria-label="changed, not yet applied"
              title="Changed, not yet applied"
              className="size-[6px] shrink-0 rounded-full bg-accent"
            />
          ) : null}
        </span>
        {hint ? (
          <span
            className={cn(
              'text-[11.5px] leading-[1.5] transition-colors duration-fast',
              inactive ? 'text-text-dimmer' : 'text-text-dim',
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">{children}</span>
    </div>
  )
}
