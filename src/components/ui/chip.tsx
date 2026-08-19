import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface ChipProps {
  label: string
  /** Shows a colour dot, used for tags and search engines. */
  dot?: boolean
  icon?: ReactNode
  count?: number
  selected?: boolean
  /** Dashed border, used for the "New" affordance. */
  dashed?: boolean
  /** The item's own colour. A selected chip tints with it rather than the accent. */
  color?: string
  onClick?: () => void
  className?: string
}

/** Pill filter chip: engines, categories, tags. */
export function Chip({
  label,
  dot,
  icon,
  count,
  selected,
  dashed,
  color,
  onClick,
  className,
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected ?? false}
      onClick={onClick}
      className={cn(
        'bg-surface2 rounded-chip inline-flex items-center gap-[7px] border px-[11px] py-1.5',
        'font-sans text-[12px] font-semibold whitespace-nowrap',
        'transition-[background-color,border-color,color] duration-quick',
        selected ? 'bg-accent-soft border-accent text-accent' : 'border-line text-text-dim',
        !selected && 'hover:border-accent',
        dashed ? 'border-dashed' : 'border-solid',
        className,
      )}
      style={
        color && selected
          ? {
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              borderColor: color,
              color,
            }
          : undefined
      }
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="size-[7px] shrink-0 rounded-full"
          style={{ background: color ?? 'var(--accent)' }}
        />
      ) : null}
      {icon}
      {label}
      {count != null ? <span className="font-mono text-[10.5px] opacity-80">{count}</span> : null}
    </button>
  )
}
