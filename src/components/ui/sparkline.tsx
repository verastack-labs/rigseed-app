import { cn } from '@/lib/utils'

export interface SparklineProps {
  /** Download samples, oldest first. The panel keeps a 60 sample window. */
  data: readonly number[]
  /** Optional upload series, drawn in accent2 over the same scale. */
  upload?: readonly number[]
  height?: number
  tone?: 'accent' | 'accent2'
  fill?: boolean
  gridlines?: boolean
  className?: string
}

const W = 100
const H = 100

function toPath(values: readonly number[], max: number): string {
  return values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * W
      // 0.92 keeps the peak off the top edge so the line never clips.
      const y = H - (v / max) * H * 0.92
      return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

/**
 * 60 sample speed history. The only graphic surface in the app.
 *
 * Two details are deliberate. The viewBox is a fixed 100 by 100 stretched with
 * `preserveAspectRatio="none"`, so the path never has to be recomputed on
 * resize. That stretch would also distort the stroke, which is why every
 * stroked element sets `vector-effect="non-scaling-stroke"`.
 *
 * Download and upload share one scale, taken from the maximum across both
 * series. Scaling them independently would make a trickle of upload look like
 * a match for a saturated download.
 */
export function Sparkline({
  data,
  upload,
  height = 46,
  tone = 'accent',
  fill = true,
  gridlines,
  className,
}: SparklineProps) {
  const series = data.length ? data : [0]
  const combined = upload?.length ? [...series, ...upload] : series
  const max = Math.max(1, ...combined)
  const stroke = tone === 'accent2' ? 'var(--accent2)' : 'var(--accent)'
  const line = toPath(series, max)

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block size-full"
        aria-hidden="true"
      >
        {gridlines
          ? [33, 66].map((y) => (
              <line
                key={y}
                x1="0"
                x2={W}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            ))
          : null}
        {fill ? <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={stroke} opacity="0.16" /> : null}
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {upload?.length ? (
          <path
            d={toPath(upload, max)}
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="1.8"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
    </div>
  )
}
