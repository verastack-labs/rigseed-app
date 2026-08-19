import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const valueVariants = cva('font-mono text-[17px] font-semibold tabular-nums', {
  variants: {
    tone: {
      default: 'text-text',
      accent: 'text-accent',
      accent2: 'text-accent2',
      warn: 'text-warn',
      dim: 'text-text-dim',
    },
  },
  defaultVariants: { tone: 'default' },
})

export interface StatCardProps extends VariantProps<typeof valueVariants> {
  icon?: ReactNode
  label: string
  value: ReactNode
  /** Optional line under the value, for context rather than a second number. */
  sub?: ReactNode
  className?: string
}

/** Icon and label over a mono value and a sub-line. Used in the detail stat grid. */
export function StatCard({ icon, label, value, sub, tone, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border-line flex flex-col gap-2 rounded-2xl border px-4 py-3.5',
        className,
      )}
    >
      <div className="text-text-dimmer flex items-center gap-[7px]">
        {icon}
        <span className="text-[10px] font-bold tracking-[0.08em] uppercase">{label}</span>
      </div>
      <span className={valueVariants({ tone })}>{value}</span>
      {sub ? <span className="text-text-dim text-[11px]">{sub}</span> : null}
    </div>
  )
}

export { valueVariants as statCardValueVariants }
