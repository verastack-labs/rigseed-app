import { cn } from '@/lib/utils'

export type StatusTone = 'accent' | 'accent2' | 'warn' | 'danger' | 'muted'

export interface StatusDotProps {
  tone?: StatusTone
  /** The word beside the dot. Never ship the dot alone. */
  label: string
  pulse?: boolean
  mono?: boolean
  className?: string
}

const DOT: Record<StatusTone, string> = {
  accent: 'bg-accent',
  accent2: 'bg-accent2',
  warn: 'bg-warn',
  danger: 'bg-danger',
  muted: 'bg-text-dimmer',
}

const TEXT: Record<StatusTone, string> = {
  accent: 'text-accent',
  accent2: 'text-accent2',
  warn: 'text-warn',
  danger: 'text-danger',
  muted: 'text-text-dim',
}

/**
 * Coloured dot plus its word.
 *
 * `label` is required by design, not by convenience: state is never encoded by
 * colour alone anywhere in rigseed.
 */
export function StatusDot({ tone = 'muted', label, pulse, mono, className }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-[7px]', className)}>
      <span
        aria-hidden="true"
        className={cn('size-[7px] shrink-0 rounded-full', DOT[tone], pulse && 'animate-pulse')}
      />
      <span className={cn('text-[11.5px] font-semibold', mono ? 'font-mono' : 'font-sans', TEXT[tone])}>
        {label}
      </span>
    </span>
  )
}
