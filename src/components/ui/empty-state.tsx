import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  /** Explain the mechanism, not the feeling. Never "Nothing here yet". */
  body?: string
  /** One action at most. Empty states offer a way out, not a menu. */
  action?: ReactNode
  tone?: 'accent' | 'warn'
  className?: string
}

/**
 * Every nothing-here view.
 *
 * The copy rule matters more than the layout: an empty state explains the
 * mechanism rather than the feeling. "Searching needs at least one plugin.
 * Each plugin is a Python file that teaches the client how to query one site."
 */
export function EmptyState({ icon, title, body, action, tone = 'accent', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-10 text-center',
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            'bg-surface2 flex size-[46px] items-center justify-center rounded-3xl',
            tone === 'warn' ? 'text-warn' : 'text-text-dimmer',
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="text-text text-[15px] font-semibold">{title}</span>
        {body ? (
          <p className="text-text-dim max-w-[380px] text-[12.5px] leading-[1.55]">{body}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
