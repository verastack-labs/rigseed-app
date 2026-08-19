import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface FilterRowProps {
  label: string
  icon?: ReactNode
  /** A colour, for tag rows. Replaces the icon rather than joining it. */
  dot?: string
  count?: number
  active?: boolean
  onClick?: () => void
  className?: string
}

/**
 * One line in the Transfers sidebar: a status, a category or a tag.
 *
 * The label truncates rather than wrapping, because the sidebar is a fixed
 * 236px and a two-line row would break the rhythm of the list.
 */
export function FilterRow({
  label,
  icon,
  dot,
  count,
  active,
  onClick,
  className,
}: FilterRowProps) {
  return (
    <button
      type="button"
      aria-pressed={active ?? false}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md border-none px-[9px] py-2 text-left',
        'transition-colors duration-quick',
        active ? 'bg-accent-soft' : 'bg-transparent hover:bg-surface2',
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="ml-[3px] size-[9px] shrink-0 rounded-full"
          style={{ background: dot }}
        />
      ) : (
        <span className={cn('flex shrink-0', active ? 'text-accent' : 'text-text-dim')}>{icon}</span>
      )}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[12.5px]',
          active ? 'text-accent font-semibold' : 'text-text font-medium',
        )}
      >
        {label}
      </span>
      {count != null ? (
        <span className="text-text-dimmer font-mono text-[10.5px] tabular-nums">{count}</span>
      ) : null}
    </button>
  )
}
