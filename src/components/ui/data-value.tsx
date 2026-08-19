import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * A mono value.
 *
 * Trivial on its own, and the point of it: it is what enforces the Inter and
 * mono split, which is the rule most likely to be broken. Sizes, speeds,
 * ratios, percentages, hashes, IPs and API paths go through this. Sentences
 * and labels do not.
 *
 * `tabular-nums` is not decorative either. These values sit in columns and in
 * live-updating rows, and proportional digits make them jitter on every poll.
 */
const dataValueVariants = cva('font-mono whitespace-nowrap tabular-nums', {
  variants: {
    size: {
      xs: 'text-[10.5px]',
      sm: 'text-[11px]',
      md: 'text-[12.5px]',
      lg: 'text-[17px] font-semibold',
      xl: 'text-[20px] font-semibold',
      hero: 'text-[40px] font-bold',
    },
    tone: {
      default: 'text-text',
      dim: 'text-text-dim',
      dimmer: 'text-text-dimmer',
      accent: 'text-accent',
      accent2: 'text-accent2',
      warn: 'text-warn',
      danger: 'text-danger',
    },
  },
  defaultVariants: { size: 'sm', tone: 'default' },
})

export interface DataValueProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof dataValueVariants> {}

export function DataValue({ className, size, tone, children, ...props }: DataValueProps) {
  return (
    <span className={cn(dataValueVariants({ size, tone }), className)} {...props}>
      {children}
    </span>
  )
}

export { dataValueVariants }
