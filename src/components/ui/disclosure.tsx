import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { SectionHeader } from '@/components/ui/section-header'
import { cn } from '@/lib/utils'

export interface DisclosureProps {
  title: string
  /** Shown beside the title, usually how many rows are inside. */
  count?: number
  /** Open on first render. Sections worth reading start open. */
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

/**
 * A titled section that folds away.
 *
 * The header is the whole control rather than the chevron alone, because a
 * 12px glyph is a target people miss and the title is already the thing they
 * are aiming at.
 *
 * State is local and deliberately not persisted. A filter sidebar's shape is
 * a momentary preference, and restoring a collapsed Categories section a week
 * later reads as categories having disappeared.
 */
export function Disclosure({
  title,
  count,
  defaultOpen = true,
  children,
  className,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-[9px] pb-1 text-left transition-colors duration-quick hover:text-accent"
      >
        <ChevronDown
          className={cn(
            'size-3 shrink-0 text-text-dimmer transition-transform duration-quick',
            !open && '-rotate-90',
          )}
          strokeWidth={2.5}
        />
        <SectionHeader>{title}</SectionHeader>
        {count !== undefined ? (
          <span className="font-mono text-[10px] text-text-dimmer tabular-nums">{count}</span>
        ) : null}
      </button>

      {open ? <div className="flex flex-col gap-1">{children}</div> : null}
    </div>
  )
}
