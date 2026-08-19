import { cn } from '@/lib/utils'

export interface SkeletonProps {
  /** Number of placeholder rows. */
  rows?: number
  /** Match the height of the real row this stands in for. */
  rowHeight?: number
  className?: string
}

/**
 * Loading placeholder.
 *
 * Rows are the same height as the real rows they replace, so content does not
 * jump when it arrives. Later rows fade out, because a wall of identical bars
 * reads as content rather than as absence.
 *
 * There are no spinners anywhere in rigseed except the Search run button.
 */
export function Skeleton({ rows = 5, rowHeight = 40, className }: SkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="bg-surface2 motion-safe:animate-pulse rounded-md"
          style={{ height: rowHeight, opacity: Math.max(0.25, 1 - i * 0.15) }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}
