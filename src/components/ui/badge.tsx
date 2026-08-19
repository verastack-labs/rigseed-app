import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/** Small mono count or status word. */
const badgeVariants = cva('inline-flex items-center rounded-sm border px-1.5 py-0.5 font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-surface2 text-text-dim border-line',
      accent: 'bg-accent-soft text-accent border-accent',
      accent2: 'bg-accent2-soft text-accent2 border-accent2',
      warn: 'bg-warn-soft text-warn border-warn',
      danger: 'bg-danger-soft text-danger border-danger',
    },
    mono: {
      true: 'font-mono text-[10px]',
      false: 'font-sans text-[10px]',
    },
  },
  defaultVariants: { tone: 'neutral', mono: true },
})

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, mono, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, mono }), className)} {...props}>
      {children}
    </span>
  )
}

export { badgeVariants }
