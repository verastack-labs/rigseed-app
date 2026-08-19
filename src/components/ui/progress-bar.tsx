import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  /** 0 to 100. Clamped. */
  value: number
  height?: number
  tone?: 'accent' | 'accent2'
  /** Paused and stalled are never accent coloured. */
  paused?: boolean
  showValue?: boolean
  /** Renders the remainder in accent-soft, for the search swarm health bar. */
  split?: boolean
  /** Accessible name, for example the torrent title. */
  label?: string
  className?: string
}

/**
 * Track and fill.
 *
 * The width transition is load bearing. `sync/maindata` arrives about once a
 * second, and without it a download reads as a series of jumps rather than as
 * continuous progress.
 */
export function ProgressBar({
  value,
  height = 6,
  tone = 'accent',
  paused,
  showValue,
  split,
  label,
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  const bar = (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="bg-surface2 flex flex-1 overflow-hidden"
      style={{ height, borderRadius: Math.max(2, height / 2) }}
    >
      <div
        className={cn(
          'transition-[width,background-color] duration-base',
          paused ? 'bg-text-dimmer' : tone === 'accent2' ? 'bg-accent2' : 'bg-accent',
        )}
        style={{ width: `${pct}%` }}
      />
      {split ? <div className="bg-accent-soft" style={{ width: `${100 - pct}%` }} /> : null}
    </div>
  )

  if (!showValue) return <div className={cn('flex', className)}>{bar}</div>

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {bar}
      <span
        className={cn(
          'min-w-[34px] text-right font-mono text-[11px] font-medium tabular-nums',
          paused ? 'text-text-dimmer' : 'text-text-dim',
        )}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}
