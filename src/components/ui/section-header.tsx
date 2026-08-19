import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * The 10px uppercase label that opens a group.
 *
 * This is the system's primary structuring device. Sections are separated by a
 * label and whitespace rather than by divider rules.
 */
export function SectionHeader({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-text-dimmer shrink-0 font-sans text-[10px] font-bold tracking-[0.08em] uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
