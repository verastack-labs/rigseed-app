import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface IconTileProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** Square edge in px. Radius is derived at 28 percent of it. */
  size?: number
  /** Any CSS colour. Overrides `tone`, used for category colours. */
  color?: string
  tone?: 'accent' | 'accent2' | 'warn'
  children?: ReactNode
}

const TONE = {
  accent: 'var(--accent)',
  accent2: 'var(--accent2)',
  warn: 'var(--warn)',
} as const

/**
 * The rounded tinted square behind a feature icon.
 *
 * It fronts modal headers, category rows and empty states. One component
 * rather than a pattern to re-inline, because it appears on every screen.
 */
export function IconTile({
  size = 32,
  color,
  tone = 'accent',
  className,
  style,
  children,
  ...props
}: IconTileProps) {
  const c = color ?? TONE[tone]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: `color-mix(in srgb, ${c} 18%, transparent)`,
        color: c,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  )
}
