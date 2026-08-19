import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders the surface2 header strip. */
  title?: string
  /** The API endpoint this card exercises, shown in mono on the right. */
  api?: string
  action?: ReactNode
  padded?: boolean
  /** Raises the border to the accent on hover. Used by torrent cards. */
  hoverable?: boolean
}

/**
 * Surface container.
 *
 * Depth comes from layering surfaces, not from elevation: no shadow at rest.
 * Shadows are reserved for things that genuinely float.
 */
export function Card({
  title,
  api,
  action,
  padded = true,
  hoverable,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border-line shrink-0 overflow-hidden rounded-2xl border',
        'transition-colors duration-quick',
        hoverable && 'hover:border-accent',
        className,
      )}
      {...props}
    >
      {title ? (
        <div className="bg-surface2 border-line flex items-center gap-2.5 border-b px-[18px] py-[13px]">
          <span className="text-text text-[12.5px] font-semibold">{title}</span>
          <span className="flex-1" />
          {api ? <span className="text-text-dimmer font-mono text-[10.5px]">{api}</span> : null}
          {action}
        </div>
      ) : null}
      <div className={padded ? 'p-[18px]' : undefined}>{children}</div>
    </div>
  )
}
