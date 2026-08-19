import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface RailItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  /** Whether the rail is showing labels. The icon slot never moves. */
  expanded?: boolean
  onClick?: () => void
  className?: string
}

/**
 * One destination in the nav rail.
 *
 * The icon sits in a fixed 24px slot and the label fades rather than
 * unmounting, so expanding the rail never shifts the icons sideways.
 *
 * `title` is always present, which is what makes the collapsed rail usable.
 * The label is hidden with opacity rather than removed, so it stays in the
 * accessible name either way.
 */
export function RailItem({ icon, label, active, expanded, onClick, className }: RailItemProps) {
  return (
    <button
      type="button"
      title={label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'flex h-10 w-full items-center gap-[11px] overflow-hidden rounded-xl border-none px-2 text-left',
        'transition-colors duration-quick',
        active ? 'bg-accent-soft text-accent' : 'text-text-dim bg-transparent hover:bg-surface2 hover:text-text',
        className,
      )}
    >
      <span className="flex w-6 shrink-0 justify-center">{icon}</span>
      <span
        className={cn(
          'font-sans text-[12.5px] font-semibold whitespace-nowrap',
          'transition-opacity duration-fast',
          expanded ? 'opacity-100' : 'opacity-0',
        )}
      >
        {label}
      </span>
    </button>
  )
}
